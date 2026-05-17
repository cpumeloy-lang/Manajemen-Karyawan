import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { Screen } from '../../components/Screen';
import { authService } from '../../services/authService';
import { colors } from '../../theme/colors';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
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

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Isi dulu email Anda untuk reset password.');
      return;
    }
    if (!isEmailValid(normalizedEmail)) {
      setError('Format email tidak valid.');
      return;
    }

    setResetting(true);
    setError(null);
    try {
      await authService.requestPasswordReset(normalizedEmail);
      Alert.alert(
        'Email reset terkirim',
        `Kami telah mengirim link reset password ke ${normalizedEmail}. Silakan cek inbox/spam.`
      );
    } catch (err: any) {
      setError(err?.message || 'Gagal mengirim email reset.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>HRMS Absensi</Text>
        <Text style={styles.title}>Check-in cepat, aman, dan siap dipakai di lapangan.</Text>
        <Text style={styles.subtitle}>Aplikasi mobile khusus karyawan. Web tetap untuk HR dan admin.</Text>
      </View>

      <AppCard title="Masuk Karyawan" style={styles.loginCard}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          style={styles.input}
        />
        <View style={styles.passwordWrap}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={!showPassword}
            autoComplete="password"
            style={[styles.input, styles.passwordInput]}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            style={styles.toggleBtn}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            hitSlop={8}
          >
            <Text style={styles.toggleText}>{showPassword ? 'Sembunyikan' : 'Tampilkan'}</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton title="Masuk" onPress={submit} loading={loading} />
        <Pressable
          onPress={handleForgotPassword}
          disabled={resetting}
          style={styles.forgotWrap}
          accessibilityRole="button"
        >
          <Text style={styles.forgotText}>
            {resetting ? 'Mengirim email reset...' : 'Lupa password?'}
          </Text>
        </Pressable>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 8,
    paddingVertical: 8,
    marginBottom: 18,
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
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 14,
  },
  loginCard: {
    paddingBottom: 22,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: 12,
  },
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 96,
  },
  toggleBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 14,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  forgotWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
