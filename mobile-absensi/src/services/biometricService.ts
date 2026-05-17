/**
 * src/services/biometricService.ts
 *
 * Real face verification: capture selfie via ImagePicker → run on-device
 * MobileFaceNet TFLite model → compare embedding ke referensi yang
 * tersimpan saat enrollment.
 *
 * Fallback DEV: jika dependency belum tersedia (model belum di-bundle atau
 * native module belum ter-build), service akan throw error dengan pesan
 * jelas sehingga UI tidak gagal diam-diam.
 */
import { Alert } from 'react-native';
import { cosineSimilarity, computeEmbeddingFromUri, isEnrolled } from './faceRecognitionService';
import { supabase } from '../config/supabase';
import type { FaceVerificationResult } from '../types';

let ImagePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ImagePicker = require('expo-image-picker');
} catch {
  ImagePicker = null;
}

const DEFAULT_THRESHOLD = 0.65;

async function captureSelfie(): Promise<string | null> {
  if (!ImagePicker) {
    throw new Error('expo-image-picker belum tersedia. Rebuild dev-client.');
  }
  const cur = await ImagePicker.getCameraPermissionsAsync?.();
  if (!cur?.granted) {
    const ask = await ImagePicker.requestCameraPermissionsAsync?.();
    if (!ask?.granted) throw new Error('Izin kamera ditolak.');
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions?.Images,
    allowsEditing: false,
    quality: 0.8,
    cameraType: ImagePicker.CameraType?.front,
  });
  if (result.canceled) return null;
  return result.assets?.[0]?.uri ?? null;
}

export const biometricService = {
  /**
   * Capture wajah & verifikasi cocok dengan embedding referensi karyawan.
   * Memerlukan parameter `employeeId`. Bila tidak diberikan, akan throw.
   */
  async captureAndVerifyFace(employeeId?: string): Promise<FaceVerificationResult> {
    if (!employeeId) {
      throw new Error('employeeId wajib untuk verifikasi wajah.');
    }

    // Pastikan sudah enroll; jika belum, beri pesan jelas dan blokir.
    const enrolled = await isEnrolled(employeeId);
    if (!enrolled) {
      Alert.alert(
        'Wajah belum terdaftar',
        'Silakan buka tab Profil → Daftar Wajah untuk mendaftarkan wajah terlebih dahulu.'
      );
      return {
        verified: false,
        score: 0,
        details: { method: 'mobilefacenet', reason: 'not_enrolled' },
      };
    }

    const uri = await captureSelfie();
    if (!uri) {
      return {
        verified: false,
        score: 0,
        details: { method: 'mobilefacenet', reason: 'cancelled' },
      };
    }

    // Fetch referensi.
    const { data, error } = await supabase
      .from('employees')
      .select('face_embedding, face_match_threshold')
      .eq('id', employeeId)
      .maybeSingle();
    if (error || !data?.face_embedding) {
      throw new Error(error?.message || 'Embedding referensi tidak ditemukan.');
    }
    const reference = data.face_embedding as number[];
    const threshold = Number(data.face_match_threshold) || DEFAULT_THRESHOLD;

    let probe: number[];
    try {
      probe = await computeEmbeddingFromUri(uri);
    } catch (err: any) {
      throw new Error(
        err?.message ||
          'Gagal memproses gambar wajah. Pastikan model TFLite sudah di-bundle.'
      );
    }

    const score = cosineSimilarity(reference, probe);
    return {
      verified: score >= threshold,
      score: Number(score.toFixed(4)),
      details: {
        method: 'mobilefacenet',
        threshold,
      },
    };
  },

  /**
   * Verifikasi wajah dengan **liveness detection** (multi-frame).
   * Caller bertanggung jawab capture beberapa foto dengan pose berbeda
   * (mis. lewat `LivenessCaptureModal`) lalu pass URIs ke fungsi ini.
   *
   * Liveness check:
   *  - Pairwise cosine similarity antar foto harus berada di rentang
   *    [LIVENESS_MIN_PAIR, LIVENESS_MAX_PAIR].
   *  - Terlalu tinggi (>0.97) ⇒ foto statis dipakai berulang (spoof).
   *  - Terlalu rendah (<0.45) ⇒ wajah berbeda antar foto (bukan orang yang sama).
   *
   * Hasil identitas:
   *  - Embedding final = rata-rata semua probe → bandingkan ke referensi
   *    karyawan (cosine similarity) terhadap `face_match_threshold`.
   */
  async verifyWithLiveness(
    employeeId: string,
    uris: string[]
  ): Promise<FaceVerificationResult> {
    if (!employeeId) throw new Error('employeeId wajib.');
    if (!uris || uris.length < 2) {
      throw new Error('Liveness butuh minimal 2 foto pose berbeda.');
    }

    // Fetch referensi.
    const { data, error } = await supabase
      .from('employees')
      .select('face_embedding, face_match_threshold')
      .eq('id', employeeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.face_embedding) {
      return {
        verified: false,
        score: 0,
        details: { method: 'mobilefacenet+liveness', reason: 'not_enrolled' },
      };
    }
    const reference = data.face_embedding as number[];
    const threshold = Number(data.face_match_threshold) || DEFAULT_THRESHOLD;

    // Compute embeddings sekuensial (TFLite tidak thread-safe untuk konkurensi tinggi).
    const probes: number[][] = [];
    for (const uri of uris) {
      try {
        const emb = await computeEmbeddingFromUri(uri);
        probes.push(emb);
      } catch (err: any) {
        throw new Error(err?.message || 'Gagal memproses gambar wajah.');
      }
    }

    // Liveness: pairwise similarity antar probe.
    const LIVENESS_MIN_PAIR = 0.45; // di bawah ini = orang berbeda
    const LIVENESS_MAX_PAIR = 0.97; // di atas ini = foto sama (spoof)
    const pairwiseScores: number[] = [];
    for (let i = 0; i < probes.length - 1; i++) {
      pairwiseScores.push(cosineSimilarity(probes[i], probes[i + 1]));
    }
    const minPair = Math.min(...pairwiseScores);
    const maxPair = Math.max(...pairwiseScores);

    if (maxPair > LIVENESS_MAX_PAIR) {
      return {
        verified: false,
        score: 0,
        details: {
          method: 'mobilefacenet+liveness',
          reason: 'spoof_static_image',
          maxPair: Number(maxPair.toFixed(4)),
        },
      };
    }
    if (minPair < LIVENESS_MIN_PAIR) {
      return {
        verified: false,
        score: 0,
        details: {
          method: 'mobilefacenet+liveness',
          reason: 'pose_mismatch_or_different_person',
          minPair: Number(minPair.toFixed(4)),
        },
      };
    }

    // Identitas: rata-rata probe (L2-normalized post-average) vs reference.
    const dim = probes[0].length;
    const avg = new Array(dim).fill(0);
    for (const p of probes) {
      for (let i = 0; i < dim; i++) avg[i] += p[i];
    }
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      avg[i] /= probes.length;
      norm += avg[i] * avg[i];
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < dim; i++) avg[i] /= norm;

    const score = cosineSimilarity(reference, avg);
    return {
      verified: score >= threshold,
      score: Number(score.toFixed(4)),
      details: {
        method: 'mobilefacenet+liveness',
        threshold,
        liveness: {
          minPair: Number(minPair.toFixed(4)),
          maxPair: Number(maxPair.toFixed(4)),
        },
      },
    };
  },

  compareFaceEmbeddings(captured: number[], stored: number[]): number {
    return cosineSimilarity(captured, stored);
  },
};

