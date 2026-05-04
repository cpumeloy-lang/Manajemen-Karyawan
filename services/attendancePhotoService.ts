import { supabase } from './supabaseClient';

const BUCKET_NAME = 'attendance-photos';

/**
 * Upload foto absensi (check-in / check-out) ke Supabase Storage.
 * Path: attendance-photos/{employeeId}/{YYYY-MM-DD}/{timestamp}-{action}.jpg
 *
 * Returns public URL string on success, empty string on failure (non-blocking).
 */
export async function uploadAttendancePhoto(
  blob: Blob,
  employeeId: string,
  action: 'checkin' | 'checkout'
): Promise<string> {
  try {
    const now = new Date();
    const dateFolder = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const ts = now.getTime();
    const filePath = `${employeeId}/${dateFolder}/${ts}-${action}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('[attendancePhotoService] Upload error:', uploadError.message);
      return '';
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return urlData?.publicUrl ?? '';
  } catch (err: any) {
    console.error('[attendancePhotoService] Unexpected error:', err.message);
    return '';
  }
}
