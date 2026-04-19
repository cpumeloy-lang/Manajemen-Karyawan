import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmailValid = (value: string) => /.+@.+\..+/.test(value.trim());

  const submit = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError('Email wajib diisi.');
      return;
    }

    if (!isEmailValid(normalizedEmail)) {
      setError('Format email tidak valid.');
      return;
    }

    if (!password.trim()) {
      setError('Password wajib diisi.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onLogin(normalizedEmail, password);
    } catch (err: any) {
      setError(err?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>HRMS Absensi</Text>
        <Text style={styles.title}>Check-in cepat, aman, dan siap dipakai di lapangan.</Text>
        <Text style={styles.subtitle}>Aplikasi mobile khusus karyawan. Web tetap untuk HR dan admin.</Text>
      </View>

      <AppCard title="Masuk Karyawan">
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          autoComplete="password"
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton title="Masuk" onPress={submit} loading={loading} />
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 8,
    paddingVertical: 8,
  },
  kicker: {
    color: colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
});
