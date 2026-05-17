import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { colors } from '../../theme/colors';
import { haptics } from '../../utils/haptics';
import { enrollFace, isEnrolled } from '../../services/faceRecognitionService';
import type { MobileUser } from '../../types';

let ImagePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ImagePicker = require('expo-image-picker');
} catch {
  ImagePicker = null;
}

interface Props {
  user: MobileUser;
  onDone?: () => void;
}

export function FaceEnrollmentScreen({ user, onDone }: Props) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<string>('');

  useEffect(() => {
    if (!user.employeeId) return;
    void isEnrolled(user.employeeId).then(setEnrolled);
  }, [user.employeeId]);

  const capture = async () => {
    if (!ImagePicker) {
      Alert.alert('Tidak bisa', 'expo-image-picker belum tersedia. Rebuild dev-client.');
      return;
    }
    const cur = await ImagePicker.getCameraPermissionsAsync?.();
    if (!cur?.granted) {
      const ask = await ImagePicker.requestCameraPermissionsAsync?.();
      if (!ask?.granted) {
        Alert.alert('Izin kamera ditolak');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      cameraType: ImagePicker.CameraType?.front,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (asset?.uri) setPhotoUri(asset.uri);
  };

  const submitEnrollment = async () => {
    if (!photoUri || !user.employeeId) return;
    setBusy(true);
    setProgress('Memuat model wajah…');
    try {
      // Trigger model load up-front for clearer error.
      setProgress('Memproses gambar…');
      await enrollFace(user.employeeId, photoUri);
      haptics.success();
      setEnrolled(true);
      Alert.alert(
        'Wajah terdaftar',
        'Wajah Anda berhasil di-enroll. Selanjutnya, check-in akan memverifikasi wajah secara otomatis.',
        [{ text: 'OK', onPress: () => onDone?.() }]
      );
      setPhotoUri(null);
    } catch (err: any) {
      haptics.error();
      Alert.alert('Enrollment gagal', err?.message || 'Coba lagi nanti.');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <AppCard title="Daftar Wajah">
        <Text style={styles.desc}>
          Daftarkan wajah Anda sekali untuk mengaktifkan verifikasi otomatis saat check-in/out.
          Pastikan pencahayaan cukup, wajah tegak menghadap kamera, tidak memakai masker.
        </Text>

        {enrolled === true ? (
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={styles.statusText}>Wajah sudah terdaftar.</Text>
          </View>
        ) : enrolled === false ? (
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <Text style={styles.statusText}>Belum terdaftar.</Text>
          </View>
        ) : null}

        <View style={styles.previewWrap}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} />
          ) : (
            <View style={[styles.preview, styles.previewEmpty]}>
              <Text style={styles.previewEmptyText}>Belum ada foto</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <AppButton
            title={photoUri ? 'Ambil Ulang' : 'Ambil Foto Wajah'}
            variant="secondary"
            onPress={capture}
            disabled={busy}
          />
          <AppButton
            title={busy ? progress || 'Memproses…' : enrolled ? 'Daftar Ulang' : 'Daftarkan Wajah'}
            onPress={submitEnrollment}
            disabled={!photoUri || busy}
            loading={busy}
          />
        </View>

        {busy ? (
          <View style={styles.busyHint}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.busyText}>{progress}</Text>
          </View>
        ) : null}
      </AppCard>

      <AppCard title="Tips & Privasi">
        <Text style={styles.tip}>• Foto referensi disimpan terenkripsi di server (bucket private).</Text>
        <Text style={styles.tip}>• Embedding wajah (vektor numerik) tersimpan di database, bukan foto mentah.</Text>
        <Text style={styles.tip}>• Daftar ulang bila penampilan berubah signifikan (rambut, kacamata baru, dll).</Text>
        <Text style={styles.tip}>• Ambang kecocokan default 0.65 (dapat di-tune oleh admin).</Text>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  desc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  previewWrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#e6f1ee',
  },
  previewEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  previewEmptyText: {
    color: colors.muted,
    fontSize: 13,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  busyHint: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  busyText: {
    color: colors.muted,
    fontSize: 13,
  },
  tip: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
});
