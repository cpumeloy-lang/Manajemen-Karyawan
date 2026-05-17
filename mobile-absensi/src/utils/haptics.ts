import { Platform, Vibration } from 'react-native';

/**
 * Helper feedback getar ringan untuk konfirmasi aksi penting.
 *
 * Implementasi pakai `Vibration` API bawaan React Native (sudah dideklarasikan
 * di `app.json` permissions) — tidak perlu install expo-haptics. Jika di masa
 * depan kita ingin variasi pattern haptic (impact medium/heavy/notification),
 * file ini bisa di-swap ke expo-haptics tanpa mengubah call site.
 *
 * iOS: Vibration.vibrate(ms) terbatas di 400ms; pendekkan untuk feel native.
 * Android: pattern lebih fleksibel.
 */

const isWeb = Platform.OS === 'web';

export const haptics = {
  /** Sukses singkat — dipakai untuk check-in/out berhasil. */
  success() {
    if (isWeb) return;
    if (Platform.OS === 'ios') {
      // iOS hanya bisa fixed-length; 50ms terasa seperti soft-tap.
      Vibration.vibrate(50);
    } else {
      // Android: pattern dua getar pendek (50ms) terasa "ding".
      Vibration.vibrate([0, 40, 60, 40]);
    }
  },

  /** Error — getar lebih panjang untuk perhatian. */
  error() {
    if (isWeb) return;
    if (Platform.OS === 'ios') {
      Vibration.vibrate(200);
    } else {
      Vibration.vibrate([0, 100, 80, 100]);
    }
  },

  /** Warning ringan. */
  warning() {
    if (isWeb) return;
    Vibration.vibrate(80);
  },
};
