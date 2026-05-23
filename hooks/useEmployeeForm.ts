import { useState, useEffect } from 'react';
import logger from '../services/logger.ts';
import { Employee, Status, Compensation, Role, Document, Address, EmergencyContact, Education, WorkHistory, BankAccount } from '../types.ts';
import { generateJobDescription } from '../services/geminiService.ts';
import { generateNIK, validateNIK, isNIKUnique } from '../services/nikService.ts';
import { supabase } from '../services/supabaseClient.ts';

export type NewEmployeeData = Omit<Employee, 'id' | 'user_id'> & { password?: string };

interface UseEmployeeFormProps {
    employeeToEdit: Employee | null;
    onSave: (employee: Employee | NewEmployeeData, newPassword?: string) => void;
    currentUserRole: string;
}

export const useEmployeeForm = ({ employeeToEdit, onSave, currentUserRole }: UseEmployeeFormProps) => {
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
    
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const isFormLocked = employee.isLocked || false;
    const isVerified = employee.isVerified || false;
    const isProfileCompleted = employee.isProfileCompleted || false;

    useEffect(() => {
        if (employeeToEdit) {
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
    }, [employeeToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'role') {
            if (value === 'kepala_ruangan' && employee.unitKerjaId) {
                setEmployee({ ...employee, role: value as Role, managedUnitId: employee.unitKerjaId });
            } else {
                setEmployee({ ...employee, role: value as Role, managedUnitId: undefined });
            }
        } else if (name === 'unitKerjaId') {
            if (employee.role === 'kepala_ruangan') {
                setEmployee({ ...employee, unitKerjaId: value, managedUnitId: value });
            } else {
                setEmployee({ ...employee, unitKerjaId: value });
            }
        } else if (name === 'managedUnitId') {
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
            // [HK-min1] Replace alert() with state-based error — alert blocks UI thread and cannot be styled
            setErrors(prev => ({ ...prev, generateDesc: 'Silakan isi Jabatan dan Departemen terlebih dahulu.' }));
            return;
        }
        setErrors(prev => { const e = { ...prev }; delete e.generateDesc; return e; });
        setIsGenerating(true);
        const sertifikasiArray = sertifikasiInput.split(',').map(s => s.trim()).filter(Boolean);
        const kompetensiArray = kompetensiInput.split(',').map(k => k.trim()).filter(Boolean);

        const desc = await generateJobDescription(employee.jabatan, employee.departemen, employee.spesialisasi, kompetensiArray, sertifikasiArray);
        setGeneratedDesc(desc);
        setIsGenerating(false);
    };

    const handleAddDocument = async () => {
        if (!newDoc.name) {
            // [HK-min1] Replace alert() with state-based error
            setErrors(prev => ({ ...prev, docName: 'Nama dokumen harus diisi.' }));
            return;
        }

        if (!selectedFile && !newDoc.fileUrl) {
            setErrors(prev => ({ ...prev, docFile: 'Pilih file dokumen atau masukkan URL.' }));
            return;
        }

        setErrors(prev => { const e = { ...prev }; delete e.docName; delete e.docFile; return e; });

        let finalUrl = newDoc.fileUrl;

        if (selectedFile) {
            setIsUploadingDoc(true);
            try {
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
                logger.error('Upload error', error);
                // [HK-min1] Replace alert() with state-based error
                setErrors(prev => ({ ...prev, docUpload: `Gagal mengunggah file: ${error.message}` }));
                setIsUploadingDoc(false);
                return;
            }
            setIsUploadingDoc(false);
        }

        const docToAdd: Document = {
            ...newDoc,
            fileUrl: finalUrl,
            id: crypto.randomUUID(),
            employeeId: employee.id,
            uploadedAt: new Date().toISOString(),
        };
        setDocuments([...documents, docToAdd]);
        setNewDoc({ name: '', type: 'Lainnya', fileUrl: '' });
        setSelectedFile(null);
    };

    const handleDeleteDocument = (id: string) => {
        setDocuments(documents.filter(doc => doc.id !== id));
    };

    const handleGenerateNIK = async () => {
        if (!employee.departemen || !employee.hireDate) {
            // [HK-min1] Replace alert() with state-based error
            setErrors(prev => ({ ...prev, nik: 'Silakan isi Departemen dan Tanggal Masuk terlebih dahulu.' }));
            return;
        }
        setIsGeneratingNIK(true);
        try {
            const nik = await generateNIK(employee.departemen, employee.hireDate);
            setEmployee({ ...employee, nik });
            setErrors(prev => { const e = { ...prev }; delete e.nik; return e; });
        } catch (error) {
            logger.error('Error generating NIK', error);
            // [HK-min1] Replace alert() with state-based error
            setErrors(prev => ({ ...prev, nik: 'Gagal generate NIK. Silakan coba lagi.' }));
        } finally {
            setIsGeneratingNIK(false);
        }
    };
    
    const validateForm = async (): Promise<boolean> => {
        const newErrors: Record<string, string> = {};
        if (!employee.nama.trim()) {
            newErrors.nama = "Nama tidak boleh kosong";
        }
        if (!employee.email.trim()) {
            newErrors.email = "Email tidak boleh kosong";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
            newErrors.email = "Format email tidak valid";
        }
        if (employee.nik) {
            if (!validateNIK(employee.nik)) {
                newErrors.nik = "Format NIK tidak valid (contoh: 2024-MED-001)";
            } else {
                const excludeId = employeeToEdit ? employee.id : undefined;
                const isUnique = await isNIKUnique(employee.nik, excludeId);
                if (!isUnique) {
                    newErrors.nik = "NIK sudah digunakan oleh karyawan lain";
                }
            }
        }
        if (employee.telepon && !/^[0-9+\-\s]{10,15}$/.test(employee.telepon)) {
            newErrors.telepon = "Format nomor telepon tidak valid";
        }
        if (!employeeToEdit && (!password || password.length < 6)) {
            newErrors.password = "Password minimal 6 karakter";
        }
        if ((employee.jabatan === "Dokter" || employee.jabatan === "Perawat") && !employee.nomorSTR) {
            newErrors.nomorSTR = "Nomor STR wajib diisi untuk Dokter dan Perawat";
        }
        if (employee.role === 'kepala_ruangan' && !employee.managedUnitId) {
            newErrors.managedUnitId = "Unit yang dikelola wajib dipilih untuk Kepala Ruangan";
        }
        if (employee.role !== 'admin' && employee.role !== 'hrd' && !employee.unitKerjaId) {
            newErrors.unitKerjaId = "Unit Kerja wajib dipilih agar karyawan terdeteksi di dashboard";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const isValid = await validateForm();
        if (!isValid) return;
        
        setIsSaving(true);
        
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
    };
    
    const handleVerify = async () => {
        const updatedEmployee = {
            ...employee,
            isVerified: true,
            verifiedAt: new Date().toISOString(),
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

    return {
        employee, setEmployee,
        activeTab, setActiveTab,
        password, setPassword,
        newPassword, setNewPassword,
        showPasswordReset, setShowPasswordReset,
        generatedDesc, setGeneratedDesc,
        isGenerating, setIsGenerating,
        isGeneratingNIK, setIsGeneratingNIK,
        sertifikasiInput, setSertifikasiInput,
        kompetensiInput, setKompetensiInput,
        documents, setDocuments,
        newDoc, setNewDoc,
        selectedFile, setSelectedFile,
        isUploadingDoc, setIsUploadingDoc,
        isSaving, setIsSaving,
        errors, setErrors,
        isFormLocked, isVerified, isProfileCompleted,
        isAdmin, documentTypeOptions,
        
        handleChange,
        handleCompensationChange,
        handleGenerateDesc,
        handleAddDocument,
        handleDeleteDocument,
        handleGenerateNIK,
        validateForm,
        handleSubmit,
        handleVerify,
        handleToggleLock,
        handleAddressChange,
        handleBankAccountChange,
        handleAddEmergencyContact,
        handleUpdateEmergencyContact,
        handleDeleteEmergencyContact,
        handleAddEducation,
        handleUpdateEducation,
        handleDeleteEducation,
        handleAddWorkHistory,
        handleUpdateWorkHistory,
        handleDeleteWorkHistory,
    };
};
