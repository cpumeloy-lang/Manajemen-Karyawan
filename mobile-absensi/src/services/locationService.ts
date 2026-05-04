import * as Location from 'expo-location';

export interface LocationSnapshot {
  label: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  error?: 'permission_denied' | 'services_disabled' | 'timeout' | 'unknown';
}

const LOCATION_TIMEOUT_MS = 15_000;

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

    const latitude = Number(position.coords.latitude.toFixed(6));
    const longitude = Number(position.coords.longitude.toFixed(6));
    const accuracy = position.coords.accuracy
      ? Number(position.coords.accuracy.toFixed(1))
      : undefined;

    return {
      label: `GPS ${latitude.toFixed(5)}, ${longitude.toFixed(5)}${accuracy ? ` (±${accuracy}m)` : ''}`,
      latitude,
      longitude,
      accuracy,
    };
  } catch (error: any) {
    const isTimeout = error?.message === 'timeout';
    return {
      label: isTimeout ? 'GPS timeout. Coba lagi di tempat terbuka.' : 'Gagal mendapatkan lokasi',
      error: isTimeout ? 'timeout' : 'unknown',
    };
  }
}
