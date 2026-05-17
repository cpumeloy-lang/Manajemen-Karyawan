/**
 * src/config/version.ts
 *
 * Sumber tunggal untuk info versi aplikasi.
 * Bila `expo-constants` terpasang → ambil dari app.json (lebih akurat).
 * Bila tidak → fallback ke hardcoded di bawah (WAJIB di-bump setiap rilis).
 *
 * Penggunaan: force-update gate, error reporting, dashboard profil.
 */

// --- Fallback hardcoded (sinkronkan dengan app.json setiap rilis) ---
const FALLBACK_VERSION = '0.1.0';
const FALLBACK_VERSION_CODE = 1;
// -------------------------------------------------------------------

let versionName = FALLBACK_VERSION;
let versionCode = FALLBACK_VERSION_CODE;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Constants = require('expo-constants').default;
  const expoCfg = Constants?.expoConfig;
  if (expoCfg?.version) versionName = String(expoCfg.version);
  const androidVc = expoCfg?.android?.versionCode;
  if (androidVc) versionCode = Number(androidVc) || FALLBACK_VERSION_CODE;
} catch {
  // expo-constants belum ter-install → pakai fallback.
}

export const APP_VERSION = versionName;
export const APP_VERSION_CODE = versionCode;
