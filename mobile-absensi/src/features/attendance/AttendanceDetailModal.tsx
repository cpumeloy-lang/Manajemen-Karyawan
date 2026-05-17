import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { formatDateLongID } from '../../utils/date';
import type { AttendanceRecord } from '../../types';

interface AttendanceDetailModalProps {
  record: AttendanceRecord | null;
  onClose: () => void;
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

/** Modal detail absensi satu hari. Read-only; untuk edit via HR web. */
export function AttendanceDetailModal({ record, onClose }: AttendanceDetailModalProps) {
  const visible = Boolean(record);
  if (!record) {
    return (
      <Modal visible={false} onRequestClose={onClose} transparent animationType="fade">
        <View />
      </Modal>
    );
  }

  const statusColor = record.isLate ? colors.danger : colors.success;
  const statusLabel = record.isLate ? 'Terlambat' : 'Tepat Waktu';

  return (
    <Modal visible={visible} onRequestClose={onClose} transparent animationType="slide">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Detail Absensi</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeX}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.dateText}>{formatDateLongID(record.tanggal)}</Text>

          <View style={[styles.statusPill, { backgroundColor: record.isLate ? '#fff2f0' : '#effaf4' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          <View style={styles.section}>
            <Row label="Check-in" value={record.clockIn || '-'} />
            <Row label="Check-out" value={record.clockOut || '-'} />
            <Row label="Lokasi" value={record.location || '-'} />
            {record.latitude !== undefined && record.longitude !== undefined ? (
              <Row
                label="Koordinat"
                value={`${record.latitude.toFixed(5)}, ${record.longitude.toFixed(5)}`}
              />
            ) : null}
            {record.status ? <Row label="Status" value={record.status} /> : null}
            {record.source ? <Row label="Sumber" value={record.source} /> : null}
            {record.biometricType ? (
              <Row label="Biometrik" value={record.biometricType} />
            ) : null}
            {typeof record.faceMatchScoreCheckIn === 'number' ? (
              <Row
                label="Skor Wajah (In)"
                value={`${(record.faceMatchScoreCheckIn * 100).toFixed(1)}%`}
              />
            ) : null}
            {typeof record.faceMatchScoreCheckOut === 'number' ? (
              <Row
                label="Skor Wajah (Out)"
                value={`${(record.faceMatchScoreCheckOut * 100).toFixed(1)}%`}
              />
            ) : null}
            {typeof record.overtimeHours === 'number' && record.overtimeHours > 0 ? (
              <Row label="Lembur" value={`${record.overtimeHours.toFixed(1)} jam`} />
            ) : null}
            {record.notes ? <Row label="Catatan" value={record.notes} /> : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  dateText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 12,
    fontWeight: '600',
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
    flex: 0.8,
  },
  rowValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    flex: 1.2,
    textAlign: 'right',
  },
});
