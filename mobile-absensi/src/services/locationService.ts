import * as Location from 'expo-location';

export interface LocationSnapshot {
  label: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  /** True jika perangkat melaporkan posisi mock/fake. Wajib ditolak untuk absensi. */
  mocked?: boolean;
  /** Akurasi terlalu rendah (>100m) - pertanda lokasi tidak valid. */
  lowAccuracy?: boolean;
  error?:
    | 'permission_denied'
    | 'services_disabled'
    | 'timeout'
    | 'mock_location'
    | 'low_accuracy'
    | 'unknown';
}

const LOCATION_TIMEOUT_MS = 15_000;
/** Threshold akurasi maksimum yang diterima untuk absensi (meter). */
const MAX_ACCURACY_METERS = 100;

export async function getAttendanceLocation(): Promise<LocationSnapshot> {
  // Check if location services are enabled
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    return { label: 'GPS tidak aktif. Aktifkan di pengaturan.', error: 'services_disabled' };
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return { label: 'Izin lokasi ditolak', error: 'permission_denied' };
  }

  try {
    // Race between location fetch and timeout
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), LOCATION_TIMEOUT_MS)
      ),
    ]);

    // Anti-fraud: deteksi mock location (Android exposes `mocked` flag).
    // expo-location tipenya tidak mendeklarasikan `mocked` tapi runtime menyediakannya.
    const mocked = Boolean((position.coords as any).mocked || (position as any).mocked);
    if (mocked) {
      return {
        label: 'Lokasi palsu terdeteksi. Nonaktifkan aplikasi mock GPS.',
        error: 'mock_location',
        mocked: true,
      };
    }

    const latitude = Number(position.coords.latitude.toFixed(6));
    const longitude = Number(position.coords.longitude.toFixed(6));
    const accuracy = position.coords.accuracy
      ? Number(position.coords.accuracy.toFixed(1))
      : undefined;

    // Tolak akurasi terlalu rendah (kemungkinan WiFi/cell-tower only, bukan GPS sebenarnya)
    if (accuracy !== undefined && accuracy > MAX_ACCURACY_METERS) {
      return {
        label: `Akurasi GPS rendah (±${accuracy}m). Pindah ke area terbuka.`,
        latitude,
        longitude,
        accuracy,
        lowAccuracy: true,
        error: 'low_accuracy',
      };
    }

    return {
      label: `GPS ${latitude.toFixed(5)}, ${longitude.toFixed(5)}${accuracy ? ` (±${accuracy}m)` : ''}`,
      latitude,
      longitude,
      accuracy,
      mocked: false,
    };
  } catch (error: any) {
    const isTimeout = error?.message === 'timeout';
    return {
      label: isTimeout ? 'GPS timeout. Coba lagi di tempat terbuka.' : 'Gagal mendapatkan lokasi',
      error: isTimeout ? 'timeout' : 'unknown',
    };
  }
}

/**
 * Hitung jarak antara dua koordinat (Haversine formula) — meter.
 * Digunakan untuk geofencing (validasi karyawan dalam radius RS).
 */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // radius bumi dalam meter
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
