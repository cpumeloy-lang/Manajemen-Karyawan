/**
 * src/components/LivenessCaptureModal.tsx
 *
 * Modal full-screen yang membimbing user mengambil 3 foto dengan pose
 * berbeda (lurus, kiri, kanan). Multi-frame ini dipakai untuk **liveness
 * detection** — foto statis tunggal tidak akan lolos karena pairwise
 * similarity terlalu tinggi (>0.97).
 *
 * Pakai `expo-camera` (sudah terinstall). Tahan-banting bila modul belum
 * tersedia (dev-client lama).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';

let CameraModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  CameraModule = require('expo-camera');
} catch {
  CameraModule = null;
}

interface Step {
  id: string;
  prompt: string;
  hint: string;
}

const STEPS: Step[] = [
  { id: 'front', prompt: 'Lihat lurus ke kamera', hint: 'Posisikan wajah di tengah lingkaran.' },
  { id: 'left', prompt: 'Tengok perlahan ke kiri', hint: 'Putar kepala ~20° ke kiri.' },
  { id: 'right', prompt: 'Tengok perlahan ke kanan', hint: 'Putar kepala ~20° ke kanan.' },
];

const COUNTDOWN_SECONDS = 2;

interface Props {
  visible: boolean;
  onComplete: (uris: string[]) => void;
  onCancel: () => void;
}

export function LivenessCaptureModal({ visible, onComplete, onCancel }: Props) {
  const cameraRef = useRef<any>(null);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [stepIndex, setStepIndex] = useState(0);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [capturing, setCapturing] = useState(false);
  const [collectedUris, setCollectedUris] = useState<string[]>([]);

  // Reset state saat modal dibuka.
  useEffect(() => {
    if (visible) {
      setStepIndex(0);
      setCountdown(COUNTDOWN_SECONDS);
      setCapturing(false);
      setCollectedUris([]);
    }
  }, [visible]);

  // Request permission saat modal dibuka pertama kali.
  useEffect(() => {
    if (!visible || !CameraModule) return;
    (async () => {
      try {
        const cur = await CameraModule.Camera.getCameraPermissionsAsync();
        if (cur?.granted) {
          setPermission('granted');
          return;
        }
        const ask = await CameraModule.Camera.requestCameraPermissionsAsync();
        setPermission(ask?.granted ? 'granted' : 'denied');
      } catch {
        setPermission('denied');
      }
    })();
  }, [visible]);

  // Countdown & auto-capture loop.
  useEffect(() => {
    if (!visible || permission !== 'granted' || capturing) return;
    if (stepIndex >= STEPS.length) return;

    if (countdown <= 0) {
      void doCapture();
      return;
    }

    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, permission, countdown, stepIndex, capturing]);

  const doCapture = async () => {
    if (!cameraRef.current) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      const uri: string | undefined = photo?.uri;
      if (!uri) throw new Error('Tidak ada URI dari kamera.');
      const next = [...collectedUris, uri];
      setCollectedUris(next);

      if (next.length >= STEPS.length) {
        // Selesai semua step.
        onComplete(next);
        return;
      }
      // Lanjut ke step berikutnya.
      setStepIndex((i) => i + 1);
      setCountdown(COUNTDOWN_SECONDS);
    } catch (err) {
      // Fail-safe: cancel modal agar caller bisa retry.
      console.warn('[liveness] capture error', err);
      onCancel();
    } finally {
      setCapturing(false);
    }
  };

  if (!visible) return null;

  // Fallback bila expo-camera tidak tersedia.
  if (!CameraModule) {
    return (
      <Modal visible animationType="fade" onRequestClose={onCancel}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Kamera tidak tersedia</Text>
          <Text style={styles.errorBody}>
            Modul kamera (expo-camera) belum tersedia di build ini. Rebuild dev-client
            untuk mengaktifkan verifikasi wajah dengan liveness detection.
          </Text>
          <Pressable style={styles.errorBtn} onPress={onCancel}>
            <Text style={styles.errorBtnText}>Tutup</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  const CameraView = CameraModule.CameraView || CameraModule.Camera;
  const currentStep = STEPS[Math.min(stepIndex, STEPS.length - 1)];

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View style={styles.root}>
        {permission === 'pending' ? (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.dim}>Meminta izin kamera…</Text>
          </View>
        ) : permission === 'denied' ? (
          <View style={styles.center}>
            <Text style={styles.dim}>Izin kamera ditolak.</Text>
            <Pressable style={styles.errorBtn} onPress={onCancel}>
              <Text style={styles.errorBtnText}>Tutup</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="front"
              type={CameraModule.CameraType?.front}
            />

            {/* Overlay UI */}
            <View pointerEvents="box-none" style={styles.overlay}>
              <View style={styles.topBar}>
                <Pressable style={styles.cancelBtn} onPress={onCancel}>
                  <Text style={styles.cancelText}>Batal</Text>
                </Pressable>
                <Text style={styles.progress}>
                  {Math.min(collectedUris.length + 1, STEPS.length)}/{STEPS.length}
                </Text>
              </View>

              <View style={styles.guide} />

              <View style={styles.bottomBar}>
                <Text style={styles.prompt}>{currentStep.prompt}</Text>
                <Text style={styles.hint}>{currentStep.hint}</Text>
                <Text style={styles.countdown}>
                  {capturing ? 'Mengambil…' : `Foto otomatis dalam ${countdown}s`}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cancelText: {
    color: '#fff',
    fontWeight: '700',
  },
  progress: {
    color: '#fff',
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  guide: {
    alignSelf: 'center',
    width: 260,
    height: 320,
    borderRadius: 160,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    marginTop: 20,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  prompt: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  hint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  countdown: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderRadius: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  dim: {
    color: '#fff',
  },
  errorWrap: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  errorBody: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginTop: 14,
  },
  errorBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
});
