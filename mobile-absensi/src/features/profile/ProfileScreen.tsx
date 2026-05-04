import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../../components/AppCard';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import type { MobileUser } from '../../types';

export function ProfileScreen({ user }: { user: MobileUser }) {
  return (
    <Screen>
      <AppCard title="Profil Saya">
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
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
