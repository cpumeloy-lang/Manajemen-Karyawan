import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { AttendanceTab } from '../types';

const navItems: Array<{ key: AttendanceTab; label: string; icon: string }> = [
  { key: 'dashboard', label: 'Beranda', icon: '🏠' },
  { key: 'attendance', label: 'Absensi', icon: '⏱️' },
  { key: 'history', label: 'Riwayat', icon: '📋' },
  { key: 'device', label: 'Perangkat', icon: '🔐' },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 16,
  },
  itemActive: {
    backgroundColor: '#ecf6f4',
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.primary,
  },
});
