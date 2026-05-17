import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppButton } from '../../components/AppButton';
import { DatePickerModal } from '../../components/DatePickerModal';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonHistoryItem } from '../../components/Skeleton';
import {
  requestService,
  type LeaveRequest,
  type LeaveRequestDraft,
  type RequestStatus,
  type RequestType,
} from '../../services/requestService';
import { logMobileAudit } from '../../services/auditService';
import { storage } from '../../lib/storage';
import { colors } from '../../theme/colors';
import { formatDate, formatDateID } from '../../utils/date';
import { haptics } from '../../utils/haptics';
import type { MobileUser } from '../../types';

const TYPES: RequestType[] = ['Cuti', 'Izin', 'Overtime', 'Reimburse'];

const STATUS_STYLE: Record<RequestStatus, { bg: string; fg: string; label: string }> = {
  Pending: { bg: '#FEF3C7', fg: '#92400E', label: 'Menunggu' },
  Approved: { bg: '#DCFCE7', fg: '#166534', label: 'Disetujui' },
  Rejected: { bg: '#FEE2E2', fg: '#991B1B', label: 'Ditolak' },
};

const today = () => formatDate(new Date());
const daysBetween = (start: string, end: string): number => {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  const diffMs = e.getTime() - s.getTime();
  return Math.max(0, Math.floor(diffMs / 86400000) + 1);
};

interface RequestsScreenProps {
  user: MobileUser;
  /** Dipanggil setiap kali daftar pengajuan berubah (load/create/cancel). */
  onListChange?: (list: LeaveRequest[]) => void;
}

export function RequestsScreen({ user, onListChange }: RequestsScreenProps) {
  const [list, setList] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<RequestType>('Izin');
  const [startDate, setStartDate] = useState<string>(today());
  const [endDate, setEndDate] = useState<string>(today());
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<null | 'start' | 'end'>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  const draftKey = `hrms.mobile.requestDraft.${user.id}`;

  // Restore draft saat mount.
  useEffect(() => {
    let mounted = true;
    void storage
      .getJSON<
        | {
            type: RequestType;
            startDate: string;
            endDate: string;
            reason: string;
            amount: string;
          }
        | null
      >(draftKey, null)
      .then((d) => {
        if (!mounted || !d) {
          setDraftRestored(true);
          return;
        }
        if (d.type) setType(d.type);
        if (d.startDate) setStartDate(d.startDate);
        if (d.endDate) setEndDate(d.endDate);
        if (d.reason) setReason(d.reason);
        if (d.amount) setAmount(d.amount);
        // Buka form otomatis bila draft tampak terisi.
        if (d.reason?.trim() || (d.amount && d.amount !== '')) {
          setShowForm(true);
        }
        setDraftRestored(true);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft (debounced).
  useEffect(() => {
    if (!draftRestored) return;
    const t = setTimeout(() => {
      void storage.setJSON(draftKey, { type, startDate, endDate, reason, amount });
    }, 400);
    return () => clearTimeout(t);
  }, [draftRestored, draftKey, type, startDate, endDate, reason, amount]);

  const clearDraft = () => {
    void storage.remove(draftKey);
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await requestService.listForEmployee(user.id);
      setList(data);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat pengajuan');
    }
  }, [user.id]);

  // Notify parent setiap kali daftar berubah supaya badge counter sinkron.
  useEffect(() => {
    onListChange?.(list);
  }, [list, onListChange]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void load().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setType('Izin');
    setStartDate(today());
    setEndDate(today());
    setReason('');
    setAmount('');
    setFormError(null);
    clearDraft();
  };

  const handleCancel = (item: LeaveRequest) => {
    Alert.alert(
      'Batalkan pengajuan?',
      `${item.type} ${formatDateID(item.startDate)} akan dihapus permanen.`,
      [
        { text: 'Tutup', style: 'cancel' },
        {
          text: 'Batalkan',
          style: 'destructive',
          onPress: async () => {
            try {
              await requestService.cancel(item.id);
              setList((prev) => prev.filter((r) => r.id !== item.id));
              haptics.success();
            } catch (err: any) {
              haptics.error();
              Alert.alert('Gagal membatalkan', err?.message || 'Coba lagi nanti.');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    setFormError(null);
    const draft: LeaveRequestDraft = {
      type,
      startDate,
      endDate,
      reason: reason.trim(),
      amount: amount ? Number(amount) : undefined,
    };

    setSubmitting(true);
    try {
      const created = await requestService.create(user.id, draft);
      void logMobileAudit({
        user,
        action: 'REQUEST_SUBMIT',
        entityName: `${draft.type} ${draft.startDate}–${draft.endDate}`,
        metadata: {
          requestType: draft.type,
          startDate: draft.startDate,
          endDate: draft.endDate,
          amount: draft.amount,
        },
      });
      haptics.success();
      setList((prev) => [created, ...prev]);
      setShowForm(false);
      resetForm();
      Alert.alert('Pengajuan terkirim', 'Menunggu persetujuan Kepala Ruangan/HR.');
    } catch (err: any) {
      haptics.error();
      setFormError(err?.message || 'Gagal mengirim pengajuan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.skeletonWrap}>
        <Text style={styles.heading}>Pengajuan</Text>
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={list}
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
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heading}>Pengajuan</Text>
                <Text style={styles.subheading}>Cuti, izin, lembur, reimburse</Text>
              </View>
              <AppButton title="+ Ajukan" onPress={() => setShowForm(true)} />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="📝"
            title="Belum ada pengajuan"
            description="Ajukan cuti tahunan, izin, lembur, atau reimburse langsung dari sini."
          />
        }
        renderItem={({ item }) => {
          const statusStyle = STATUS_STYLE[item.status];
          const days = daysBetween(item.startDate, item.endDate);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardType}>{item.type}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusStyle.fg }]}>
                    {statusStyle.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardDate}>
                {formatDateID(item.startDate)}
                {item.startDate !== item.endDate ? ` – ${formatDateID(item.endDate)}` : ''}
              </Text>
              <Text style={styles.cardMeta}>{days} hari</Text>
              {item.reason ? <Text style={styles.cardReason}>{item.reason}</Text> : null}
              {item.amount ? (
                <Text style={styles.cardAmount}>
                  Nominal: Rp {item.amount.toLocaleString('id-ID')}
                </Text>
              ) : null}
              {item.status === 'Pending' ? (
                <Pressable onPress={() => handleCancel(item)} style={styles.cancelBtn} hitSlop={8}>
                  <Text style={styles.cancelBtnText}>Batalkan pengajuan</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pengajuan Baru</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={12}>
                <Text style={styles.closeX}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Jenis</Text>
            <View style={styles.typeGrid}>
              {TYPES.map((t) => {
                const active = type === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setType(t)}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                  >
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Tanggal Mulai</Text>
            <Pressable onPress={() => setPickerOpen('start')} style={styles.dateBtn}>
              <Text style={styles.dateBtnText}>{formatDateID(startDate)}</Text>
              <Text style={styles.dateBtnIcon}>📅</Text>
            </Pressable>

            <Text style={styles.label}>Tanggal Selesai</Text>
            <Pressable onPress={() => setPickerOpen('end')} style={styles.dateBtn}>
              <Text style={styles.dateBtnText}>{formatDateID(endDate)}</Text>
              <Text style={styles.dateBtnIcon}>📅</Text>
            </Pressable>

            {type === 'Reimburse' ? (
              <>
                <Text style={styles.label}>Nominal (Rp)</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="250000"
                  style={styles.input}
                  keyboardType="number-pad"
                />
              </>
            ) : null}

            <Text style={styles.label}>Alasan</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Jelaskan kebutuhan secara singkat"
              style={[styles.input, styles.multiline]}
              multiline
              numberOfLines={3}
            />

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <AppButton title="Batal" variant="secondary" onPress={() => setShowForm(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton title="Kirim" onPress={handleSubmit} loading={submitting} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={pickerOpen !== null}
        value={pickerOpen === 'end' ? endDate : startDate}
        title={pickerOpen === 'end' ? 'Tanggal Selesai' : 'Tanggal Mulai'}
        minDate={pickerOpen === 'end' ? startDate : undefined}
        onConfirm={(iso) => {
          if (pickerOpen === 'start') {
            setStartDate(iso);
            // Jaga agar end >= start.
            if (endDate < iso) setEndDate(iso);
          } else if (pickerOpen === 'end') {
            setEndDate(iso);
          }
          setPickerOpen(null);
        }}
        onClose={() => setPickerOpen(null)}
      />
    </>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  subheading: {
    fontSize: 13,
    color: colors.muted,
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
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardType: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  cardDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  cardReason: {
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
    lineHeight: 18,
  },
  cardAmount: {
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
    fontWeight: '700',
  },
  cancelBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    gap: 4,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  closeX: {
    fontSize: 20,
    color: colors.muted,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  dateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  dateBtnIcon: {
    fontSize: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  typeChipTextActive: {
    color: '#fff',
  },
  formError: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});
