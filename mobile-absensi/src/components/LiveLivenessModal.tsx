/**
 * src/components/LiveLivenessModal.tsx
 *
 * Phase 9 — Frame-level liveness detection memakai react-native-vision-camera +
 * react-native-vision-camera-face-detector (Google ML Kit) untuk verifikasi
 * gerakan biometrik real-time.
 *
 * State machine challenges (urutan acak agar sulit di-replay):
 *   1. CENTER       : wajah harus berada di tengah, yaw < 12°.
 *   2. BLINK_TWICE  : 2 kedipan terdeteksi (transisi mata terbuka → tertutup → terbuka).
 *   3. SMILE        : senyum dengan probabilitas > 0.6 selama 600 ms.
 *
 * Setelah semua challenges selesai → capture snapshot via `camera.takeSnapshot()`
 * → return URI ke caller untuk diolah `faceRecognitionService.verifyFace()`.
 *
 * Tahan-banting: bila modul vision-camera / face-detector tidak tersedia
 * (dev-client lama), modal langsung memberitahu caller untuk fallback.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';

// Lazy-require agar app tidak crash di dev-client tanpa native module.
let VisionCamera: any = null;
let FaceDetector: any = null;
let WorkletsCore: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  VisionCamera = require('react-native-vision-camera');
} catch {
  VisionCamera = null;
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FaceDetector = require('react-native-vision-camera-face-detector');
} catch {
  FaceDetector = null;
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WorkletsCore = require('react-native-worklets-core');
} catch {
  WorkletsCore = null;
}

const NATIVE_AVAILABLE = !!(VisionCamera && FaceDetector && WorkletsCore);

type Stage = 'init' | 'center' | 'blink' | 'smile' | 'capture' | 'done' | 'failed';

interface FaceData {
  yawAngle?: number;
  pitchAngle?: number;
  rollAngle?: number;
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
  smilingProbability?: number;
  bounds?: { x: number; y: number; width: number; height: number };
}

interface Props {
  visible: boolean;
  onComplete: (uri: string) => void;
  onCancel: () => void;
  /**
   * Bila true & native module tidak tersedia, modal akan auto-cancel sehingga
   * caller bisa fallback ke modal photo-based (Phase 8). Default true.
   */
  fallbackOnUnavailable?: boolean;
}

const STAGE_LABEL: Record<Stage, string> = {
  init: 'Memuat kamera…',
  center: 'Posisikan wajah di tengah lingkaran',
  blink: 'Kedipkan mata 2 kali',
  smile: 'Tersenyum lebar',
  capture: 'Mengambil foto…',
  done: 'Selesai',
  failed: 'Verifikasi gagal',
};

const STAGE_HINT: Record<Stage, string> = {
  init: 'Tunggu sebentar.',
  center: 'Pegang HP setinggi mata, wajah menghadap kamera.',
  blink: 'Buka–tutup mata dengan jelas, 2 kali.',
  smile: 'Tahan senyum sejenak.',
  capture: 'Jangan bergerak.',
  done: 'Liveness terverifikasi.',
  failed: 'Coba lagi atau gunakan mode foto.',
};

export function LiveLivenessModal({
  visible,
  onComplete,
  onCancel,
  fallbackOnUnavailable = true,
}: Props) {
  const cameraRef = useRef<any>(null);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [device, setDevice] = useState<any>(null);
  const [stage, setStage] = useState<Stage>('init');
  const [progressNote, setProgressNote] = useState<string>('');

  // State machine kontrol — disimpan di ref agar bisa diakses dari frame processor.
  const blinkCountRef = useRef(0);
  const eyesOpenRef = useRef(true); // last known eye state
  const smileStartTsRef = useRef<number | null>(null);
  const stageRef = useRef<Stage>('init');
  stageRef.current = stage;

  // Reset semua state saat modal dibuka.
  useEffect(() => {
    if (visible) {
      blinkCountRef.current = 0;
      eyesOpenRef.current = true;
      smileStartTsRef.current = null;
      setStage('init');
      setProgressNote('');
    }
  }, [visible]);

  // Auto-cancel bila native deps tidak ada.
  useEffect(() => {
    if (visible && !NATIVE_AVAILABLE && fallbackOnUnavailable) {
      onCancel();
    }
  }, [visible, fallbackOnUnavailable, onCancel]);

  // Pilih device kamera depan + minta izin.
  useEffect(() => {
    if (!visible || !NATIVE_AVAILABLE) return;
    const Camera = VisionCamera.Camera;
    (async () => {
      try {
        let p = await Camera.getCameraPermissionStatus();
        if (p !== 'granted') p = await Camera.requestCameraPermission();
        setPermission(p === 'granted' ? 'granted' : 'denied');
        if (p !== 'granted') return;
      } catch {
        setPermission('denied');
        return;
      }
    })();
  }, [visible]);

  // Resolve front-facing device via hook (must be inside component but guarded).
  const dev = NATIVE_AVAILABLE ? VisionCamera.useCameraDevice?.('front') : null;
  useEffect(() => {
    if (dev) setDevice(dev);
  }, [dev]);

  // Frame processor: deteksi wajah & update state machine.
  const handleFaceData = useCallback((face: FaceData | null) => {
    const s = stageRef.current;
    if (!face) return;

    if (s === 'center') {
      const yaw = Math.abs(face.yawAngle || 0);
      const pitch = Math.abs(face.pitchAngle || 0);
      if (yaw < 12 && pitch < 15 && (face.bounds?.width || 0) > 100) {
        // Pilih next challenge secara acak agar replay attack lebih sulit.
        setStage(Math.random() < 0.5 ? 'blink' : 'smile');
      }
      return;
    }

    if (s === 'blink') {
      const left = face.leftEyeOpenProbability ?? 1;
      const right = face.rightEyeOpenProbability ?? 1;
      const open = (left + right) / 2 > 0.6;
      const closed = (left + right) / 2 < 0.3;

      if (eyesOpenRef.current && closed) {
        // Open → closed transition (mulai blink).
        eyesOpenRef.current = false;
      } else if (!eyesOpenRef.current && open) {
        // Closed → open transition (blink complete).
        eyesOpenRef.current = true;
        blinkCountRef.current += 1;
        setProgressNote(`Kedipan terdeteksi: ${blinkCountRef.current}/2`);
        if (blinkCountRef.current >= 2) {
          setStage((prev) => (prev === 'blink' ? 'smile' : prev));
          setProgressNote('');
        }
      }
      return;
    }

    if (s === 'smile') {
      const sm = face.smilingProbability ?? 0;
      const now = Date.now();
      if (sm > 0.6) {
        if (smileStartTsRef.current === null) smileStartTsRef.current = now;
        if (now - (smileStartTsRef.current || now) > 600) {
          setStage('capture');
        }
      } else {
        smileStartTsRef.current = null;
      }
      return;
    }
  }, []);

  // Worklet runOnJS bridge.
  const onFaceDataJS = useMemo(() => {
    if (!WorkletsCore) return null;
    return WorkletsCore.Worklets.createRunOnJS(handleFaceData);
  }, [handleFaceData]);

  // Frame processor.
  const frameProcessor = useMemo(() => {
    if (!NATIVE_AVAILABLE || !VisionCamera.useFrameProcessor) return null;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return VisionCamera.useFrameProcessor((frame: any) => {
      'worklet';
      try {
        const { detectFaces } = FaceDetector;
        const faces = detectFaces ? detectFaces(frame) : [];
        const face = Array.isArray(faces) && faces.length > 0 ? faces[0] : null;
        if (onFaceDataJS) onFaceDataJS(face);
      } catch (e) {
        // ignore
      }
    }, [onFaceDataJS]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFaceDataJS]);

  // Stage transitions: init → center setelah camera siap.
  useEffect(() => {
    if (visible && permission === 'granted' && device && stage === 'init') {
      // Delay sedikit untuk camera mount stabil.
      const t = setTimeout(() => setStage('center'), 600);
      return () => clearTimeout(t);
    }
  }, [visible, permission, device, stage]);

  // Stage capture → ambil snapshot.
  useEffect(() => {
    if (stage !== 'capture' || !cameraRef.current) return;
    (async () => {
      try {
        const snap = await cameraRef.current.takeSnapshot({ quality: 85 });
        const uri: string | undefined = snap?.path
          ? snap.path.startsWith('file://')
            ? snap.path
            : `file://${snap.path}`
          : undefined;
        if (!uri) throw new Error('Gagal mendapatkan URI snapshot.');
        setStage('done');
        // Sedikit delay agar UI "Selesai" terlihat.
        setTimeout(() => onComplete(uri), 400);
      } catch (err) {
        console.warn('[liveness-live] capture error', err);
        setStage('failed');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  if (!visible) return null;

  // Fallback UI bila native tidak tersedia.
  if (!NATIVE_AVAILABLE) {
    return (
      <Modal visible animationType="fade" onRequestClose={onCancel}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Liveness real-time tidak tersedia</Text>
          <Text style={styles.errorBody}>
            Modul kamera/ML Kit belum di-build. Aplikasi akan fallback ke verifikasi
            multi-foto.
          </Text>
          <Pressable style={styles.errorBtn} onPress={onCancel}>
            <Text style={styles.errorBtnText}>OK</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View style={styles.root}>
        {permission === 'pending' ? (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.dim}>Meminta izin kamera…</Text>
          </View>
        ) : permission === 'denied' || !device ? (
          <View style={styles.center}>
            <Text style={styles.dim}>
              {permission === 'denied' ? 'Izin kamera ditolak.' : 'Kamera depan tidak tersedia.'}
            </Text>
            <Pressable style={styles.errorBtn} onPress={onCancel}>
              <Text style={styles.errorBtnText}>Tutup</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <VisionCamera.Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={visible}
              photo
              frameProcessor={frameProcessor || undefined}
              pixelFormat="yuv"
            />

            <View pointerEvents="box-none" style={styles.overlay}>
              <View style={styles.topBar}>
                <Pressable style={styles.cancelBtn} onPress={onCancel}>
                  <Text style={styles.cancelText}>Batal</Text>
                </Pressable>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>LIVE</Text>
                </View>
              </View>

              <View style={styles.guide} />

              <View style={styles.bottomBar}>
                <Text style={styles.prompt}>{STAGE_LABEL[stage]}</Text>
                <Text style={styles.hint}>{STAGE_HINT[stage]}</Text>
                {progressNote ? <Text style={styles.progress}>{progressNote}</Text> : null}
                {stage === 'failed' ? (
                  <Pressable style={styles.retryBtn} onPress={() => setStage('center')}>
                    <Text style={styles.retryText}>Coba Lagi</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

/** Helper agar caller bisa cek availability sebelum render. */
export const isLiveLivenessAvailable = () => NATIVE_AVAILABLE;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
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
  cancelText: { color: '#fff', fontWeight: '700' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#d62828',
  },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
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
  prompt: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  hint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  progress: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderRadius: 12,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignSelf: 'center',
  },
  retryText: { color: '#fff', fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  dim: { color: '#fff' },
  errorWrap: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  errorTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  errorBody: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },
  errorBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginTop: 14,
  },
  errorBtnText: { color: '#fff', fontWeight: '800' },
});
