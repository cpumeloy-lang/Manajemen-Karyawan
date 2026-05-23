import { supabase } from './supabaseClient';
import logger from './logger.ts';

// Mapping departemen ke kode singkat
const DEPARTMENT_CODES: Record<string, string> = {
    'Departemen Medis': 'MED',
    'Departemen Keperawatan': 'NUR',
    'Departemen Penunjang Medis': 'SUP',
    'Departemen Administrasi': 'ADM',
    'Departemen Keuangan': 'FIN',
    'Departemen SDM': 'HRD',
};

// Generate NIK otomatis dengan format: TAHUN-DEPT-URUTAN
export const generateNIK = async (departemen: string, hireDate: string): Promise<string> => {
    try {
        // Ambil tahun dari hire date
        const year = new Date(hireDate).getFullYear();
        
        // Dapatkan kode departemen (default 'GEN' jika tidak ada)
        const deptCode = DEPARTMENT_CODES[departemen] || 'GEN';
        
        // Cari NIK terakhir dengan pattern TAHUN-DEPT-XXX
        const pattern = `${year}-${deptCode}-%`;
        const { data: existingEmployees, error } = await supabase
            .from('employees')
            .select('nik')
            .like('nik', pattern)
            .order('nik', { ascending: false })
            .limit(1);
        
        if (error) {
            logger.error('Error fetching existing NIKs', error);
            // Fallback: return basic NIK
            return `${year}-${deptCode}-001`;
        }
        
        // Hitung urutan berikutnya
        let nextNumber = 1;
        if (existingEmployees && existingEmployees.length > 0 && existingEmployees[0].nik) {
            const lastNIK = existingEmployees[0].nik;
            const parts = lastNIK.split('-');
            if (parts.length === 3) {
                const lastNumber = parseInt(parts[2], 10);
                if (!isNaN(lastNumber)) {
                    nextNumber = lastNumber + 1;
                }
            }
        }
        
        // Format dengan leading zeros (3 digit)
        const sequence = nextNumber.toString().padStart(3, '0');
        
        return `${year}-${deptCode}-${sequence}`;
        
    } catch (error) {
        logger.error('Error generating NIK', error);
        // Fallback jika ada error
        const year = new Date(hireDate).getFullYear();
        const deptCode = DEPARTMENT_CODES[departemen] || 'GEN';
        return `${year}-${deptCode}-001`;
    }
};

// Validasi format NIK
export const validateNIK = (nik: string): boolean => {
    // Format: YYYY-XXX-999
    const nikPattern = /^\d{4}-[A-Z]{3}-\d{3}$/;
    return nikPattern.test(nik);
};

// Cek apakah NIK sudah ada (untuk validasi uniqueness)
export const isNIKUnique = async (nik: string, excludeEmployeeId?: string): Promise<boolean> => {
    try {
        let query = supabase
            .from('employees')
            .select('id')
            .eq('nik', nik);
        
        if (excludeEmployeeId) {
            query = query.neq('id', excludeEmployeeId);
        }
        
        const { data, error } = await query;
        
        if (error) {
            logger.error('Error checking NIK uniqueness', error);
            return false;
        }
        
        return !data || data.length === 0;
    } catch (error) {
        logger.error('Error in isNIKUnique', error);
        return false;
    }
};
