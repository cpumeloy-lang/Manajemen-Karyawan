import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { AttendanceTab } from '../types';

const navItems: Array<{ key: AttendanceTab; label: string; icon: string }> = [
  { key: 'dashboard', label: 'Beranda', icon: '🏠' },
  { key: 'attendance', label: 'Absensi', icon: '⏱️' },
  { key: 'history', label: 'Riwayat', icon: '📋' },
  { key: 'profile', label: 'Profil', icon: '👤' },
];

interface BottomNavProps {
  value: AttendanceTab;
  onChange: (tab: AttendanceTab) => void;
}

export function BottomNav({ value, onChange }: BottomNavProps) {
  return (
    <View style={styles.bar}>
      {navItems.map((item) => {
        const active = item.key === value;
        return (
          <Pressable key={item.key} onPress={() => onChange(item.key)} style={[styles.item, active && styles.itemActive]}>
            <Text style={[styles.icon, active && styles.iconActive]}>{item.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 14,
  },
  itemActive: {
    backgroundColor: '#e6f3f2',
  },
  icon: {
    fontSize: 18,
  },
  iconActive: {},
  label: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.primary,
  },
});
