import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface SyncBannerProps {
  isOnline: boolean;
  pendingCount: number;
}

/**
 * Banner status koneksi + antrian sync. Hanya tampil jika ada hal yang
 * perlu diketahui user (offline, atau ada antrian menunggu sync).
 */
export function SyncBanner({ isOnline, pendingCount }: SyncBannerProps) {
  if (isOnline && pendingCount === 0) return null;

  if (!isOnline) {
    return (
      <View style={[styles.banner, styles.offline]}>
        <Text style={styles.icon}>📡</Text>
        <Text style={styles.text}>
          Mode offline aktif{pendingCount > 0 ? ` · ${pendingCount} aksi menunggu sync` : ''}
        </Text>
      </View>
    );
  }

  // Online dengan antrian — sedang/akan di-flush.
  return (
    <View style={[styles.banner, styles.syncing]}>
      <Text style={styles.icon}>🔄</Text>
      <Text style={styles.text}>
        Mengirim {pendingCount} aksi tertunda...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  offline: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
  },
  syncing: {
    backgroundColor: '#DBEAFE',
    borderBottomWidth: 1,
    borderBottomColor: '#3B82F6',
  },
  icon: {
    fontSize: 14,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
});
