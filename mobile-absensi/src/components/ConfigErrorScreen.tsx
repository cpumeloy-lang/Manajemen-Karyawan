import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface ConfigErrorScreenProps {
  reason: string;
}

/**
 * Layar yang ditampilkan ketika konfigurasi runtime (Supabase env, dll) tidak valid.
 * Lebih bermanfaat dibanding crash silent atau error cryptic dari API call.
 */
export function ConfigErrorScreen({ reason }: ConfigErrorScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.icon}>⚙️</Text>
      <Text style={styles.title}>Konfigurasi Aplikasi Belum Lengkap</Text>
      <Text style={styles.subtitle}>
        Aplikasi tidak dapat terhubung ke server. Periksa konfigurasi berikut:
      </Text>

      <View style={styles.box}>
        <Text style={styles.boxText}>{reason}</Text>
      </View>

      <Text style={styles.note}>
        Jika Anda pengguna akhir, hubungi administrator IT untuk memperbaiki konfigurasi build.
        Jika Anda developer, pastikan file <Text style={styles.code}>.env</Text> sudah berisi
        kredensial Supabase yang valid lalu rebuild aplikasi.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  box: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
    width: '100%',
  },
  boxText: {
    fontSize: 13,
    color: '#92400E',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  note: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: colors.border,
    paddingHorizontal: 4,
  },
});
