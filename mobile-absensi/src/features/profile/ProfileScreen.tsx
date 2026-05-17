import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { useAuth } from '../auth/AuthContext';
import { authService } from '../../services/authService';
import { changeAvatar } from '../../services/avatarService';
import { ReminderSettings } from './ReminderSettings';
import { haptics } from '../../utils/haptics';
import { colors } from '../../theme/colors';
import type { MobileUser } from '../../types';

interface ProfileScreenProps {
  user: MobileUser;
  onGoDevice?: () => void;
  onGoFaceEnrollment?: () => void;
}

export function ProfileScreen({ user, onGoDevice, onGoFaceEnrollment }: ProfileScreenProps) {
  const { refreshProfile, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState<string>(user.telepon || '');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const initials = (user.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  const doChangeAvatar = async (source: 'camera' | 'library') => {
    if (!user.employeeId) {
      Alert.alert('Tidak bisa', 'ID karyawan tidak tersedia.');
      return;
    }
    setAvatarUploading(true);
    try {
      const url = await changeAvatar(user.employeeId, source);
      if (url) {
        await refreshProfile();
        haptics.success();
      }
    } catch (err: any) {
      haptics.error();
      Alert.alert('Gagal mengubah foto', err?.message || 'Coba lagi nanti.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarPress = () => {
    if (avatarUploading) return;
    Alert.alert('Foto Profil', 'Pilih sumber foto', [
      { text: 'Kamera', onPress: () => doChangeAvatar('camera') },
      { text: 'Galeri', onPress: () => doChangeAvatar('library') },
      { text: 'Batal', style: 'cancel' },
    ]);
  };

  // Sync local draft saat user data berubah (mis. setelah refresh).
  useEffect(() => {
    if (!phoneEditing) setPhoneDraft(user.telepon || '');
  }, [user.telepon, phoneEditing]);

  const handleSavePhone = async () => {
    setPhoneSaving(true);
    try {
      await authService.updateContactInfo({ telepon: phoneDraft });
      await refreshProfile();
      haptics.success();
      setPhoneEditing(false);
    } catch (err: any) {
      haptics.error();
      Alert.alert('Gagal menyimpan', err?.message || 'Coba lagi nanti.');
    } finally {
      setPhoneSaving(false);
    }
  };

  useEffect(() => {
    // Auto-refresh saat layar pertama dibuka agar data karyawan tidak stale.
    void refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <AppCard title="Profil Saya">
        <View style={styles.avatarRow}>
          <Pressable onPress={handleAvatarPress} style={styles.avatarWrap}>
            {user.foto ? (
              <Image source={{ uri: user.foto }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>{initials || '?'}</Text>
              </View>
            )}
            {avatarUploading ? (
              <View style={styles.avatarLoading}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarBadgeText}>✎</Text>
              </View>
            )}
          </Pressable>
          <View style={styles.avatarMeta}>
            <Text style={styles.avatarName}>{user.name}</Text>
            <Text style={styles.avatarSub}>{user.jabatan || 'Karyawan'}</Text>
            <Pressable onPress={handleAvatarPress} disabled={avatarUploading}>
              <Text style={styles.avatarLink}>
                {avatarUploading ? 'Mengunggah…' : 'Ubah foto'}
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.profileGrid}>
          <View style={styles.profileItem}>
            <Text style={styles.label}>Nama</Text>
            <Text style={styles.value}>{user.name}</Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.label}>NIK</Text>
            <Text style={styles.value}>{user.nik || '-'}</Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.label}>Jabatan</Text>
            <Text style={styles.value}>{user.jabatan || '-'}</Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.label}>Departemen</Text>
            <Text style={styles.value}>{user.departemen || '-'}</Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.label}>Unit</Text>
            <Text style={styles.value}>{user.unitName || '-'}</Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.label}>Shift</Text>
            <Text style={styles.value}>{user.shift || '-'}</Text>
          </View>
        </View>
      </AppCard>

      <AppCard title="Kontak">
        <Text style={styles.label}>Nomor Telepon</Text>
        {phoneEditing ? (
          <View style={styles.phoneEditRow}>
            <TextInput
              value={phoneDraft}
              onChangeText={setPhoneDraft}
              placeholder="+62 812-XXXX-XXXX"
              keyboardType="phone-pad"
              style={styles.phoneInput}
              autoFocus
            />
            <View style={styles.phoneActions}>
              <AppButton
                title="Batal"
                variant="secondary"
                onPress={() => {
                  setPhoneDraft(user.telepon || '');
                  setPhoneEditing(false);
                }}
              />
              <AppButton title="Simpan" onPress={handleSavePhone} loading={phoneSaving} />
            </View>
          </View>
        ) : (
          <View style={styles.phoneViewRow}>
            <Text style={styles.phoneValue}>{user.telepon || 'Belum diatur'}</Text>
            <AppButton title="Ubah" variant="secondary" onPress={() => setPhoneEditing(true)} />
          </View>
        )}
      </AppCard>

      <ReminderSettings />

      <AppCard title="Pengaturan">
        <View style={styles.actions}>
          {onGoFaceEnrollment ? (
            <AppButton title="Daftar Wajah" onPress={onGoFaceEnrollment} variant="secondary" />
          ) : null}
          {onGoDevice ? (
            <AppButton title="Kelola Perangkat" onPress={onGoDevice} variant="secondary" />
          ) : null}
          <AppButton title="Keluar" onPress={logout} variant="secondary" />
        </View>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  actions: {
    gap: 12,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  profileItem: {
    flexBasis: '48%',
    minWidth: 150,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f7fcfb',
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  phoneViewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  phoneValue: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  phoneEditRow: {
    gap: 10,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  phoneActions: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e6f1ee',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 24,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  avatarLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMeta: {
    flex: 1,
    minWidth: 0,
  },
  avatarName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  avatarSub: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 13,
  },
  avatarLink: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: 6,
    fontSize: 13,
  },
});
