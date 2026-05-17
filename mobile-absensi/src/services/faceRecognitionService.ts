/**
 * src/services/faceRecognitionService.ts
 *
 * On-device face recognition pakai TensorFlow Lite (MobileFaceNet).
 *
 * Flow:
 *  - `loadModel()` once at app start (cached).
 *  - `computeEmbeddingFromUri(uri)` — load image, resize 112×112, normalize,
 *    run TFLite, return Float32Array (192-dim).
 *  - `cosineSimilarity(a, b)` — compare 2 embeddings (returns 0…1).
 *  - `enrollFace(employeeId, uri)` — compute embedding, save ke supabase + foto referensi.
 *  - `verifyFace(employeeId, uri)` — compute embedding, fetch reference, compare.
 *
 * Aman: bila model belum di-bundle / native module belum ter-build, fungsi
 * akan throw error deskriptif sehingga UI bisa tampilkan pesan jelas.
 */
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

// Module ini akan di-require ondemand untuk hindari crash saat dev-client lama.
let TfliteModule: any = null;
let ImageManipulator: any = null;
let FileSystem: any = null;

const tryLoad = () => {
  if (TfliteModule === null) {
    try {
      TfliteModule = require('react-native-fast-tflite');
    } catch {
      TfliteModule = false;
    }
  }
  if (ImageManipulator === null) {
    try {
      ImageManipulator = require('expo-image-manipulator');
    } catch {
      ImageManipulator = false;
    }
  }
  if (FileSystem === null) {
    try {
      FileSystem = require('expo-file-system');
    } catch {
      FileSystem = false;
    }
  }
};

// Konstanta MobileFaceNet (sesuaikan bila ganti model).
const MODEL_INPUT_SIZE = 112;
const MODEL_OUTPUT_DIM = 192;
const NORM_MEAN = 127.5;
const NORM_STD = 128.0;

const REFERENCE_BUCKET = 'face-references';
const DEFAULT_THRESHOLD = 0.65;

let cachedModel: any = null;

const isLikelyValidModelFile = async (fileUri: string): Promise<boolean> => {
  tryLoad();
  if (!FileSystem) return false;

  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists || typeof info.size !== 'number') {
    return false;
  }

  // MobileFaceNet asli biasanya beberapa MB. Threshold kecil ini hanya untuk
  // memastikan file placeholder/tidak lengkap tidak diproses sebagai model.
  return info.size >= 1024 * 1024;
};

/**
 * Load TFLite model dari assets. Dipanggil sekali; hasil di-cache.
 */
export async function loadModel(): Promise<any> {
  tryLoad();
  if (!TfliteModule) {
    throw new Error('react-native-fast-tflite belum tersedia. Rebuild dev-client.');
  }
  if (cachedModel) return cachedModel;

  // Bundle path lewat expo-asset agar konsisten antar platform.
  const asset = Asset.fromModule(require('../../assets/models/mobilefacenet.tflite'));
  await asset.downloadAsync();
  const localUri = asset.localUri || asset.uri;
  if (!localUri) throw new Error('Gagal memuat file model TFLite.');

  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    const valid = await isLikelyValidModelFile(localUri);
    if (!valid) {
      throw new Error(
        'File model MobileFaceNet belum tersedia atau masih placeholder. Tambahkan mobilefacenet.tflite asli ke assets/models lalu rebuild dev-client.'
      );
    }
  }

  cachedModel = await TfliteModule.loadTensorflowModel({ url: localUri });
  return cachedModel;
}

/**
 * Konversi URI image lokal → Float32Array siap input TFLite.
 * Resize ke 112×112, ekstrak RGB raw, normalize ke −1…1.
 */
async function imageToTensor(uri: string): Promise<Float32Array> {
  tryLoad();
  if (!ImageManipulator || !FileSystem) {
    throw new Error('expo-image-manipulator / expo-file-system belum tersedia.');
  }

  // Resize ke MODEL_INPUT_SIZE × MODEL_INPUT_SIZE, output PNG raw.
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }],
    { base64: true, format: ImageManipulator.SaveFormat.PNG }
  );
  if (!manipulated.base64) throw new Error('Gagal manipulate gambar.');

  // Decode PNG → raw pixel array. Karena RN tidak punya canvas built-in,
  // pakai trick: simpan ke file lalu read bytes. Sederhana: pakai
  // `react-native-fast-tflite`'s built-in image decoder bila tersedia,
  // atau fallback dengan jpeg-js / pngjs (tidak ada di RN by default).
  //
  // Solusi pragmatis: pakai `Image` element di canvas via skia, atau
  // simpan logika ini sebagai TODO. Untuk sekarang, kita pakai
  // pendekatan brute force: decode base64 PNG → pixels via jpeg-js fallback
  // **tidak tersedia di RN**.
  //
  // SARAN: instal `jpeg-js` (`npm i jpeg-js`) — ringan, pure-JS, decode
  // JPEG ke RGBA. Lalu format manipulator output sebagai JPEG.

  // Ganti ke JPEG agar bisa pakai jpeg-js.
  const jpeg = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }],
    { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
  );
  if (!jpeg.base64) throw new Error('Gagal manipulate gambar (jpeg).');

  let jpegJs: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    jpegJs = require('jpeg-js');
  } catch {
    throw new Error(
      'Paket `jpeg-js` belum terinstal. Jalankan `npm i jpeg-js` lalu rebuild.'
    );
  }

  // base64 → Uint8Array.
  const binStr = global.atob ? global.atob(jpeg.base64) : Buffer.from(jpeg.base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

  const decoded = jpegJs.decode(bytes, { useTArray: true });
  const { width, height, data } = decoded as { width: number; height: number; data: Uint8Array };
  if (width !== MODEL_INPUT_SIZE || height !== MODEL_INPUT_SIZE) {
    throw new Error(`Ukuran gambar tidak sesuai (${width}×${height}).`);
  }

  // RGBA → RGB normalized −1…1, layout NHWC.
  const tensor = new Float32Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE * 3);
  for (let i = 0, j = 0; i < data.length; i += 4) {
    tensor[j++] = (data[i] - NORM_MEAN) / NORM_STD;     // R
    tensor[j++] = (data[i + 1] - NORM_MEAN) / NORM_STD; // G
    tensor[j++] = (data[i + 2] - NORM_MEAN) / NORM_STD; // B
  }
  return tensor;
}

/**
 * Hitung embedding 192-dim dari URI gambar wajah (pre-cropped jika mungkin).
 */
export async function computeEmbeddingFromUri(uri: string): Promise<number[]> {
  const model = await loadModel();
  const input = await imageToTensor(uri);
  // react-native-fast-tflite expects array of TypedArrays per input.
  const output = await model.run([input]);
  const embedding = Array.from(output[0] as Float32Array);
  if (embedding.length !== MODEL_OUTPUT_DIM) {
    console.warn(
      `[face] embedding dim mismatch: expected ${MODEL_OUTPUT_DIM}, got ${embedding.length}`
    );
  }
  return l2Normalize(embedding);
}

function l2Normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum) || 1;
  return v.map((x) => x / norm);
}

/**
 * Cosine similarity 2 embedding L2-normalized → range −1..1 (umumnya 0..1).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// ============================================================
// Supabase persistence
// ============================================================

interface EnrollmentResult {
  embedding: number[];
  referenceUrl: string | null;
  enrolledAt: string;
}

async function uploadReferencePhoto(employeeId: string, uri: string): Promise<string | null> {
  try {
    const res = await fetch(uri);
    const buf = await res.arrayBuffer();
    const path = `${employeeId}/reference.jpg`;
    const { error } = await supabase.storage.from(REFERENCE_BUCKET).upload(path, buf, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) {
      console.warn('[face] gagal upload reference photo', error.message);
      return null;
    }
    const { data } = supabase.storage.from(REFERENCE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err: any) {
    console.warn('[face] upload reference exception', err?.message || err);
    return null;
  }
}

/**
 * Enroll wajah karyawan: hitung embedding + simpan ke DB + upload foto referensi.
 */
export async function enrollFace(employeeId: string, imageUri: string): Promise<EnrollmentResult> {
  const embedding = await computeEmbeddingFromUri(imageUri);
  const enrolledAt = new Date().toISOString();
  const referenceUrl = await uploadReferencePhoto(employeeId, imageUri);

  const update: Record<string, any> = {
    face_embedding: embedding,
    face_embedding_dim: embedding.length,
    face_enrolled_at: enrolledAt,
  };
  if (referenceUrl) update.face_reference_url = referenceUrl;

  const { error } = await supabase.from('employees').update(update).eq('id', employeeId);
  if (error) {
    if (/column|does not exist|schema cache/i.test(error.message)) {
      throw new Error(
        'Skema DB belum punya kolom face_*. Jalankan migration database-add-face-recognition.sql.'
      );
    }
    throw new Error(error.message);
  }

  return { embedding, referenceUrl, enrolledAt };
}

export interface VerifyResult {
  verified: boolean;
  similarity: number;
  threshold: number;
}

/**
 * Verifikasi wajah: hitung embedding dari foto check-in, bandingkan dengan
 * embedding referensi tersimpan. Mengembalikan similarity & status.
 */
export async function verifyFace(employeeId: string, imageUri: string): Promise<VerifyResult> {
  const { data, error } = await supabase
    .from('employees')
    .select('face_embedding, face_match_threshold')
    .eq('id', employeeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.face_embedding) {
    throw new Error('Karyawan belum enroll wajah. Buka Profil → Daftar Wajah dulu.');
  }

  const reference = data.face_embedding as number[];
  const threshold = Number(data.face_match_threshold) || DEFAULT_THRESHOLD;
  const probe = await computeEmbeddingFromUri(imageUri);
  const similarity = cosineSimilarity(reference, probe);

  return {
    verified: similarity >= threshold,
    similarity,
    threshold,
  };
}

/**
 * Cek apakah karyawan sudah enroll. Berguna untuk UI guard.
 */
export async function isEnrolled(employeeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('employees')
    .select('face_embedding')
    .eq('id', employeeId)
    .maybeSingle();
  if (error) return false;
  return !!data?.face_embedding;
}
