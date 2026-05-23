import React, { useState, useEffect } from 'react';
import logger from '../services/logger.ts';
import { Employee, Status, Shift, WorkUnit, Document, Compensation, Role, Department, Position, Religion, MaritalStatus, EducationLevel, Address, EmergencyContact, Education, WorkHistory, BankAccount } from '../types.ts';
import { generateJobDescription } from '../services/geminiService.ts';
import { generateNIK, validateNIK, isNIKUnique } from '../services/nikService.ts';
import { supabase } from '../services/supabaseClient.ts';
import LoadingSpinner from './LoadingSpinner.tsx';
import BasicInfoTab from './employee-form/BasicInfoTab';
import PersonalInfoTab from './employee-form/PersonalInfoTab';
import ProfessionalInfoTab from './employee-form/ProfessionalInfoTab';
import EmploymentInfoTab from './employee-form/EmploymentInfoTab';
import DocumentsTab from './employee-form/DocumentsTab';

import { XMarkIcon, SparklesIcon, TrashIcon, PlusIcon } from './icons.tsx';

export type { NewEmployeeData } from '../hooks/useEmployeeForm.ts';
import { NewEmployeeData, useEmployeeForm } from '../hooks/useEmployeeForm.ts';

interface EmployeeFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employee: Employee | NewEmployeeData, newPassword?: string) => void;
    employeeToEdit: Employee | null;
    workUnits: WorkUnit[];
    departments: Department[];
    positions: Position[];
    currentUserRole: string;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ isOpen, onClose, onSave, employeeToEdit, workUnits, departments, positions, currentUserRole }) => {
    const formState = useEmployeeForm({ employeeToEdit, onSave, currentUserRole });
    
    // Destructure everything from the hook
    const {
        employee, setEmployee,
        activeTab, setActiveTab,
        password, setPassword,
        newPassword, setNewPassword,
        showPasswordReset, setShowPasswordReset,
        generatedDesc,
        isGenerating,
        isGeneratingNIK,
        sertifikasiInput, setSertifikasiInput,
        kompetensiInput, setKompetensiInput,
        documents,
        newDoc, setNewDoc,
        selectedFile, setSelectedFile,
        isUploadingDoc,
        isSaving,
        errors,
        isFormLocked, isVerified, isProfileCompleted,
        isAdmin, documentTypeOptions,
        
        handleChange,
        handleCompensationChange,
        handleGenerateDesc,
        handleAddDocument,
        handleDeleteDocument,
        handleGenerateNIK,
        handleSubmit,
        handleVerify,
        handleToggleLock,
        handleAddressChange,
        handleAddEmergencyContact,
        handleUpdateEmergencyContact,
        handleDeleteEmergencyContact,
        handleAddEducation,
        handleUpdateEducation,
        handleDeleteEducation,
        handleAddWorkHistory,
        handleUpdateWorkHistory,
        handleDeleteWorkHistory,
    } = formState;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    // Tab configuration
    const tabs = [
        { id: 'basic' as const, label: 'Data Dasar', icon: '👤' },
        { id: 'personal' as const, label: 'Data Pribadi', icon: '📋' },
        { id: 'professional' as const, label: 'Pendidikan & Karir', icon: '🎓' },
        { id: 'employment' as const, label: 'Kepegawaian', icon: '💼' },
        { id: 'documents' as const, label: 'Dokumen', icon: '📄' }
    ];

    return (
        <div
            className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            aria-modal="true"
            role="dialog"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />
            {/* Drawer */}
            <div className={`absolute inset-y-0 right-0 flex w-full max-w-5xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out rounded-l-2xl overflow-hidden ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-white z-10 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-[#06736a]">
                            {employeeToEdit ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
                        </h2>
                        {employeeToEdit && (
                            <div className="flex gap-2">
                                {isProfileCompleted && (
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                        ✓ Profil Lengkap
                                    </span>
                                )}
                                {isVerified && (
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                        ✓ Terverifikasi
                                    </span>
                                )}
                                {isFormLocked && (
                                    <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                        🔒 Terkunci
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Tutup">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="border-b bg-gray-50 px-6 flex-shrink-0">
                    <div className="flex space-x-1 overflow-x-auto scrollbar-thin">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                                    activeTab === tab.id
                                        ? 'border-[#06736a] text-[#06736a] bg-white'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Content */}
                <form id="employee-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-8 space-y-6">
                        
                        {/* Warning Banner if Locked */}
                        {isFormLocked && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                                <div className="flex items-center">
                                    <span className="text-red-700 text-sm font-medium">
                                        🔒 Data karyawan ini telah dikunci oleh HRD. Anda tidak dapat mengubah data.
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {/* Info Banner - Profile Status */}
                        {employeeToEdit && !isFormLocked && (
                            <div className={`border-l-4 p-4 mb-6 ${
                                isProfileCompleted 
                                    ? 'bg-green-50 border-green-500' 
                                    : 'bg-yellow-50 border-yellow-500'
                            }`}>
                                <div className="flex items-center">
                                    <span className={`text-sm font-medium ${
                                        isProfileCompleted ? 'text-green-700' : 'text-yellow-700'
                                    }`}>
                                        {isProfileCompleted 
                                            ? '✓ Profil karyawan sudah lengkap'
                                            : '⚠️ Lengkapi data wajib: Nama, Email, Tanggal Lahir, No. KTP, Alamat KTP, dan Rekening Bank'
                                        }
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {/* Info: Field Opsional */}
                        {employeeToEdit && !isFormLocked && !isProfileCompleted && (
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-blue-700">
                                            <strong>Tips:</strong> Anda bisa menyimpan data yang sudah diisi meskipun belum lengkap. 
                                            Field yang ditandai <span className="font-semibold">*</span> adalah wajib untuk verifikasi HRD.
                                            Data lain bisa dilengkapi nanti.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Use fieldset to disable all inputs at once */}
                        <fieldset disabled={isFormLocked}>
                        
                        {activeTab === 'basic' && (
                            <BasicInfoTab 
                                employee={employee}
                                employeeToEdit={employeeToEdit}
                                handleChange={handleChange}
                                isAdmin={isAdmin}
                                handleGenerateNIK={handleGenerateNIK}
                                errors={errors}
                                password={password}
                                setPassword={setPassword}
                                showPasswordReset={showPasswordReset}
                                setShowPasswordReset={setShowPasswordReset}
                                newPassword={newPassword}
                                setNewPassword={setNewPassword}
                            />
                        )}

                        {activeTab === 'personal' && (
                            <PersonalInfoTab 
                                employee={employee}
                                handleChange={handleChange}
                                handleAddressChange={handleAddressChange}
                                handleAddEmergencyContact={handleAddEmergencyContact}
                                handleUpdateEmergencyContact={handleUpdateEmergencyContact}
                                handleDeleteEmergencyContact={handleDeleteEmergencyContact}
                            />
                        )}

                        {activeTab === 'professional' && (
                            <ProfessionalInfoTab 
                                employee={employee}
                                handleAddEducation={handleAddEducation}
                                handleUpdateEducation={handleUpdateEducation}
                                handleDeleteEducation={handleDeleteEducation}
                                handleAddWorkHistory={handleAddWorkHistory}
                                handleUpdateWorkHistory={handleUpdateWorkHistory}
                                handleDeleteWorkHistory={handleDeleteWorkHistory}
                            />
                        )}

                        {activeTab === 'employment' && (
                            <EmploymentInfoTab 
                                employee={employee}
                                setEmployee={setEmployee}
                                handleChange={handleChange}
                                handleCompensationChange={handleCompensationChange}
                                positions={positions}
                                departments={departments}
                                workUnits={workUnits}
                                errors={errors}
                                sertifikasiInput={sertifikasiInput}
                                setSertifikasiInput={setSertifikasiInput}
                                kompetensiInput={kompetensiInput}
                                setKompetensiInput={setKompetensiInput}
                            />
                        )}

                        {activeTab === 'documents' && (
                            <DocumentsTab 
                                employee={employee}
                                documents={documents}
                                newDoc={newDoc}
                                setNewDoc={setNewDoc}
                                documentTypeOptions={documentTypeOptions}
                                selectedFile={selectedFile}
                                setSelectedFile={setSelectedFile}
                                handleAddDocument={handleAddDocument}
                                isUploadingDoc={isUploadingDoc}
                                handleDeleteDocument={handleDeleteDocument}
                                handleGenerateDesc={handleGenerateDesc}
                                isGenerating={isGenerating}
                                generatedDesc={generatedDesc}
                            />
                        )}
                        
                        </fieldset>
                    </div>

                </form>

                {/* Drawer Footer - always visible at drawer bottom */}
                <div className="flex-shrink-0 border-t bg-white px-6 py-4 flex justify-between items-center shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
                    {/* HRD Actions (left side) */}
                    {employeeToEdit && (
                        <div className="flex gap-3">
                            {!isVerified && (
                                <button 
                                    type="button" 
                                    onClick={handleVerify}
                                    className="px-4 py-2 border-2 border-green-500 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors flex items-center gap-2"
                                    title="Verifikasi data karyawan"
                                >
                                    ✓ Verifikasi Data
                                </button>
                            )}
                            <button 
                                type="button" 
                                onClick={handleToggleLock}
                                className={`px-4 py-2 border-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                    isFormLocked 
                                        ? 'border-orange-500 text-orange-700 hover:bg-orange-50' 
                                        : 'border-red-500 text-red-700 hover:bg-red-50'
                                }`}
                                title={isFormLocked ? 'Buka kunci data' : 'Kunci data'}
                            >
                                {isFormLocked ? '🔓 Buka Kunci' : '🔒 Kunci Data'}
                            </button>
                        </div>
                    )}

                    {/* Batal & Simpan */}
                    <div className="flex gap-3 ml-auto">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-5 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Batal
                        </button>
                        <button 
                            type="submit"
                            form="employee-form"
                            disabled={isFormLocked || isSaving}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
                                isFormLocked || isSaving
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-[#06736a] hover:bg-[#054f46]'
                            }`}
                            title={isFormLocked ? 'Data terkunci, tidak bisa diubah' : 'Simpan perubahan'}
                        >
                            {isSaving ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Menyimpan...
                                </>
                            ) : '💾 Simpan Perubahan'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeForm;