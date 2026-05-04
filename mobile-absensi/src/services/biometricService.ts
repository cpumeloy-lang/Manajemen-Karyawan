import { Alert } from 'react-native';
import type { FaceVerificationResult } from '../types';

export const biometricService = {
  async captureAndVerifyFace(): Promise<FaceVerificationResult> {
    // ⚠️ SECURITY: In production, this placeholder MUST be replaced with real
    // face verification (ML Kit, Vision Camera + tflite, or similar) before shipping.
    // Returning verified=true unconditionally allows attendance fraud.
    if (!__DEV__) {
      Alert.alert(
        'Verifikasi Tidak Tersedia',
        'Fitur verifikasi wajah belum diimplementasikan di build ini. Hubungi administrator.'
      );
      return {
        verified: false,
        score: 0,
        details: {
          method: 'placeholder',
          note: 'PRODUCTION BLOCKED — real biometric implementation required',
        },
      };
    }

    // Dev-only: allow placeholder for local testing flows
    Alert.alert(
      'Verifikasi Wajah (DEV)',
      'Mode placeholder untuk pengembangan. TIDAK akan bekerja di build produksi.'
    );

    return {
      verified: true,
      score: 0.95,
      details: {
        method: 'placeholder',
        note: 'DEV ONLY — Integrasikan ML Kit / Vision Camera untuk produksi',
      },
    };
  },

  compareFaceEmbeddings(captured: number[], stored: number[]): number {
    if (captured.length !== stored.length || captured.length === 0) {
      return 0;
    }

    const dot = captured.reduce((sum, value, index) => sum + value * stored[index], 0);
    const magnitudeA = Math.sqrt(captured.reduce((sum, value) => sum + value * value, 0));
    const magnitudeB = Math.sqrt(stored.reduce((sum, value) => sum + value * value, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return Number((dot / (magnitudeA * magnitudeB)).toFixed(4));
  },
};
