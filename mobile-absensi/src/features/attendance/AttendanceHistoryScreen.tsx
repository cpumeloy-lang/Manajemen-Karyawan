import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonHistoryItem } from '../../components/Skeleton';
import { MonthlyCalendar, type DayCell, type DayStatus } from '../../components/MonthlyCalendar';
import { AttendanceDetailModal } from './AttendanceDetailModal';
import { shareAttendanceCsv } from '../../services/exportService';
import { colors } from '../../theme/colors';
import { formatDateID } from '../../utils/date';
import type { AttendanceRecord } from '../../types';

/** Ubah satu record menjadi status harian untuk kalender. */
const statusFromRecord = (r: AttendanceRecord): DayStatus => {
  if (r.status === 'Cuti' || r.status === 'Sakit') return 'leave';
  if (r.status === 'Absen') return 'absent';
  if (r.isLate) return 'late';
  return 'present';
};

type RangeFilter = 'month' | '30d' | 'all';
type StatusFilter = 'all' | 'present' | 'late' | 'leave' | 'absent';

const RANGE_OPTIONS: { key: RangeFilter; label: string }[] = [
  { key: 'month', label: 'Bulan ini' },
  { key: '30d', label: '30 hari' },
  { key: 'all', label: 'Semua' },
];

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'present', label: 'Tepat' },
  { key: 'late', label: 'Terlambat' },
  { key: 'leave', label: 'Cuti/Sakit' },
  { key: 'absent', label: 'Absen' },
];

/** Cek apakah record termasuk dalam rentang yang dipilih. */
function inRange(dateStr: string, range: RangeFilter): boolean {
  if (range === 'all') return true;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  if (range === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  // 30d
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  return d >= cutoff;
}

function matchStatus(r: AttendanceRecord, status: StatusFilter): boolean {
  if (status === 'all') return true;
  return statusFromRecord(r) === status;
}

interface AttendanceHistoryScreenProps {
  records: AttendanceRecord[];
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export function AttendanceHistoryScreen({ records, onRefresh, loading }: AttendanceHistoryScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const [range, setRange] = useState<RangeFilter>('month');
  const [status, setStatus] = useState<StatusFilter>('all');

  const filtered = useMemo(
    () => records.filter((r) => inRange(r.tanggal, range) && matchStatus(r, status)),
    [records, range, status]
  );

  const calendarDays = useMemo<DayCell[]>(
    () => filtered.map((r) => ({ date: r.tanggal, status: statusFromRecord(r) })),
    [filtered]
  );

  const handleDayPress = (day: DayCell) => {
    const match = filtered.find((r) => r.tanggal === day.date);
    if (match) setSelected(match);
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && records.length === 0) {
    return (
      <View style={styles.skeletonWrap}>
        <Text style={styles.heading}>Riwayat Absensi</Text>
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View>
          <View style={styles.headerRow}>
            <Text style={styles.heading}>Riwayat Absensi</Text>
            <Pressable
              onPress={async () => {
                try {
                  const rangeLabel = RANGE_OPTIONS.find((o) => o.key === range)?.label;
                  await shareAttendanceCsv(filtered, { rangeLabel });
                } catch (err: any) {
                  Alert.alert('Tidak bisa export', err?.message || 'Coba lagi nanti.');
                }
              }}
              style={styles.exportBtn}
              disabled={filtered.length === 0}
            >
              <Text style={[styles.exportText, filtered.length === 0 && styles.exportTextDisabled]}>↑ Export</Text>
            </Pressable>
          </View>

          <Text style={styles.filterLabel}>Rentang</Text>
          <View style={styles.chipsRow}>
            {RANGE_OPTIONS.map((opt) => {
              const active = range === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setRange(opt.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.chipsRow}>
            {STATUS_OPTIONS.map((opt) => {
              const active = status === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setStatus(opt.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.calendarWrap}>
            <MonthlyCalendar days={calendarDays} onDayPress={handleDayPress} />
          </View>
          <Text style={styles.subHeading}>Daftar ({filtered.length})</Text>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="📅"
          title="Belum ada riwayat absensi"
          description="Riwayat akan muncul di sini setelah Anda melakukan check-in pertama."
        />
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => setSelected(item)} style={styles.historyItem}>
          <View style={styles.rowText}>
            <Text style={styles.date}>{formatDateID(item.tanggal)}</Text>
            <Text style={styles.meta}>{item.clockIn} - {item.clockOut || '-'}</Text>
            <Text style={styles.location}>{item.location}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: item.isLate ? '#fff2f0' : '#effaf4' }]}>
            <Text style={[styles.badgeText, { color: item.isLate ? colors.danger : colors.success }]}>
              {item.isLate ? 'Terlambat' : 'Tepat'}
            </Text>
          </View>
        </Pressable>
      )}
      ListFooterComponent={
        <AttendanceDetailModal record={selected} onClose={() => setSelected(null)} />
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  skeletonWrap: {
    padding: 16,
    flex: 1,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  calendarWrap: {
    marginBottom: 16,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 8,
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
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 6,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#eef2f5',
    borderWidth: 1,
    borderColor: '#e0e6ea',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  chipTextActive: {
    color: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exportBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#ecf6f4',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  exportText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  exportTextDisabled: {
    color: colors.muted,
  },
});
