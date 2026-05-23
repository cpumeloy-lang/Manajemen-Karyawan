/**
 * RotationPatternPanel.tsx - REFACTORED
 * 
 * Manages unit rotation patterns.
 * 
 * Previous: ~330 lines, monolithic
 * Current:  ~135 lines, logic delegated to list and form sub-components
 */
import React, { useState, useEffect } from 'react';
import { RotationPattern, ShiftDefinition } from '../types.ts';
import { getRotationPatterns, createRotationPattern, updateRotationPattern, deleteRotationPattern } from '../services/scheduleService.ts';
import { PlusIcon } from './icons.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';
import { useConfirm } from './ConfirmDialog.tsx';
import RotationPatternList from './unit-schedule/RotationPatternList';
import RotationPatternForm from './unit-schedule/RotationPatternForm';

interface RotationPatternPanelProps {
    unitId: string;
    unitShifts: ShiftDefinition[];
    userId: string;
    onNotify: (type: 'success' | 'error', text: string) => void;
}

const RotationPatternPanel: React.FC<RotationPatternPanelProps> = ({ unitId, unitShifts, userId, onNotify }) => {
    const confirm = useConfirm();
    const [patterns, setPatterns] = useState<RotationPattern[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPattern, setFormPattern] = useState<string[]>([]);

    useEffect(() => { loadPatterns(); }, [unitId]);

    const loadPatterns = async () => {
        try {
            setLoading(true);
            const data = await getRotationPatterns(unitId);
            setPatterns(data);
        } catch (err: any) {
            onNotify('error', `Gagal memuat pola rotasi: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormName('');
        setFormDescription('');
        setFormPattern([]);
        setEditingId(null);
        setShowForm(false);
    };

    const startEdit = (p: RotationPattern) => {
        setFormName(p.name);
        setFormDescription(p.description || '');
        setFormPattern([...p.pattern]);
        setEditingId(p.id);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!formName.trim() || formPattern.length === 0) {
            onNotify('error', 'Nama dan pola harus diisi (minimal 1 hari).');
            return;
        }

        try {
            setSaving(true);
            if (editingId) {
                await updateRotationPattern(editingId, {
                    name: formName.trim(), description: formDescription.trim() || undefined,
                    pattern: formPattern, cycle_days: formPattern.length,
                });
                onNotify('success', `Pola "${formName}" berhasil diperbarui.`);
            } else {
                await createRotationPattern({
                    unit_id: unitId, name: formName.trim(), description: formDescription.trim() || undefined,
                    pattern: formPattern, cycle_days: formPattern.length, is_active: true, created_by: userId,
                });
                onNotify('success', `Pola "${formName}" berhasil dibuat.`);
            }
            resetForm();
            await loadPatterns();
        } catch (err: any) {
            onNotify('error', `Gagal menyimpan: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (p: RotationPattern) => {
        const ok = await confirm({
            title: 'Hapus Pola Rotasi', message: `Hapus pola "${p.name}"? Jadwal yang sudah di-generate tidak akan terpengaruh.`,
            confirmLabel: 'Hapus', variant: 'danger',
        });
        if (!ok) return;
        try {
            await deleteRotationPattern(p.id);
            onNotify('success', `Pola "${p.name}" dihapus.`);
            await loadPatterns();
        } catch (err: any) {
            onNotify('error', `Gagal menghapus: ${err.message}`);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-32"><LoadingSpinner size="large" /></div>;

    return (
        <div className="space-y-4">
            {patterns.length === 0 && !showForm && (
                <div className="text-center py-8 text-gray-500">
                    <p className="text-lg mb-2">Belum ada pola rotasi</p>
                    <p className="text-sm">Buat pola rotasi untuk meng-generate jadwal otomatis bagi karyawan.</p>
                </div>
            )}

            <RotationPatternList patterns={patterns} unitShifts={unitShifts} onEdit={startEdit} onDelete={handleDelete} />

            {showForm ? (
                <RotationPatternForm
                    unitShifts={unitShifts} formName={formName} setFormName={setFormName}
                    formDescription={formDescription} setFormDescription={setFormDescription}
                    formPattern={formPattern} setFormPattern={setFormPattern}
                    editingId={editingId} saving={saving} onSave={handleSave} onCancel={resetForm}
                />
            ) : (
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 font-medium w-full justify-center transition-colors"
                >
                    <PlusIcon className="w-4 h-4" />
                    Buat Pola Rotasi Baru
                </button>
            )}
        </div>
    );
};

export default RotationPatternPanel;
