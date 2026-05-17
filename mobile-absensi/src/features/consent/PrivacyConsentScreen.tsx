/**
 * src/features/consent/PrivacyConsentScreen.tsx
 *
 * Wajib menurut UU PDP No. 27/2022 (Indonesia): aplikasi yang
 * memproses data biometrik & lokasi harus memperoleh persetujuan
 * eksplisit dari subjek data (karyawan), dengan informasi:
 *   - Tujuan pemrosesan
 *   - Jenis data yang dikumpulkan
 *   - Hak subjek data (akses, perbaikan, penghapusan)
 *   - Cara menarik persetujuan
 *
 * Screen ini ditampilkan SEKALI saat first-launch setelah login berhasil.
 * Persetujuan disimpan di SecureStore + DB (audit trail UU PDP).
 *
 * Struktur:
 *   1. Ringkasan: 1 paragraf bahasa Indonesia sederhana.
 *   2. Detail per kategori data: Identitas, Biometrik, Lokasi, Perangkat.
 *   3. Hak karyawan + cara hubungi DPO.
 *   4. Tombol "Saya Setuju" / "Tidak Setuju".
 */
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import { saveConsent, declineConsent } from '../../services/consentService';
import type { MobileUser } from '../../types';

interface Props {
  user: MobileUser;
  onAccepted: () => void;
  onDeclined: () => void;
}

export function PrivacyConsentScreen({ user, onAccepted, onDeclined }: Props) {
  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    setBusy(true);
    try {
      await saveConsent(user, {
        version: PRIVACY_POLICY_VERSION,
        scope: ['identity', 'biometric', 'location', 'device'],
      });
      onAccepted();
    } catch (err: any) {
      Alert.alert('Gagal menyimpan persetujuan', err?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Tidak setuju kebijakan privasi?',
      'Tanpa persetujuan, aplikasi tidak dapat digunakan untuk absensi. Anda akan keluar otomatis. Hubungi HRD bila ada pertanyaan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tetap Tidak Setuju',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await declineConsent(user, PRIVACY_POLICY_VERSION);
            } finally {
              onDeclined();
            }
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <View>
        <Text style={styles.title}>Kebijakan Privasi & Persetujuan</Text>
        <Text style={styles.subtitle}>
          Versi {PRIVACY_POLICY_VERSION} • Berlaku sejak Mei 2026
        </Text>

        <View style={styles.section}>
          <Text style={styles.h2}>Ringkasan</Text>
          <Text style={styles.body}>
            Aplikasi HRMS Absensi mengumpulkan data identitas, wajah (biometrik),
            lokasi, dan perangkat untuk mencatat kehadiran kerja Anda di rumah
            sakit. Data Anda diolah sesuai{' '}
            <Text style={styles.bold}>UU No. 27 Tahun 2022 tentang Pelindungan
            Data Pribadi</Text> dan tidak akan dibagikan ke pihak ketiga tanpa
            persetujuan Anda.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Data yang Dikumpulkan</Text>

          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>1. Data Identitas</Text>
            <Text style={styles.body}>
              Nama, NIK karyawan, email, nomor telepon, foto profil, departemen,
              dan jabatan. <Text style={styles.bold}>Tujuan</Text>: identifikasi
              karyawan dan administrasi kepegawaian.
            </Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>2. Data Biometrik (Wajah)</Text>
            <Text style={styles.body}>
              Foto wajah saat enrollment (1 kali) dan saat verifikasi check-in/out.
              Disimpan sebagai <Text style={styles.bold}>vektor numerik
              (embedding)</Text> di server aman, bukan foto utuh.{' '}
              <Text style={styles.bold}>Tujuan</Text>: memastikan absensi dilakukan
              oleh karyawan bersangkutan (anti titip-absen).
            </Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>3. Data Lokasi (GPS)</Text>
            <Text style={styles.body}>
              Koordinat GPS hanya pada saat check-in/check-out (bukan terus-menerus).
              <Text style={styles.bold}> Tujuan</Text>: verifikasi karyawan berada
              di area kerja saat absen.
            </Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>4. Data Perangkat</Text>
            <Text style={styles.body}>
              ID perangkat unik, model HP, OS version, dan token notifikasi.
              <Text style={styles.bold}> Tujuan</Text>: anti-fraud (mendeteksi
              akses dari perangkat tidak terdaftar) dan pengiriman notifikasi.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Penyimpanan & Keamanan</Text>
          <Text style={styles.body}>
            • Semua data dienkripsi saat transit (TLS/HTTPS) dan saat disimpan.{'\n'}
            • Embedding wajah diproses secara{' '}
            <Text style={styles.bold}>on-device</Text> — foto Anda tidak pernah
            dikirim utuh ke server.{'\n'}
            • Akses internal dibatasi dengan Row-Level Security (RLS).{'\n'}
            • Backup harian terenkripsi dengan kunci yang hanya dimiliki tim IT RS.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Hak Anda Sebagai Subjek Data</Text>
          <Text style={styles.body}>
            Sesuai UU PDP, Anda memiliki hak untuk:{'\n'}
            • Mengakses data pribadi Anda kapan saja.{'\n'}
            • Memperbaiki data yang tidak akurat.{'\n'}
            • Meminta penghapusan data biometrik (akan menonaktifkan absensi
            wajah; harus ganti ke metode lain).{'\n'}
            • Menarik persetujuan kapan saja melalui HRD.{'\n'}
            • Menyampaikan keluhan terkait perlindungan data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Retensi Data</Text>
          <Text style={styles.body}>
            • Data absensi: disimpan selama Anda menjadi karyawan + 5 tahun
            untuk audit (sesuai UU Ketenagakerjaan).{'\n'}
            • Data biometrik: dihapus segera setelah Anda berhenti bekerja atau
            menarik persetujuan.{'\n'}
            • Data lokasi: hanya disimpan per record absensi (tidak ada tracking
            kontinu).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Kontak & Pengaduan</Text>
          <Text style={styles.body}>
            <Text style={styles.bold}>Data Protection Officer (DPO):</Text>{'\n'}
            Email:{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('mailto:dpo@rs-anda.id')}
            >
              dpo@rs-anda.id
            </Text>
            {'\n'}
            Telepon HRD: (Hubungi sesuai daftar internal RS){'\n\n'}
            <Text style={styles.bold}>Otoritas pengawas:</Text>{'\n'}
            Kementerian Komunikasi dan Informatika RI
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Persetujuan</Text>
          <Text style={styles.body}>
            Dengan menekan{' '}
            <Text style={styles.bold}>"Saya Setuju"</Text>, Anda menyatakan:{'\n'}
            • Telah membaca dan memahami kebijakan ini.{'\n'}
            • Memberikan persetujuan eksplisit untuk pemrosesan data identitas,
            biometrik, lokasi, dan perangkat sesuai tujuan di atas.{'\n'}
            • Memahami hak-hak Anda sebagai subjek data.
          </Text>
        </View>

        <View style={styles.actions}>
          <AppButton
            title="Saya Setuju"
            onPress={handleAccept}
            disabled={busy}
          />
          <View style={{ height: 12 }} />
          <AppButton
            title="Tidak Setuju (Logout)"
            onPress={handleDecline}
            variant="secondary"
            disabled={busy}
          />
        </View>

        <Text style={styles.footnote}>
          Akun: {user.email} • Persetujuan akan dicatat dengan timestamp untuk
          keperluan audit kepatuhan UU PDP.
        </Text>
      </View>
    </Screen>
  );
}

export const PRIVACY_POLICY_VERSION = '1.0';

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    marginBottom: 16,
  },
  section: {
    marginVertical: 12,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  h2: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: '#222',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '800',
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  dataItem: {
    marginBottom: 10,
  },
  dataLabel: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  actions: {
    marginTop: 24,
  },
  footnote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 14,
  },
});
