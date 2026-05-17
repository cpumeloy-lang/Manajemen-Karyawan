import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { MonthlyCalendar, type DayCell } from './MonthlyCalendar';
import { colors } from '../theme/colors';
import { formatDateLongID } from '../utils/date';

interface DatePickerModalProps {
  visible: boolean;
  /** Tanggal awal (YYYY-MM-DD). Default: hari ini. */
  value?: string;
  /** Tanggal minimum yang boleh dipilih (YYYY-MM-DD). */
  minDate?: string;
  /** Tanggal maksimum yang boleh dipilih (YYYY-MM-DD). */
  maxDate?: string;
  title?: string;
  onConfirm: (dateISO: string) => void;
  onClose: () => void;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/**
 * Modal pemilih tanggal berbasis `MonthlyCalendar`. Tidak butuh dependency
 * native picker — cocok untuk Expo Go & build managed.
 *
 * Tanggal di luar `minDate`/`maxDate` tetap dirender tapi `onConfirm` akan
 * meng-clamp ke range yang diizinkan.
 */
export function DatePickerModal({
  visible,
  value,
  minDate,
  maxDate,
  title = 'Pilih Tanggal',
  onConfirm,
  onClose,
}: DatePickerModalProps) {
  const [selected, setSelected] = useState<string>(value || todayISO());

  // Sync state dengan prop saat modal dibuka ulang.
  React.useEffect(() => {
    if (visible) setSelected(value || todayISO());
  }, [visible, value]);

  const days = useMemo<DayCell[]>(() => {
    if (!selected) return [];
    return [{ date: selected, status: 'present' }];
  }, [selected]);

  const isOutOfRange = (iso: string): boolean => {
    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    return false;
  };

  const handleDayPress = (day: DayCell) => {
    if (isOutOfRange(day.date)) return;
    setSelected(day.date);
  };

  const initialCalendarDate = useMemo(() => {
    if (!selected) return new Date();
    const [y, m, d] = selected.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }, [selected]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeX}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.preview}>{formatDateLongID(selected)}</Text>

          <MonthlyCalendar
            days={days}
            initialDate={initialCalendarDate}
            onDayPress={handleDayPress}
          />

          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <AppButton title="Batal" variant="secondary" onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                title="Pilih"
                onPress={() => onConfirm(selected)}
                disabled={isOutOfRange(selected)}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  closeX: {
    fontSize: 20,
    color: colors.muted,
    paddingHorizontal: 4,
  },
  preview: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
});
