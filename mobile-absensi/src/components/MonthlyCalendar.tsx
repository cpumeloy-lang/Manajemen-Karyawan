import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

/**
 * Kalender bulanan ringan (tanpa dependency) untuk menampilkan status
 * absensi harian sebagai heatmap warna.
 */

export type DayStatus = 'present' | 'late' | 'absent' | 'off' | 'leave' | 'none';

export interface DayCell {
  date: string; // YYYY-MM-DD
  status: DayStatus;
  label?: string;
}

interface MonthlyCalendarProps {
  /** Data per-tanggal. Tanggal yang tidak ada dianggap `none`. */
  days: DayCell[];
  /** Bulan & tahun awal yang ditampilkan. Default: bulan berjalan. */
  initialDate?: Date;
  onDayPress?: (day: DayCell) => void;
}

const MONTHS_ID_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DOW_ID_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const STATUS_COLOR: Record<DayStatus, { bg: string; fg: string }> = {
  present: { bg: '#DCFCE7', fg: '#166534' },
  late: { bg: '#FEF3C7', fg: '#92400E' },
  absent: { bg: '#FEE2E2', fg: '#991B1B' },
  off: { bg: '#E5E7EB', fg: '#374151' },
  leave: { bg: '#DBEAFE', fg: '#1E40AF' },
  none: { bg: 'transparent', fg: colors.muted },
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export function MonthlyCalendar({ days, initialDate, onDayPress }: MonthlyCalendarProps) {
  const [cursor, setCursor] = useState<Date>(() => {
    const base = initialDate ? new Date(initialDate) : new Date();
    base.setDate(1);
    base.setHours(0, 0, 0, 0);
    return base;
  });

  const cellsByDate = useMemo(() => {
    const map = new Map<string, DayCell>();
    days.forEach((d) => map.set(d.date, d));
    return map;
  }, [days]);

  const grid = useMemo(() => {
    const first = new Date(cursor);
    first.setDate(1);
    const offset = first.getDay(); // 0 = Sunday
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

    const cells: Array<DayCell | null> = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      const key = toKey(date);
      cells.push(
        cellsByDate.get(key) || { date: key, status: 'none' }
      );
    }
    // Pad to multiple of 7 for clean grid.
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor, cellsByDate]);

  const goPrev = () => {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() - 1);
    setCursor(next);
  };
  const goNext = () => {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    setCursor(next);
  };

  const todayKey = toKey(new Date());

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goPrev} hitSlop={12} style={styles.navBtn}>
          <Text style={styles.navBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>
          {MONTHS_ID_LONG[cursor.getMonth()]} {cursor.getFullYear()}
        </Text>
        <Pressable onPress={goNext} hitSlop={12} style={styles.navBtn}>
          <Text style={styles.navBtnText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        {DOW_ID_SHORT.map((dow) => (
          <Text key={dow} style={styles.dow}>{dow}</Text>
        ))}
      </View>

      <View style={styles.gridWrap}>
        {grid.map((cell, idx) => {
          if (!cell) {
            return <View key={`blank-${idx}`} style={styles.cell} />;
          }
          const style = STATUS_COLOR[cell.status];
          const dayNumber = Number(cell.date.slice(8, 10));
          const isToday = cell.date === todayKey;
          return (
            <Pressable
              key={cell.date}
              onPress={() => onDayPress?.(cell)}
              style={[
                styles.cell,
                styles.cellFilled,
                { backgroundColor: style.bg },
                isToday && styles.cellToday,
              ]}
            >
              <Text style={[styles.cellText, { color: style.fg }]}>{dayNumber}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <Legend color={STATUS_COLOR.present.bg} label="Hadir" />
        <Legend color={STATUS_COLOR.late.bg} label="Terlambat" />
        <Legend color={STATUS_COLOR.absent.bg} label="Absen" />
        <Legend color={STATUS_COLOR.leave.bg} label="Izin/Cuti" />
        <Legend color={STATUS_COLOR.off.bg} label="Libur" />
      </View>
    </View>
  );
}

const Legend = ({ color, label }: { color: string; label: string }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#ecf6f4',
  },
  navBtnText: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dow: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    padding: 4,
  },
  cellToday: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 999,
  },
  cellText: {
    fontSize: 13,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
});
