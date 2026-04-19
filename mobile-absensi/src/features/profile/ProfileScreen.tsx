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
        <View style={styles.section}>
          <Text style={styles.label}>Nama</Text>
          <Text style={styles.value}>{user.name}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>NIK</Text>
          <Text style={styles.value}>{user.nik || '-'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Jabatan</Text>
          <Text style={styles.value}>{user.jabatan || '-'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Departemen</Text>
          <Text style={styles.value}>{user.departemen || '-'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Unit</Text>
          <Text style={styles.value}>{user.unitName || '-'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Shift</Text>
          <Text style={styles.value}>{user.shift || '-'}</Text>
        </View>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 2,
  },
  value: {
    color: colors.text,
    fontWeight: '700',
  },
});
