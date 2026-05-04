import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../../components/AppCard';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import type { AttendanceRecord } from '../../types';

export function AttendanceHistoryScreen({ records }: { records: AttendanceRecord[] }) {
  return (
    <Screen>
      <AppCard title="Riwayat Absensi">
        {records.length === 0 ? (
          <Text style={styles.empty}>Belum ada data absensi.</Text>
        ) : (
          records.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.rowText}>
                <Text style={styles.date}>{item.tanggal}</Text>
                <Text style={styles.meta}>{item.clockIn} - {item.clockOut || '-'}</Text>
                <Text style={styles.location}>{item.location}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: item.isLate ? '#fff2f0' : '#effaf4' }]}>
                <Text style={[styles.badgeText, { color: item.isLate ? colors.danger : colors.success }]}>
                  {item.isLate ? 'Terlambat' : 'Tepat'}
                </Text>
              </View>
            </View>
          ))
        )}
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: colors.muted,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#f7fcfb',
    marginBottom: 12,
  },
  rowText: {
    flex: 1,
  },
  date: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  meta: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 14,
  },
  location: {
    color: colors.primary,
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeText: {
    fontWeight: '800',
    fontSize: 12,
  },
});
