import { supabase } from './supabaseClient';

export interface FaceVerificationResult {
  verified: boolean;
  confidence: number;
  matchScore: number;
  message: string;
}

export const faceVerificationService = {
  /**
   * Log face verification attempt to audit log
   */
  async logVerificationAttempt(
    employeeId: string,
    employeeName: string,
    verifyType: 'enrollment' | 'checkin' | 'checkout',
    verified: boolean,
    confidence: number,
    location?: string
  ): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert([{
          entity_type: 'face_verification',
          entity_id: employeeId,
          entity_name: employeeName,
          action: verified ? 'FACE_VERIFIED' : 'FACE_VERIFICATION_FAILED',
          user_role: 'employee',
          status: verified ? 'success' : 'failure',
          metadata: {
            type: verifyType,
            verified,
            confidence: Math.round(confidence * 100) / 100,
            location
          }
        }]);
    } catch (error) {
      console.error('Error logging face verification attempt:', error);
      // Don't throw - logging failure shouldn't block the process
    }
  },

  /**
   * Enroll face descriptor for an employee
   */
  async enrollFace(employeeId: string, faceDescriptor: Float32Array, employeeName: string = 'Unknown'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          face_descriptor: Array.from(faceDescriptor),
          face_verified_at: new Date().toISOString(),
          face_verification_enabled: true
        })
        .eq('id', employeeId);

      if (error) throw error;

      // Log successful enrollment
      await this.logVerificationAttempt(
        employeeId,
        employeeName,
        'enrollment',
        true,
        0.95
      );

      return true;
    } catch (error) {
      console.error('Error enrolling face:', error);
      // Log failed enrollment
      await this.logVerificationAttempt(
        employeeId,
        employeeName,
        'enrollment',
        false,
        0
      );
      return false;
    }
  },

  /**
   * Verify face against stored descriptor
   */
  async verifyFace(
    employeeId: string,
    capturedDescriptor: Float32Array,
    employeeName: string = 'Unknown',
    verifyType: 'checkin' | 'checkout' = 'checkin',
    location?: string
  ): Promise<FaceVerificationResult> {
    try {
      // Get stored face descriptor — use select('*') to avoid 400 when columns don't exist
      const { data: rawEmployee, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error || !rawEmployee) {
        await this.logVerificationAttempt(employeeId, employeeName, verifyType, false, 0, location);
        return {
          verified: false,
          confidence: 0,
          matchScore: 0,
          message: 'Employee data not found'
        };
      }

      const employee = rawEmployee as Record<string, any>;

      if (!employee.face_verification_enabled || !employee.face_descriptor) {
        await this.logVerificationAttempt(employeeId, employeeName, verifyType, false, 0, location);
        return {
          verified: false,
          confidence: 0,
          matchScore: 0,
          message: 'Face verification not enrolled for this employee'
        };
      }

      // Calculate similarity
      const storedDescriptor = new Float32Array(employee.face_descriptor);
      const distance = this.calculateEuclideanDistance(capturedDescriptor, storedDescriptor);
      const matchScore = Math.max(0, 1 - distance); // Convert distance to similarity score

      // Threshold for verification (adjust based on testing)
      const threshold = 0.6;
      const verified = matchScore >= threshold;

      // Log verification attempt
      await this.logVerificationAttempt(
        employeeId,
        employeeName,
        verifyType,
        verified,
        matchScore,
        location
      );

      return {
        verified,
        confidence: matchScore,
        matchScore,
        message: verified
          ? `Face verified with ${Math.round(matchScore * 100)}% confidence`
          : `Face verification failed. Similarity: ${Math.round(matchScore * 100)}%`
      };
    } catch (error) {
      console.error('Error verifying face:', error);
      return {
        verified: false,
        confidence: 0,
        matchScore: 0,
        message: 'Face verification error'
      };
    }
  },

  /**
   * Calculate Euclidean distance between two face descriptors
   */
  calculateEuclideanDistance(desc1: Float32Array, desc2: Float32Array): number {
    if (desc1.length !== desc2.length) return 1;

    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
      const diff = desc1[i] - desc2[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  },

  /**
   * Check if employee has enrolled face
   */
  async hasEnrolledFace(employeeId: string): Promise<boolean> {
    try {
      // Use select('*') to avoid 400 error when face columns don't exist yet
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error || !data) return false;

      // Check if face columns exist in the returned data
      const emp = data as Record<string, any>;
      return emp.face_verification_enabled === true ||
        (Array.isArray(emp.face_descriptor) && emp.face_descriptor.length > 0);
    } catch {
      return false;
    }
  }
};