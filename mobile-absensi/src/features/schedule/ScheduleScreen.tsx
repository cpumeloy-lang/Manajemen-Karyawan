import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonHistoryItem } from '../../components/Skeleton';
import { scheduleService, type EmployeeSchedule } from '../../services/scheduleService';
import { colors } from '../../theme/colors';
import { formatDateID } from '../../utils/date';
import type { MobileUser } from '../../types';

const formatTime = (value?: string) => {
  if (!value) return '-';
  // Backend kirim "HH:MM:SS" — potong ke "HH:MM".
  return value.length >= 5 ? value.slice(0, 5) : value;
};

const STATUS_LABEL: Record<EmployeeSchedule['status'], string> = {
  draft: 'Draft',
  published: 'Aktif',
  swapped: 'Tukar Shift',
  override: 'Override',
  cancelled: 'Dibatalkan',
};

export function ScheduleScreen({ user }: { user: MobileUser }) {
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const result = await scheduleService.listForEmployee(user.id);
      setSchedules(result);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat jadwal');
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void load().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.skeletonWrap}>
        <Text style={styles.heading}>Jadwal Shift Saya</Text>
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
      </View>
    );
  }

  return (
    <FlatList
      data={schedules}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ListHeaderComponent={
        <View>
          <Text style={styles.heading}>Jadwal Shift Saya</Text>
          <Text style={styles.subheading}>14 hari ke depan</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="🗓️"
          title="Belum ada jadwal terbit"
          description="Hubungi Kepala Ruangan jika jadwal seharusnya sudah dipublikasi."
        />
      }
      renderItem={({ item }) => (
        <View
          style={[
            styles.card,
            item.isOffDay && styles.cardOff,
            item.status === 'swapped' && styles.cardSwap,
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardDate}>{formatDateID(item.scheduleDate)}</Text>
            <View
              style={[
                styles.statusBadge,
                item.status === 'published' ? styles.statusPublished : styles.statusOther,
              ]}
            >
              <Text style={styles.statusBadgeText}>{STATUS_LABEL[item.status]}</Text>
            </View>
          </View>
          {item.isOffDay ? (
            <Text style={styles.offText}>Hari Libur</Text>
          ) : (
            <View>
              <Text style={styles.shiftName}>{item.shiftName}</Text>
              <Text style={styles.shiftTime}>
                {formatTime(item.shiftStartTime)} – {formatTime(item.shiftEndTime)}
              </Text>
            </View>
          )}
        </View>
      )}
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
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 16,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#f7fcfb',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardOff: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  cardSwap: {
    backgroundColor: '#EDE9FE',
    borderColor: '#8B5CF6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPublished: {
    backgroundColor: '#DCFCE7',
  },
  statusOther: {
    backgroundColor: '#E5E7EB',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },
  shiftName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  shiftTime: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  offText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
});
