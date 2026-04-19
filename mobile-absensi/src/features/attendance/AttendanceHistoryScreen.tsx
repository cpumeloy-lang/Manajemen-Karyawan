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
            <View key={item.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.date}>{item.tanggal}</Text>
                <Text style={styles.meta}>{item.clockIn} - {item.clockOut || '-'}</Text>
                <Text style={styles.location}>{item.location}</Text>
              </View>
              <Text style={[styles.badge, { color: item.isLate ? colors.warning : colors.success }]}>
                {item.isLate ? 'Terlambat' : 'Tepat'}
              </Text>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: {
    flex: 1,
  },
  date: {
    color: colors.text,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    marginTop: 2,
  },
  location: {
    color: colors.primary,
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    fontWeight: '800',
  },
});
