/**
 * src/services/avatarService.ts
 *
 * Pilih foto profil dari kamera/galeri lalu upload ke Supabase Storage
 * (bucket `avatars`) dan persist URL ke `employees.foto`.
 *
 * Tahan-banting: bila `expo-image-picker` belum tersedia (dev-client lama),
 * fungsi `pickAvatar` mengembalikan null tanpa crash.
 */
import { supabase } from '../config/supabase';

let ImagePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ImagePicker = require('expo-image-picker');
} catch {
  ImagePicker = null;
}

const BUCKET = 'avatars';

export interface PickedImage {
  uri: string;
  mimeType: string;
  fileName?: string;
}

export interface UploadResult {
  publicUrl: string;
  path: string;
}

/**
 * Pastikan izin kamera/galeri tersedia. Mengembalikan true bila granted.
 */
async function ensurePermission(source: 'camera' | 'library'): Promise<boolean> {
  if (!ImagePicker) return false;
  if (source === 'camera') {
    const cur = await ImagePicker.getCameraPermissionsAsync?.();
    if (cur?.granted) return true;
    const ask = await ImagePicker.requestCameraPermissionsAsync?.();
    return !!ask?.granted;
  }
  const cur = await ImagePicker.getMediaLibraryPermissionsAsync?.();
  if (cur?.granted) return true;
  const ask = await ImagePicker.requestMediaLibraryPermissionsAsync?.();
  return !!ask?.granted;
}

/**
 * Buka picker foto. `source='camera'` membuka kamera, default galeri.
 * Aspek 1:1, kualitas 0.7 untuk hemat bandwidth.
 */
export async function pickAvatar(source: 'camera' | 'library' = 'library'): Promise<PickedImage | null> {
  if (!ImagePicker) {
    throw new Error('expo-image-picker belum terinstal. Rebuild dev-client.');
  }
  const ok = await ensurePermission(source);
  if (!ok) {
    throw new Error(
      source === 'camera'
        ? 'Izin kamera ditolak.'
        : 'Izin galeri ditolak.'
    );
  }

  const opts = {
    mediaTypes: ImagePicker.MediaTypeOptions?.Images,
    allowsEditing: true,
    aspect: [1, 1] as [number, number],
    quality: 0.7,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);

  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;

  return {
    uri: asset.uri,
    mimeType: asset.mimeType || 'image/jpeg',
    fileName: asset.fileName || undefined,
  };
}

/** Konversi URI lokal menjadi ArrayBuffer untuk upload Supabase. */
async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('Gagal membaca file gambar.');
  return await res.arrayBuffer();
}

/**
 * Upload gambar ke bucket `avatars`. Path: `{employeeId}/{timestamp}.jpg`.
 * Mengembalikan public URL.
 */
export async function uploadAvatar(employeeId: string, image: PickedImage): Promise<UploadResult> {
  const ext = (image.mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const path = `${employeeId}/${Date.now()}.${ext}`;
  const buf = await uriToArrayBuffer(image.uri);

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: image.mimeType,
    upsert: true,
  });
  if (upErr) {
    throw new Error(
      upErr.message.toLowerCase().includes('not found')
        ? `Bucket "${BUCKET}" belum ada. Buat lewat Supabase dashboard (public).`
        : `Upload gagal: ${upErr.message}`
    );
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

/**
 * Update kolom `employees.foto` dengan URL avatar baru. Tahan schema drift
 * (foto_url / photo_url bila skema berbeda).
 */
export async function updateEmployeeAvatarUrl(employeeId: string, url: string): Promise<void> {
  const tryUpdate = async (col: 'foto' | 'foto_url' | 'photo_url') => {
    const { error } = await supabase
      .from('employees')
      .update({ [col]: url })
      .eq('id', employeeId);
    return error;
  };

  let err = await tryUpdate('foto');
  if (err && /column|does not exist|schema cache/i.test(err.message)) {
    err = await tryUpdate('foto_url');
  }
  if (err && /column|does not exist|schema cache/i.test(err.message)) {
    err = await tryUpdate('photo_url');
  }
  if (err) throw new Error(err.message);
}

/**
 * Convenience: pick → upload → update kolom employees.foto.
 * Mengembalikan public URL yang baru di-upload.
 */
export async function changeAvatar(
  employeeId: string,
  source: 'camera' | 'library' = 'library'
): Promise<string | null> {
  const picked = await pickAvatar(source);
  if (!picked) return null;
  const { publicUrl } = await uploadAvatar(employeeId, picked);
  await updateEmployeeAvatarUrl(employeeId, publicUrl);
  return publicUrl;
}
