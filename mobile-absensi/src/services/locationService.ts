import * as Location from 'expo-location';

export interface LocationSnapshot {
  label: string;
  latitude?: number;
  longitude?: number;
}

export async function getAttendanceLocation(): Promise<LocationSnapshot> {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== 'granted') {
    return { label: 'Izin lokasi ditolak' };
  }

  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const latitude = Number(position.coords.latitude.toFixed(6));
  const longitude = Number(position.coords.longitude.toFixed(6));

  return {
    label: `GPS ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    latitude,
    longitude,
  };
}
