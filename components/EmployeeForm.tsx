import React, { useState, useEffect } from 'react';
import { Employee, Status, Shift, WorkUnit, Document, Compensation, Role, Department, Position, Religion, MaritalStatus, EducationLevel, Address, EmergencyContact, Education, WorkHistory, BankAccount } from '../types.ts';
import { generateJobDescription } from '../services/geminiService.ts';
import { generateNIK, validateNIK, isNIKUnique } from '../services/nikService.ts';
import { supabase } from '../services/supabaseClient.ts';
import { classifyError } from '../services/errorHandlingService.ts';
import LoadingSpinner from './LoadingSpinner.tsx';
import { XMarkIcon, SparklesIcon, TrashIcon, PlusIcon } from './icons.tsx';

export type NewEmployeeData = Omit<Employee, 'id' | 'user_id'> & { password?: string };

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
    // Tentukan apakah user adalah admin/HRD dari props
    const normalizedRole = String(currentUserRole || '').trim().toLowerCase();
    const isAdmin = normalizedRole === 'admin' || normalizedRole === 'hrd' || normalizedRole === 'hr';
    const initialCompensation: Compensation = { gajiPokok: 0, tunjanganProfesi: 0 };
    const initialAddress: Address = { ktp: '', domisili: '', province: '', city: '', postalCode: '' };
    const initialBankAccount: BankAccount = { bankName: '', accountNumber: '', accountHolder: '' };
    
    const initialFormState: Employee = {
        id: '',
        user_id: '',
        nama: '',
        foto: '',
        jabatan: '',
        departemen: '',
        email: '',
        telepon: '',
        hireDate: new Date().toISOString().split('T')[0],
        birthDate: '',
        status: Status.Aktif,
        shift: 'Pagi',
        spesialisasi: '',
        kredensial: '',
        nomorSTR: '',
        tanggalKadaluarsaSTR: '',
        unitKerjaId: '',
        sertifikasi: [],
        kompetensi: [],
        documents: [],
        compensation: initialCompensation,
        sisaCuti: 12,
        role: 'karyawan',
        // NEW FIELDS
        ktpNumber: '',
        npwp: '',
        bpjsKesehatan: '',
        bpjsKetenagakerjaan: '',
        agama: undefined,
        maritalStatus: 'Single',
        dependents: 0,
        address: initialAddress,
        emergencyContacts: [],
        education: [],
        workHistory: [],
        bankAccount: initialBankAccount,
    };

    const [employee, setEmployee] = useState<Employee>(initialFormState);
    const [activeTab, setActiveTab] = useState<'basic' | 'personal' | 'professional' | 'employment' | 'documents'>('basic');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [generatedDesc, setGeneratedDesc] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingNIK, setIsGeneratingNIK] = useState(false);
    
    const [sertifikasiInput, setSertifikasiInput] = useState('');
    const [kompetensiInput, setKompetensiInput] = useState('');
    const [documents, setDocuments] = useState<Document[]>([]);
    
    const [newDoc, setNewDoc] = useState({ name: '', type: 'Lainnya' as Document['type'], fileUrl: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Validasi data form - HARUS di top level, tidak boleh setelah fungsi lain
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    // Check if form is locked (readonly for employee)
    const isFormLocked = employee.isLocked || false;
    const isVerified = employee.isVerified || false;
    const isProfileCompleted = employee.isProfileCompleted || false;


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

    useEffect(() => {
        if (employeeToEdit) {
            // Convert null values to empty strings untuk avoid controlled/uncontrolled warning
            // PENTING: Spread dulu employeeToEdit, baru override field yang null
            const newEmployeeState = {
                ...employeeToEdit,
                nik: employeeToEdit.nik || '',
                foto: employeeToEdit.foto || '',
                telepon: employeeToEdit.telepon || '',
                birthDate: employeeToEdit.birthDate || '',
                spesialisasi: employeeToEdit.spesialisasi || '',
                kredensial: employeeToEdit.kredensial || '',
                nomorSTR: employeeToEdit.nomorSTR || '',
                tanggalKadaluarsaSTR: employeeToEdit.tanggalKadaluarsaSTR || '',
                unitKerjaId: employeeToEdit.unitKerjaId || '',
                compensation: employeeToEdit.compensation || initialCompensation,
                // Explicitly ensure id and user_id are preserved
                id: employeeToEdit.id,
                user_id: employeeToEdit.user_id
            };
            
            setEmployee(newEmployeeState);
            setSertifikasiInput((employeeToEdit.sertifikasi || []).join(', '));
            setKompetensiInput((employeeToEdit.kompetensi || []).join(', '));
            setDocuments(employeeToEdit.documents || []);
        } else {
            setEmployee(initialFormState);
            setSertifikasiInput('');
            setKompetensiInput('');
            setDocuments([]);
        }
        setPassword('');
        setNewPassword('');
        setShowPasswordReset(false);
        setGeneratedDesc('');
    }, [employeeToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'role') {
            // If role is kepala_ruangan, sync managedUnitId with unitKerjaId if set
            if (value === 'kepala_ruangan' && employee.unitKerjaId) {
                setEmployee({ ...employee, role: value as Role, managedUnitId: employee.unitKerjaId });
            } else {
                setEmployee({ ...employee, role: value as Role, managedUnitId: undefined });
            }
        } else if (name === 'unitKerjaId') {
            // Always update unitKerjaId, and if role is kepala_ruangan, also update managedUnitId
            if (employee.role === 'kepala_ruangan') {
                setEmployee({ ...employee, unitKerjaId: value, managedUnitId: value });
            } else {
                setEmployee({ ...employee, unitKerjaId: value });
            }
        } else if (name === 'managedUnitId') {
            // Handle managedUnitId for kepala_ruangan - sync with unitKerjaId
            setEmployee({ ...employee, managedUnitId: value, unitKerjaId: value });
        } else {
            setEmployee({ ...employee, [name]: value });
        }
    };

    const handleCompensationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEmployee({
            ...employee,
            compensation: {
                ...employee.compensation!,
                [name]: parseFloat(value) || 0,
            }
        });
    };

    const handleGenerateDesc = async () => {
        if (!employee.jabatan || !employee.departemen) {
            alert("Silakan isi Jabatan dan Departemen terlebih dahulu.");
            return;
        }
        setIsGenerating(true);
        const sertifikasiArray = sertifikasiInput.split(',').map(s => s.trim()).filter(Boolean);
        const kompetensiArray = kompetensiInput.split(',').map(k => k.trim()).filter(Boolean);

        const desc = await generateJobDescription(employee.jabatan, employee.departemen, employee.spesialisasi, kompetensiArray, sertifikasiArray);
        setGeneratedDesc(desc);
        setIsGenerating(false);
    };

    const handleAddDocument = async () => {
        if (!newDoc.name) {
            alert("Nama dokumen harus diisi.");
            return;
        }

        if (!selectedFile && !newDoc.fileUrl) {
            alert("Pilih file dokumen atau masukkan URL.");
            return;
        }

        let finalUrl = newDoc.fileUrl;

        if (selectedFile) {
            setIsUploadingDoc(true);
            try {
                // Generate unique filename to avoid collisions
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('employee-documents')
                    .upload(filePath, selectedFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    throw uploadError;
                }

                const { data: publicUrlData } = supabase.storage
                    .from('employee-documents')
                    .getPublicUrl(filePath);
                
                finalUrl = publicUrlData.publicUrl;
            } catch (error: any) {
                console.error("Upload error:", error);
                alert(`Gagal mengunggah file: ${classifyError(error).userMessage}`);
                setIsUploadingDoc(false);
                return;
            }
            setIsUploadingDoc(false);
        }

        // FIX: Added employeeId to satisfy the Document type.
        // For new employees, employee.id is an empty string, which is handled during save.
        const docToAdd: Document = {
            ...newDoc,
            fileUrl: finalUrl,
            id: crypto.randomUUID(),
            employeeId: employee.id,
            uploadedAt: new Date().toISOString(),
        };
        setDocuments([...documents, docToAdd]);
        setNewDoc({ name: '', type: 'Lainnya', fileUrl: '' }); // Reset form
        setSelectedFile(null);
    };

    const handleDeleteDocument = (id: string) => {
        setDocuments(documents.filter(doc => doc.id !== id));
    };

    const handleGenerateNIK = async () => {
        if (!employee.departemen || !employee.hireDate) {
            alert("Silakan isi Departemen dan Tanggal Masuk terlebih dahulu.");
            return;
        }
        setIsGeneratingNIK(true);
        try {
            const nik = await generateNIK(employee.departemen, employee.hireDate);
            setEmployee({ ...employee, nik });
        } catch (error) {
            console.error('Error generating NIK:', error);
            alert('Gagal generate NIK. Silakan coba lagi.');
        } finally {
            setIsGeneratingNIK(false);
        }
    };
    
    const validateForm = async (): Promise<boolean> => {
        const newErrors: Record<string, string> = {};
        // Validasi nama
        if (!employee.nama.trim()) {
            newErrors.nama = "Nama tidak boleh kosong";
        }
        // Validasi email
        if (!employee.email.trim()) {
            newErrors.email = "Email tidak boleh kosong";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
            newErrors.email = "Format email tidak valid";
        }
        // Validasi NIK
        if (employee.nik) {
            if (!validateNIK(employee.nik)) {
                newErrors.nik = "Format NIK tidak valid (contoh: 2024-MED-001)";
            } else {
                // Cek uniqueness NIK - hanya pass ID jika sedang edit (employeeToEdit ada)
                const excludeId = employeeToEdit ? employee.id : undefined;
                const isUnique = await isNIKUnique(employee.nik, excludeId);
                if (!isUnique) {
                    newErrors.nik = "NIK sudah digunakan oleh karyawan lain";
                }
            }
        }
        // Validasi telepon
        if (employee.telepon && !/^[0-9+\-\s]{10,15}$/.test(employee.telepon)) {
            newErrors.telepon = "Format nomor telepon tidak valid";
        }
        // Validasi password untuk karyawan baru
        if (!employeeToEdit && (!password || password.length < 6)) {
            newErrors.password = "Password minimal 6 karakter";
        }
        // Validasi STR jika jabatan adalah dokter atau perawat
        if ((employee.jabatan === "Dokter" || employee.jabatan === "Perawat") && !employee.nomorSTR) {
            newErrors.nomorSTR = "Nomor STR wajib diisi untuk Dokter dan Perawat";
        }
        // Validasi managedUnitId untuk kepala_ruangan
        if (employee.role === 'kepala_ruangan' && !employee.managedUnitId) {
            newErrors.managedUnitId = "Unit yang dikelola wajib dipilih untuk Kepala Ruangan";
        }
        // Validasi unitKerjaId - wajib untuk semua karyawan agar muncul di dashboard kepala ruangan
        if (employee.role !== 'admin' && employee.role !== 'hrd' && !employee.unitKerjaId) {
            newErrors.unitKerjaId = "Unit Kerja wajib dipilih agar karyawan terdeteksi di dashboard";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const isValid = await validateForm();
        
        if (!isValid) {
            return; // Jangan lanjutkan jika validasi gagal
        }
        
        setIsSaving(true);
        
        // Check if profile is completed (all required fields filled)
        const profileCompleted = !!(
            employee.nama && 
            employee.email && 
            employee.birthDate &&
            employee.ktpNumber &&
            employee.address?.ktp &&
            employee.bankAccount?.accountNumber
        );
        
        const sharedData = {
            ...employee,
            sertifikasi: sertifikasiInput.split(',').map(s => s.trim()).filter(Boolean),
            kompetensi: kompetensiInput.split(',').map(k => k.trim()).filter(Boolean),
            documents: documents,
            isProfileCompleted: profileCompleted,
        };

        try {
            if (employeeToEdit) {
                await (onSave as (e: any, p?: string) => Promise<void>)(sharedData, newPassword || undefined);
            } else {
                const newEmployeeData: NewEmployeeData = { ...sharedData, password: password };
                await (onSave as (e: any) => Promise<void>)(newEmployeeData);
            }
        } finally {
            setIsSaving(false);
        }
        // onClose() DIHAPUS - akan dipanggil otomatis di App.tsx setelah save selesai
    };
    
    const handleVerify = async () => {
        const isValid = await validateForm();
        if (!isValid) return;

        const profileCompleted = !!(
            employee.nama && 
            employee.email && 
            employee.birthDate &&
            employee.ktpNumber &&
            employee.address?.ktp &&
            employee.bankAccount?.accountNumber
        );

        const updatedEmployee = {
            ...employee,
            isVerified: true,
            verifiedAt: new Date().toISOString(),
            isProfileCompleted: profileCompleted,
            // verifiedBy will be set by App.tsx with current user ID
        };
        onSave(updatedEmployee);
    };
    
    const handleToggleLock = async () => {
        const updatedEmployee = {
            ...employee,
            isLocked: !employee.isLocked,
        };
        onSave(updatedEmployee);
    };

    const documentTypeOptions: Document['type'][] = ['Ijazah', 'STR/SIP', 'Sertifikat', 'Lainnya'];

    // Helper functions for new fields
    const handleAddressChange = (field: keyof Address, value: string) => {
        setEmployee({
            ...employee,
            address: {
                ...employee.address!,
                [field]: value
            }
        });
    };

    const handleBankAccountChange = (field: keyof BankAccount, value: string) => {
        setEmployee({
            ...employee,
            bankAccount: {
                ...employee.bankAccount!,
                [field]: value
            }
        });
    };

    const handleAddEmergencyContact = () => {
        const newContact: EmergencyContact = {
            name: '',
            relationship: '',
            phone: '',
            address: ''
        };
        setEmployee({
            ...employee,
            emergencyContacts: [...(employee.emergencyContacts || []), newContact]
        });
    };

    const handleUpdateEmergencyContact = (index: number, field: keyof EmergencyContact, value: string) => {
        const updated = [...(employee.emergencyContacts || [])];
        updated[index] = { ...updated[index], [field]: value };
        setEmployee({ ...employee, emergencyContacts: updated });
    };

    const handleDeleteEmergencyContact = (index: number) => {
        const updated = [...(employee.emergencyContacts || [])];
        updated.splice(index, 1);
        setEmployee({ ...employee, emergencyContacts: updated });
    };

    const handleAddEducation = () => {
        const newEdu: Education = {
            id: `edu-${Date.now()}`,
            level: 'S1',
            institution: '',
            major: '',
            graduationYear: new Date().getFullYear(),
            gpa: undefined
        };
        setEmployee({
            ...employee,
            education: [...(employee.education || []), newEdu]
        });
    };

    const handleUpdateEducation = (index: number, field: keyof Education, value: any) => {
        const updated = [...(employee.education || [])];
        updated[index] = { ...updated[index], [field]: value };
        setEmployee({ ...employee, education: updated });
    };

    const handleDeleteEducation = (index: number) => {
        const updated = [...(employee.education || [])];
        updated.splice(index, 1);
        setEmployee({ ...employee, education: updated });
    };

    const handleAddWorkHistory = () => {
        const newWork: WorkHistory = {
            id: `work-${Date.now()}`,
            company: '',
            position: '',
            startDate: '',
            endDate: '',
            reasonLeaving: ''
        };
        setEmployee({
            ...employee,
            workHistory: [...(employee.workHistory || []), newWork]
        });
    };

    const handleUpdateWorkHistory = (index: number, field: keyof WorkHistory, value: string) => {
        const updated = [...(employee.workHistory || [])];
        updated[index] = { ...updated[index], [field]: value };
        setEmployee({ ...employee, workHistory: updated });
    };

    const handleDeleteWorkHistory = (index: number) => {
        const updated = [...(employee.workHistory || [])];
        updated.splice(index, 1);
        setEmployee({ ...employee, workHistory: updated });
    };

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
                        
                        {/* TAB 1: DATA DASAR */}
                        {activeTab === 'basic' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Informasi Dasar */}
                                    <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                        <h3 className="font-semibold text-lg text-[#06736a]">Informasi Dasar</h3>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap *</label>
                                            <input 
                                                type="text" 
                                                name="nama" 
                                                value={employee.nama} 
                                                onChange={handleChange} 
                                                className={`mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 ${errors.nama ? 'border-red-500' : ''}`}
                                                placeholder="Contoh: Dr. John Doe"
                                                required
                                            />
                                            {errors.nama && <p className="mt-1 text-sm text-red-600">{errors.nama}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">NIK (Nomor Induk Karyawan)</label>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    name="nik"
                                                    value={employee.nik || ''}
                                                    onChange={isAdmin ? handleChange : undefined}
                                                    className={`mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 ${errors.nik ? 'border-red-500' : ''}`}
                                                    placeholder="2024-MED-001"
                                                    readOnly={!isAdmin ? true : false}
                                                />
                                                {isAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={handleGenerateNIK}
                                                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                                    >
                                                        Generate NIK
                                                    </button>
                                                )}
                                            </div>
                                            {errors.nik && <p className="mt-1 text-sm text-red-600">{errors.nik}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Kredensial</label>
                                            <input 
                                                type="text" 
                                                name="kredensial" 
                                                value={employee.kredensial} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="Contoh: Sp.PD, M.Kes"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                            <input 
                                                type="email" 
                                                name="email" 
                                                value={employee.email} 
                                                onChange={handleChange} 
                                                className={`mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 ${errors.email ? 'border-red-500' : ''}`}
                                                placeholder="email@hospital.com"
                                                required
                                            />
                                            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Telepon</label>
                                            <input 
                                                type="tel" 
                                                name="telepon" 
                                                value={employee.telepon} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="081234567890"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Lahir</label>
                                            <input 
                                                type="date" 
                                                name="birthDate" 
                                                value={employee.birthDate} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                title="Tanggal lahir karyawan"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Foto URL</label>
                                            <input 
                                                type="text" 
                                                name="foto" 
                                                value={employee.foto} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>

                                    {/* Login & Password */}
                                    <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                        <h3 className="font-semibold text-lg text-[#06736a]">Login & Password</h3>
                                        
                                        {!employeeToEdit && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                                                <input 
                                                    type="password" 
                                                    value={password} 
                                                    onChange={(e) => setPassword(e.target.value)} 
                                                    className={`mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 ${errors.password ? 'border-red-500' : ''}`}
                                                    placeholder="Minimal 6 karakter"
                                                    required
                                                />
                                                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                                            </div>
                                        )}

                                        {employeeToEdit && (
                                            <div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowPasswordReset(!showPasswordReset)} 
                                                    className="text-sm text-blue-600 hover:text-blue-800"
                                                >
                                                    {showPasswordReset ? 'Batalkan Reset Password' : 'Reset Password'}
                                                </button>
                                                {showPasswordReset && (
                                                    <div className="mt-3">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Password Baru</label>
                                                        <input 
                                                            type="password" 
                                                            value={newPassword} 
                                                            onChange={(e) => setNewPassword(e.target.value)} 
                                                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                            placeholder="Minimal 6 karakter"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                            <select 
                                                name="role" 
                                                value={employee.role || 'karyawan'} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                title="Pilih role pengguna"
                                            >
                                           <option value="karyawan">Karyawan</option>
                                           <option value="kepala_ruangan">Kepala Ruangan</option>
                                           <option value="hrd">HRD</option>
                                           <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: DATA PRIBADI */}
                        {activeTab === 'personal' && (
                            <div className="space-y-6">
                                {/* Identitas & Status */}
                                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                    <h3 className="font-semibold text-lg text-[#06736a]">Identitas & Status</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nomor KTP</label>
                                            <input 
                                                type="text" 
                                                name="ktpNumber" 
                                                value={employee.ktpNumber || ''} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="16 digit nomor KTP"
                                                maxLength={16}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">NPWP</label>
                                            <input 
                                                type="text" 
                                                name="npwp" 
                                                value={employee.npwp || ''} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="XX.XXX.XXX.X-XXX.XXX"
                                                maxLength={20}
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Untuk keperluan perpajakan</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">BPJS Kesehatan</label>
                                            <input 
                                                type="text" 
                                                name="bpjsKesehatan" 
                                                value={employee.bpjsKesehatan || ''} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="Nomor BPJS Kesehatan"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">BPJS Ketenagakerjaan</label>
                                            <input 
                                                type="text" 
                                                name="bpjsKetenagakerjaan" 
                                                value={employee.bpjsKetenagakerjaan || ''} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="Nomor BPJS Ketenagakerjaan"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Status Pernikahan</label>
                                            <select 
                                                name="maritalStatus" 
                                                value={employee.maritalStatus || 'Single'} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                title="Pilih status pernikahan"
                                            >
                                                <option value="Single">Single</option>
                                                <option value="Married">Married</option>
                                                <option value="Divorced">Divorced</option>
                                                <option value="Widowed">Widowed</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Agama</label>
                                            <select 
                                                name="agama" 
                                                value={employee.agama || ''} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                title="Pilih agama"
                                            >
                                                <option value="">Pilih Agama</option>
                                                <option value="Islam">Islam</option>
                                                <option value="Kristen Protestan">Kristen Protestan</option>
                                                <option value="Kristen Katolik">Kristen Katolik</option>
                                                <option value="Hindu">Hindu</option>
                                                <option value="Buddha">Buddha</option>
                                                <option value="Konghucu">Konghucu</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Tanggungan</label>
                                            <input 
                                                type="number" 
                                                name="dependents" 
                                                value={employee.dependents || 0} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                min="0"
                                                placeholder="0"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Untuk perhitungan PTKP pajak</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Alamat */}
                                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                    <h3 className="font-semibold text-lg text-[#06736a]">Alamat</h3>
                                    
                                    <div className="grid grid-cols-1 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Alamat KTP</label>
                                            <textarea 
                                                value={employee.address?.ktp || ''} 
                                                onChange={(e) => handleAddressChange('ktp', e.target.value)} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                rows={2}
                                                placeholder="Jl. Contoh No. 123, RT/RW 001/002"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Alamat Domisili</label>
                                            <textarea 
                                                value={employee.address?.domisili || ''} 
                                                onChange={(e) => handleAddressChange('domisili', e.target.value)} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                rows={2}
                                                placeholder="Sama dengan KTP atau alamat berbeda"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => handleAddressChange('domisili', employee.address?.ktp || '')} 
                                                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                Sama dengan alamat KTP
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Provinsi</label>
                                                <input 
                                                    type="text" 
                                                    value={employee.address?.province || ''} 
                                                    onChange={(e) => handleAddressChange('province', e.target.value)} 
                                                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                    placeholder="DKI Jakarta"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Kota/Kabupaten</label>
                                                <input 
                                                    type="text" 
                                                    value={employee.address?.city || ''} 
                                                    onChange={(e) => handleAddressChange('city', e.target.value)} 
                                                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                    placeholder="Jakarta Selatan"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Kode Pos</label>
                                                <input 
                                                    type="text" 
                                                    value={employee.address?.postalCode || ''} 
                                                    onChange={(e) => handleAddressChange('postalCode', e.target.value)} 
                                                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                    placeholder="12345"
                                                    maxLength={5}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Emergency Contacts */}
                                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-lg text-[#06736a]">Kontak Darurat</h3>
                                        <button 
                                            type="button" 
                                            onClick={handleAddEmergencyContact} 
                                            className="px-4 py-2 bg-[#06736a] text-white rounded-lg hover:bg-[#054f46] text-sm flex items-center gap-2"
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                            Tambah Kontak
                                        </button>
                                    </div>

                                    {(employee.emergencyContacts || []).map((contact, index) => (
                                        <div key={index} className="p-4 bg-white border rounded-lg space-y-3">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium text-sm">Kontak #{index + 1}</h4>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleDeleteEmergencyContact(index)} 
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap</label>
                                                    <input 
                                                        type="text" 
                                                        value={contact.name} 
                                                        onChange={(e) => handleUpdateEmergencyContact(index, 'name', e.target.value)} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        placeholder="Nama kontak darurat"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Hubungan</label>
                                                    <input 
                                                        type="text" 
                                                        value={contact.relationship} 
                                                        onChange={(e) => handleUpdateEmergencyContact(index, 'relationship', e.target.value)} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        placeholder="Istri/Suami/Orang Tua/Saudara"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Nomor Telepon</label>
                                                    <input 
                                                        type="tel" 
                                                        value={contact.phone} 
                                                        onChange={(e) => handleUpdateEmergencyContact(index, 'phone', e.target.value)} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        placeholder="081234567890"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Alamat</label>
                                                    <input 
                                                        type="text" 
                                                        value={contact.address} 
                                                        onChange={(e) => handleUpdateEmergencyContact(index, 'address', e.target.value)} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        placeholder="Alamat kontak"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {(!employee.emergencyContacts || employee.emergencyContacts.length === 0) && (
                                        <div className="text-center py-8 text-gray-500">
                                            <p className="text-sm">Belum ada kontak darurat.</p>
                                            <p className="text-xs mt-1">Klik "Tambah Kontak" untuk menambahkan</p>
                                        </div>
                                    )}
                                </div>

                                {/* Bank Account */}
                                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                    <h3 className="font-semibold text-lg text-[#06736a]">Informasi Rekening Bank</h3>
                                    <p className="text-sm text-gray-600">Untuk transfer gaji</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nama Bank</label>
                                            <input 
                                                type="text" 
                                                value={employee.bankAccount?.bankName || ''} 
                                                onChange={(e) => handleBankAccountChange('bankName', e.target.value)} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="Bank Mandiri"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Rekening</label>
                                            <input 
                                                type="text" 
                                                value={employee.bankAccount?.accountNumber || ''} 
                                                onChange={(e) => handleBankAccountChange('accountNumber', e.target.value)} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="1234567890"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pemilik Rekening</label>
                                            <input 
                                                type="text" 
                                                value={employee.bankAccount?.accountHolder || ''} 
                                                onChange={(e) => handleBankAccountChange('accountHolder', e.target.value)} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="Sesuai nama di buku rekening"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => handleBankAccountChange('accountHolder', employee.nama)} 
                                                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                Sama dengan nama karyawan
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: PENDIDIKAN & KARIR */}
                        {activeTab === 'professional' && (
                            <div className="space-y-6">
                                {/* Education History */}
                                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-lg text-[#06736a]">Riwayat Pendidikan</h3>
                                        <button 
                                            type="button" 
                                            onClick={handleAddEducation} 
                                            className="px-4 py-2 bg-[#06736a] text-white rounded-lg hover:bg-[#054f46] text-sm flex items-center gap-2"
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                            Tambah Pendidikan
                                        </button>
                                    </div>

                                    {(employee.education || []).map((edu, index) => (
                                        <div key={edu.id} className="p-4 bg-white border rounded-lg space-y-3">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium text-sm">Pendidikan #{index + 1}</h4>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleDeleteEducation(index)} 
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Jenjang</label>
                                                    <select 
                                                        value={edu.level} 
                                                        onChange={(e) => handleUpdateEducation(index, 'level', e.target.value as EducationLevel)} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        title="Pilih jenjang pendidikan"
                                                    >
                                                        <option value="SMA">SMA</option>
                                                        <option value="D3">D3</option>
                                                        <option value="S1">S1</option>
                                                        <option value="S2">S2</option>
                                                        <option value="S3">S3</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Institusi</label>
                                                    <input 
                                                        type="text" 
                                                        value={edu.institution} 
                                                        onChange={(e) => handleUpdateEducation(index, 'institution', e.target.value)} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        placeholder="Nama universitas/sekolah"
                                                        title="Nama institusi pendidikan"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Jurusan</label>
                                                    <input 
                                                        type="text" 
                                                        value={edu.major} 
                                                        onChange={(e) => handleUpdateEducation(index, 'major', e.target.value)} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        placeholder="Program studi"
                                                        title="Nama jurusan atau program studi"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Tahun Lulus</label>
                                                    <input 
                                                        type="number" 
                                                        value={edu.graduationYear} 
                                                        onChange={(e) => handleUpdateEducation(index, 'graduationYear', parseInt(e.target.value))} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        min="1950"
                                                        max="2100"
                                                        title="Tahun lulus pendidikan"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">IPK (opsional)</label>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={edu.gpa || ''} 
                                                        onChange={(e) => handleUpdateEducation(index, 'gpa', parseFloat(e.target.value) || undefined)} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        min="0"
                                                        max="4"
                                                        placeholder="0.00 - 4.00"
                                                        title="IPK atau GPA pendidikan"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {(!employee.education || employee.education.length === 0) && (
                                        <div className="text-center py-8 text-gray-500">
                                            <p className="text-sm">Belum ada riwayat pendidikan.</p>
                                            <p className="text-xs mt-1">Klik "Tambah Pendidikan" untuk menambahkan</p>
                                        </div>
                                    )}
                                </div>

                                {/* Work History */}
                                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-lg text-[#06736a]">Riwayat Pekerjaan</h3>
                                        <button 
                                            type="button" 
                                            onClick={handleAddWorkHistory} 
                                            className="px-4 py-2 bg-[#06736a] text-white rounded-lg hover:bg-[#054f46] text-sm flex items-center gap-2"
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                            Tambah Riwayat
                                        </button>
                                    </div>

                                    {(employee.workHistory || []).map((work, index) => (
                                        <div key={work.id} className="p-4 bg-white border rounded-lg space-y-3">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium text-sm">Pekerjaan #{index + 1}</h4>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleDeleteWorkHistory(index)} 
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Nama Perusahaan</label>
                                                    <input 
                                                        type="text" 
                                                        value={work.company} 
                                                        onChange={(e) => handleUpdateWorkHistory(index, 'company', e.target.value)} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        placeholder="PT. ABC"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Posisi</label>
                                                    <input 
                                                        type="text" 
                                                        value={work.position} 
                                                        onChange={(e) => handleUpdateWorkHistory(index, 'position', e.target.value)} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        placeholder="Staff/Manager/etc"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                                                    <input 
                                                        type="date" 
                                                        value={work.startDate} 
                                                        onChange={(e) => handleUpdateWorkHistory(index, 'startDate', e.target.value)} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        title="Tanggal mulai bekerja"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                                                    <input 
                                                        type="date" 
                                                        value={work.endDate} 
                                                        onChange={(e) => handleUpdateWorkHistory(index, 'endDate', e.target.value)} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        title="Tanggal selesai bekerja"
                                                    />
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Alasan Berhenti</label>
                                                    <input 
                                                        type="text" 
                                                        value={work.reasonLeaving} 
                                                        onChange={(e) => handleUpdateWorkHistory(index, 'reasonLeaving', e.target.value)} 
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                                        placeholder="Alasan resign/kontrak habis/etc"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {(!employee.workHistory || employee.workHistory.length === 0) && (
                                        <div className="text-center py-8 text-gray-500">
                                            <p className="text-sm">Belum ada riwayat pekerjaan.</p>
                                            <p className="text-xs mt-1">Klik "Tambah Riwayat" untuk menambahkan</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 4: KEPEGAWAIAN */}
                        {activeTab === 'employment' && (
                            <div className="space-y-6">
                                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                    <h3 className="font-semibold text-lg text-[#06736a]">Informasi Kepegawaian</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Jabatan *</label>
                                            <select 
                                                name="jabatan" 
                                                value={employee.jabatan} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                required
                                                title="Pilih jabatan"
                                            >
                                                <option value="">Pilih Jabatan</option>
                                                {positions.map(p => <option key={p.id} value={p.nama}>{p.nama}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Departemen *</label>
                                            <select 
                                                name="departemen" 
                                                value={employee.departemen} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                required
                                                title="Pilih departemen"
                                            >
                                                <option value="">Pilih Departemen</option>
                                                {departments.map(d => <option key={d.id} value={d.nama}>{d.nama}</option>)}
                                            </select>
                                        </div>

                                        {/* Unit Kerja / Unit yang Dikepalai - Conditional based on Role */}
                                        {employee.role === 'kepala_ruangan' ? (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Unit yang Dikepalai *</label>
                                                <select 
                                                    name="managedUnitId" 
                                                    value={employee.managedUnitId || ''} 
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        // Sync dengan unitKerjaId untuk kepala ruangan
                                                        setEmployee({ ...employee, managedUnitId: e.target.value, unitKerjaId: e.target.value });
                                                    }}
                                                    className={`mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 ${errors.managedUnitId ? 'border-red-500' : ''}`}
                                                    title="Pilih unit yang akan dikelola"
                                                    required
                                                >
                                                    <option value="">-- Pilih Unit yang Dikepalai --</option>
                                                    {workUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.nama}</option>)}
                                                </select>
                                                {errors.managedUnitId && <p className="mt-1 text-sm text-red-600">{errors.managedUnitId}</p>}
                                                <p className="mt-1 text-xs text-gray-500">Kepala ruangan akan mengelola karyawan di unit ini</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Unit Kerja</label>
                                                <select 
                                                    name="unitKerjaId" 
                                                    value={employee.unitKerjaId || ''} 
                                                    onChange={handleChange} 
                                                    className={`mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 ${errors.unitKerjaId ? 'border-red-500' : ''}`}
                                                    title="Pilih unit kerja tempat karyawan bekerja"
                                                >
                                                    <option value="">-- Pilih Unit Kerja --</option>
                                                    {workUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.nama}</option>)}
                                                </select>
                                                {errors.unitKerjaId && <p className="mt-1 text-sm text-red-600">{errors.unitKerjaId}</p>}
                                                <p className="mt-1 text-xs text-gray-500">Wajib diisi agar karyawan muncul di dashboard kepala ruangan</p>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Spesialisasi</label>
                                            <input 
                                                type="text" 
                                                name="spesialisasi" 
                                                value={employee.spesialisasi} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="Contoh: Jantung Anak"
                                                title="Spesialisasi karyawan"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Masuk *</label>
                                            <input 
                                                type="date" 
                                                name="hireDate" 
                                                value={employee.hireDate} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                required
                                                title="Tanggal masuk kerja"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Shift Kontrak *</label>
                                            <p className="text-xs text-gray-500 mb-2">Shift default sesuai kontrak. Penugasan shift aktif dikelola Kepala Unit.</p>
                                            <select 
                                                name="shift" 
                                                value={employee.shift} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                required
                                                title="Pilih tipe shift kontrak"
                                            >
                                                <option value="Pagi">Pagi (Shift Tetap Pagi)</option>
                                                <option value="Siang">Siang (Shift Tetap Siang)</option>
                                                <option value="Malam">Malam (Shift Tetap Malam)</option>
                                                <option value="Rotating">Rotating (3 Shift Bergantian)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Status Karyawan *</label>
                                            <select 
                                                name="status" 
                                                value={employee.status} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                required
                                                title="Pilih status karyawan"
                                            >
                                                {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Sisa Cuti</label>
                                            <input 
                                                type="number" 
                                                name="sisaCuti" 
                                                value={employee.sisaCuti || 12} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                min="0"
                                                title="Sisa cuti karyawan"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Default: 12 hari per tahun</p>
                                        </div>
                                    </div>
                                </div>

                                {/* STR Section */}
                                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                    <h3 className="font-semibold text-lg text-[#06736a]">STR/SIP (Khusus Tenaga Medis)</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nomor STR</label>
                                            <input 
                                                type="text" 
                                                name="nomorSTR" 
                                                value={employee.nomorSTR} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="Nomor Surat Tanda Registrasi"
                                                title="Nomor STR"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Kadaluarsa STR</label>
                                            <input 
                                                type="date" 
                                                name="tanggalKadaluarsaSTR" 
                                                value={employee.tanggalKadaluarsaSTR} 
                                                onChange={handleChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                title="Tanggal kedaluwarsa STR"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Competencies Section */}
                                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                    <h3 className="font-semibold text-lg text-[#06736a]">Kompetensi & Sertifikasi</h3>
                                    
                                    <div className="grid grid-cols-1 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Sertifikasi</label>
                                            <input 
                                                type="text" 
                                                value={sertifikasiInput} 
                                                onChange={(e) => setSertifikasiInput(e.target.value)} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="Pisahkan dengan koma, contoh: BLS, ACLS, ATLS"
                                                title="Daftar sertifikasi"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Sertifikasi profesional yang dimiliki</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Kompetensi</label>
                                            <input 
                                                type="text" 
                                                value={kompetensiInput} 
                                                onChange={(e) => setKompetensiInput(e.target.value)} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="Pisahkan dengan koma, contoh: Perawatan Luka, Injeksi IV"
                                                title="Daftar kompetensi"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Keahlian teknis yang dikuasai</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Compensation Section */}
                                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                    <h3 className="font-semibold text-lg text-[#06736a]">Kompensasi</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Gaji Pokok (Rp) *</label>
                                            <input 
                                                type="number" 
                                                name="gajiPokok" 
                                                value={employee.compensation?.gajiPokok || ''} 
                                                onChange={handleCompensationChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                required
                                                min="0"
                                                placeholder="5000000"
                                                title="Gaji pokok"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tunjangan Profesi (Rp)</label>
                                            <input 
                                                type="number" 
                                                name="tunjanganProfesi" 
                                                value={employee.compensation?.tunjanganProfesi || ''} 
                                                onChange={handleCompensationChange} 
                                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                min="0"
                                                placeholder="1000000"
                                                title="Tunjangan profesi"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm text-blue-800">
                                            <span className="font-medium">Total Kompensasi: </span>
                                            Rp {((employee.compensation?.gajiPokok || 0) + (employee.compensation?.tunjanganProfesi || 0)).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 5: DOCUMENTS */}
                        {activeTab === 'documents' && (
                            <div className="space-y-6">
                                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                    <h3 className="font-semibold text-lg text-[#06736a]">Dokumen Karyawan</h3>
                                    
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {documents.map(doc => (
                                            <div key={doc.id} className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow">
                                                <div className="flex-1">
                                                    <p className="font-medium text-base">{doc.name}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-sm text-gray-500">{doc.type}</span>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <a 
                                                            href={doc.fileUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                                        >
                                                            Lihat Dokumen →
                                                        </a>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Diunggah: {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}
                                                    </p>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleDeleteDocument(doc.id)} 
                                                    className="ml-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Hapus dokumen"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {documents.length === 0 && (
                                            <div className="text-center py-12 text-gray-500">
                                                <p className="text-base">📄 Belum ada dokumen yang diunggah.</p>
                                                <p className="text-sm mt-2">Gunakan form di bawah untuk menambahkan dokumen</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Add Document Form */}
                                <div className="space-y-5 p-6 border rounded-lg bg-blue-50 border-blue-200">
                                    <h4 className="font-semibold text-base text-[#06736a]">➕ Tambah Dokumen Baru</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nama Dokumen *</label>
                                            <input 
                                                type="text" 
                                                value={newDoc.name} 
                                                onChange={e => setNewDoc({...newDoc, name: e.target.value})} 
                                                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                placeholder="Contoh: Ijazah S1 Kedokteran"
                                                title="Nama dokumen"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Dokumen *</label>
                                            <select 
                                                value={newDoc.type} 
                                                onChange={e => setNewDoc({...newDoc, type: e.target.value as Document['type']})} 
                                                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                                title="Tipe dokumen"
                                            >
                                                {documentTypeOptions.map(type => (
                                                    <option key={type} value={type}>{type}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Pilih File (PDF/JPG/PNG)</label>
                                            <input 
                                                type="file" 
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={e => setSelectedFile(e.target.files?.[0] || null)} 
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#06736a] file:text-white hover:file:bg-[#055f57] border border-gray-300 rounded-lg shadow-sm p-2"
                                                title="Pilih file dari komputer"
                                            />
                                            {selectedFile && <p className="mt-1 text-xs text-[#06736a]">File siap diunggah: {selectedFile.name}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Atau masukkan URL eksternal</label>
                                            <input 
                                                type="text" 
                                                value={newDoc.fileUrl} 
                                                onChange={e => setNewDoc({...newDoc, fileUrl: e.target.value})} 
                                                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 disabled:opacity-50 disabled:bg-gray-100"
                                                placeholder="https://..."
                                                title="URL file eksternal (opsional jika sudah memilih file)"
                                                disabled={!!selectedFile}
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <button 
                                                type="button" 
                                                onClick={handleAddDocument} 
                                                disabled={isUploadingDoc}
                                                className="w-full bg-[#06736a] text-white px-6 py-3 rounded-lg shadow-sm hover:bg-[#054f46] transition-colors font-medium disabled:opacity-70 flex justify-center items-center"
                                            >
                                                {isUploadingDoc ? 'Sedang Mengunggah...' : '➕ Tambah Dokumen'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Job Description Generator */}
                                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                                    <h4 className="font-semibold text-base text-[#06736a]">✨ Generator Deskripsi Pekerjaan (AI)</h4>
                                    <p className="text-sm text-gray-600">Generate deskripsi pekerjaan otomatis menggunakan AI berdasarkan jabatan dan departemen</p>
                                    
                                    <button 
                                        type="button" 
                                        onClick={handleGenerateDesc} 
                                        disabled={isGenerating || !employee.jabatan || !employee.departemen} 
                                        className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isGenerating ? (
                                            <LoadingSpinner size="small" text="" />
                                        ) : (
                                            <SparklesIcon className="h-5 w-5" />
                                        )}
                                        {isGenerating ? 'Membuat deskripsi...' : 'Generate Deskripsi Pekerjaan'}
                                    </button>

                                    {!employee.jabatan || !employee.departemen && (
                                        <p className="text-xs text-orange-600">⚠️ Isi Jabatan dan Departemen terlebih dahulu (Tab Kepegawaian)</p>
                                    )}

                                    {isGenerating && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 p-3 bg-blue-50 rounded-lg">
                                            <LoadingSpinner size="small" text="" />
                                            <span>AI sedang membuat deskripsi pekerjaan...</span>
                                        </div>
                                    )}

                                    {generatedDesc && (
                                        <div className="mt-4 p-4 bg-white border border-green-200 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="font-medium text-sm text-green-800">✅ Deskripsi Berhasil Dibuat</h5>
                                            </div>
                                            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                                                {generatedDesc}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
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