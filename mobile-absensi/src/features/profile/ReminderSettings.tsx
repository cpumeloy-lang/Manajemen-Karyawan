import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { colors } from '../../theme/colors';
import { haptics } from '../../utils/haptics';
import {
  applyReminderPrefs,
  getReminderPrefs,
  reminderDefaults,
  type ReminderPrefs,
} from '../../services/reminderService';

const pad2 = (n: number) => String(n).padStart(2, '0');

const clampHour = (raw: string): number => {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(23, n));
};

const clampMinute = (raw: string): number => {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(59, n));
};

interface TimeFieldProps {
  label: string;
  hour: number;
  minute: number;
  onChange: (h: number, m: number) => void;
  disabled?: boolean;
}

function TimeField({ label, hour, minute, onChange, disabled }: TimeFieldProps) {
  const [hStr, setHStr] = useState(pad2(hour));
  const [mStr, setMStr] = useState(pad2(minute));

  useEffect(() => {
    setHStr(pad2(hour));
    setMStr(pad2(minute));
  }, [hour, minute]);

  return (
    <View style={styles.timeRow}>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
      <View style={styles.timeInputs}>
        <TextInput
          value={hStr}
          onChangeText={setHStr}
          onBlur={() => {
            const h = clampHour(hStr);
            setHStr(pad2(h));
            onChange(h, minute);
          }}
          keyboardType="number-pad"
          maxLength={2}
          editable={!disabled}
          style={[styles.timeInput, disabled && styles.timeInputDisabled]}
          placeholder="HH"
        />
        <Text style={styles.colon}>:</Text>
        <TextInput
          value={mStr}
          onChangeText={setMStr}
          onBlur={() => {
            const m = clampMinute(mStr);
            setMStr(pad2(m));
            onChange(hour, m);
          }}
          keyboardType="number-pad"
          maxLength={2}
          editable={!disabled}
          style={[styles.timeInput, disabled && styles.timeInputDisabled]}
          placeholder="MM"
        />
      </View>
    </View>
  );
}

export function ReminderSettings() {
  const [prefs, setPrefs] = useState<ReminderPrefs>(reminderDefaults);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getReminderPrefs().then((p) => {
      if (mounted) {
        setPrefs(p);
        setLoaded(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await applyReminderPrefs(prefs);
      haptics.success();
      Alert.alert(
        'Tersimpan',
        prefs.enabled
          ? 'Pengingat aktif. Notifikasi akan muncul setiap hari.'
          : 'Pengingat dinonaktifkan.'
      );
    } catch (err: any) {
      haptics.error();
      Alert.alert('Gagal menyimpan', err?.message || 'Coba lagi nanti.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <AppCard title="Pengingat Absensi">
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Aktifkan pengingat harian</Text>
          <Text style={styles.hint}>Notifikasi muncul di jam yang Anda atur.</Text>
        </View>
        <Switch
          value={prefs.enabled}
          onValueChange={(v) => setPrefs({ ...prefs, enabled: v })}
          trackColor={{ false: '#cbd5d2', true: colors.primary }}
        />
      </View>

      <TimeField
        label="Jam Check-in"
        hour={prefs.checkInHour}
        minute={prefs.checkInMinute}
        onChange={(h, m) => setPrefs({ ...prefs, checkInHour: h, checkInMinute: m })}
        disabled={!prefs.enabled}
      />
      <TimeField
        label="Jam Check-out"
        hour={prefs.checkOutHour}
        minute={prefs.checkOutMinute}
        onChange={(h, m) => setPrefs({ ...prefs, checkOutHour: h, checkOutMinute: m })}
        disabled={!prefs.enabled}
      />

      <View style={{ marginTop: 4 }}>
        <AppButton title="Simpan Pengingat" onPress={handleSave} loading={saving} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  labelDisabled: {
    color: colors.muted,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeInput: {
    width: 56,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 16,
  },
  timeInputDisabled: {
    backgroundColor: '#f1f4f3',
    color: colors.muted,
  },
  colon: {
    fontWeight: '900',
    color: colors.text,
    fontSize: 18,
  },
});
