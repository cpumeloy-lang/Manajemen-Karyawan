/**
 * OrganizationSettings.tsx - REFACTORED
 * 
 * Organization settings with tabs for Departments, Positions, Work Units.
 * 
 * Previous: ~463 lines with 3 nearly identical CRUD tab implementations
 * Current:  ~80 lines using generic EntityCrudTab component
 */
import React, { useState } from 'react';
import { WorkUnit, Department, Position } from '../types.ts';
import EntityCrudTab from './organization/EntityCrudTab';

interface OrganizationSettingsProps {
    workUnits: WorkUnit[];
    departments: Department[];
    positions: Position[];
    onSaveWorkUnit: (unit: WorkUnit) => void;
    onDeleteWorkUnit: (id: string) => void;
    onSaveDepartment: (dept: Department) => void;
    onDeleteDepartment: (id: string) => void;
    onSavePosition: (position: Position) => void;
    onDeletePosition: (id: string) => void;
}

type TabKey = 'units' | 'departments' | 'positions';

const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({
    workUnits, departments, positions,
    onSaveWorkUnit, onDeleteWorkUnit,
    onSaveDepartment, onDeleteDepartment,
    onSavePosition, onDeletePosition,
}) => {
    const [activeTab, setActiveTab] = useState<TabKey>('departments');

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'departments', label: 'Departemen' },
        { key: 'positions', label: 'Jabatan' },
        { key: 'units', label: 'Unit Kerja' },
    ];

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Pengaturan Organisasi</h2>
                <div className="flex gap-2 border-b border-gray-200">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors ${
                                activeTab === tab.key
                                    ? 'bg-white text-[#06736a] border-b-2 border-[#06736a]'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'departments' && (
                <EntityCrudTab
                    entityLabel="Departemen"
                    entityLabelPlural="Departemen"
                    items={departments}
                    onSave={onSaveDepartment}
                    onDelete={onDeleteDepartment}
                    placeholder="Contoh: Departemen Medis"
                />
            )}

            {activeTab === 'positions' && (
                <EntityCrudTab
                    entityLabel="Jabatan"
                    entityLabelPlural="Jabatan"
                    items={positions}
                    onSave={onSavePosition}
                    onDelete={onDeletePosition}
                    placeholder="Contoh: Dokter Spesialis"
                />
            )}

            {activeTab === 'units' && (
                <EntityCrudTab
                    entityLabel="Unit Kerja"
                    entityLabelPlural="Unit Kerja"
                    items={workUnits}
                    onSave={onSaveWorkUnit}
                    onDelete={onDeleteWorkUnit}
                    placeholder="Contoh: Poli Anak"
                />
            )}
        </div>
    );
};

export default OrganizationSettings;
