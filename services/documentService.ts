/**
 * Document Storage Service
 * Handle upload, download, dan delete dokumen
 */

import { supabase } from './supabaseClient';

export interface DocumentMetadata {
    id?: string;
    employeeId: string;
    fileName: string;
    fileUrl: string;
    fileType: string; // 'ktp', 'ijazah', 'str', 'contract', 'payslip', dll
    fileSize?: number;
    mimeType?: string;
    uploadedBy?: string;
    uploadedAt?: string;
    expiresAt?: string; // untuk dokumen dengan masa berlaku (STR, SIP)
    isVerified?: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    notes?: string;
}

const mapDocumentFromDatabase = (row: any): DocumentMetadata => ({
    id: row.id,
    employeeId: row.employeeId ?? row.employee_id ?? '',
    fileName: row.fileName ?? row.name ?? '',
    fileUrl: row.fileUrl ?? row.file_url ?? '',
    fileType: row.fileType ?? row.type ?? '',
    fileSize: row.fileSize ?? row.file_size,
    mimeType: row.mimeType ?? row.mime_type,
    uploadedBy: row.uploadedBy ?? row.uploaded_by,
    uploadedAt: row.uploadedAt ?? row.uploaded_at ?? '',
    expiresAt: row.expiresAt ?? row.expires_at,
    isVerified: row.isVerified ?? row.is_verified,
    verifiedBy: row.verifiedBy ?? row.verified_by,
    verifiedAt: row.verifiedAt ?? row.verified_at,
    notes: row.notes,
});

// Tipe file yang diizinkan
const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

// Ukuran maksimal file (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validasi file sebelum upload
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: 'Format file tidak didukung. Gunakan PDF, JPG, PNG, atau DOC.'
        };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `Ukuran file terlalu besar. Maksimal ${MAX_FILE_SIZE / 1024 / 1024}MB.`
        };
    }

    return { valid: true };
};

/**
 * Generate file name yang unik
 */
const generateFileName = (employeeId: string, documentType: string, originalName: string): string => {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    return `${employeeId}_${documentType}_${timestamp}.${extension}`;
};

/**
 * Upload dokumen ke Supabase Storage
 * ALTERNATIVE: Upload ke local public/documents/
 */
export const uploadDocument = async (
    file: File,
    employeeId: string,
    documentType: string,
    uploadedBy: string
): Promise<{ success: boolean; data?: DocumentMetadata; error?: string }> => {
    try {
        // Validasi file
        const validation = validateFile(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Generate unique file name
        const fileName = generateFileName(employeeId, documentType, file.name);
        
        // Tentukan folder berdasarkan tipe dokumen
        let folder = 'employees';
        if (documentType.includes('payslip') || documentType.includes('salary')) {
            folder = 'payroll';
        } else if (documentType.includes('contract')) {
            folder = 'contracts';
        } else if (documentType.includes('certificate') || documentType === 'str' || documentType === 'sip') {
            folder = 'certificates';
        }

        const filePath = `${folder}/${employeeId}/${fileName}`;

        // OPTION 1: Upload ke Supabase Storage (Recommended)
        const { data: storageData, error: storageError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (storageError) {
            console.error('Storage error:', storageError);
            return { success: false, error: `Gagal upload file: ${storageError.message}` };
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

        // Save metadata ke database
        const documentMetadata = {
            employeeId,
            fileName: file.name,
            fileUrl: publicUrl,
            fileType: documentType,
            uploadedBy,
            uploadedAt: new Date().toISOString(),
        };

        const { data: dbData, error: dbError } = await supabase
            .from('documents')
            .insert({
                employeeId: documentMetadata.employeeId,
                name: documentMetadata.fileName,
                type: documentMetadata.fileType,
                fileUrl: documentMetadata.fileUrl,
                uploadedAt: documentMetadata.uploadedAt,
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database error:', dbError);
            // Rollback: hapus file dari storage
            await supabase.storage.from('documents').remove([filePath]);
            return { success: false, error: `Gagal menyimpan metadata: ${dbError.message}` };
        }

        return { success: true, data: mapDocumentFromDatabase(dbData) };

    } catch (error) {
        console.error('Upload error:', error);
        return { success: false, error: 'Terjadi kesalahan saat upload dokumen' };
    }
};

/**
 * Download dokumen
 */
export const downloadDocument = async (fileUrl: string, fileName: string): Promise<void> => {
    try {
        // Extract file path from URL
        const urlParts = fileUrl.split('/');
        const bucket = urlParts[urlParts.length - 4];
        const filePath = urlParts.slice(-3).join('/');

        const { data, error } = await supabase.storage
            .from(bucket)
            .download(filePath);

        if (error) throw error;

        // Create download link
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Download error:', error);
        throw new Error('Gagal download dokumen');
    }
};

/**
 * Delete dokumen
 */
export const deleteDocument = async (documentId: string, fileUrl: string): Promise<{ success: boolean; error?: string }> => {
    try {
        // Extract file path from URL
        const urlParts = fileUrl.split('/');
        const filePath = urlParts.slice(-3).join('/');

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([filePath]);

        if (storageError) {
            console.error('Storage delete error:', storageError);
            return { success: false, error: storageError.message };
        }

        // Delete from database
        const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId);

        if (dbError) {
            console.error('Database delete error:', dbError);
            return { success: false, error: dbError.message };
        }

        return { success: true };

    } catch (error) {
        console.error('Delete error:', error);
        return { success: false, error: 'Gagal menghapus dokumen' };
    }
};

/**
 * Get documents by employee
 */
export const getEmployeeDocuments = async (employeeId: string): Promise<DocumentMetadata[]> => {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('employeeId', employeeId)
        .order('uploadedAt', { ascending: false });

    if (error) {
        console.error('Get documents error:', error);
        return [];
    }

    return (data || []).map(mapDocumentFromDatabase);
};

/**
 * Verify dokumen (untuk admin/HRD)
 */
export const verifyDocument = async (
    documentId: string,
    verifiedBy: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase
        .from('documents')
        .update({
            isVerified: true,
            verifiedBy,
            verifiedAt: new Date().toISOString(),
            notes
        })
        .eq('id', documentId);

    if (error) {
        console.error('Verify error:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
};

/**
 * Get documents yang akan expired
 */
export const getExpiringDocuments = async (daysBeforeExpiry: number = 30): Promise<DocumentMetadata[]> => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysBeforeExpiry);

    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .lte('expiresAt', expiryDate.toISOString())
        .gte('expiresAt', new Date().toISOString())
        .order('expiresAt', { ascending: true });

    if (error) {
        console.error('Get expiring documents error:', error);
        return [];
    }

    return data || [];
};
