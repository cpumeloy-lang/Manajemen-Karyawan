export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          user_id: string | null
          nik: string | null
          nama: string
          foto: string | null
          jabatan: string | null
          departemen: string | null
          email: string
          telepon: string | null
          hireDate: string | null
          birthDate: string | null
          status: string | null
          shift: string | null
          sisaCuti: number | null
          role: string | null
          spesialisasi: string | null
          kredensial: string | null
          nomorSTR: string | null
          tanggalKadaluarsaSTR: string | null
          unitKerjaId: string | null
          sertifikasi: string[] | null
          kompetensi: string[] | null
          compensation: Json | null
          ktpNumber: string | null
          npwp: string | null
          bpjsKesehatan: string | null
          bpjsKetenagakerjaan: string | null
          maritalStatus: string | null
          dependents: number | null
          address: Json | null
          emergencyContacts: Json | null
          education: Json | null
          workHistory: Json | null
          bankAccount: Json | null
          isProfileCompleted: boolean | null
          isVerified: boolean | null
          verifiedBy: string | null
          verifiedAt: string | null
          isLocked: boolean | null
          managedUnitId: string | null
          face_descriptor: number[] | null
          face_verified_at: string | null
          face_verification_enabled: boolean | null
          ktp_number: string | null
          gajiPokok: number | null
          tunjanganProfesi: number | null
          bpjs_kesehatan: string | null
          bpjs_ketenagakerjaan: string | null
          agama: string | null
          marital_status: string | null
          emergency_contacts: Json | null
          work_history: Json | null
          bank_account: Json | null
          is_profile_completed: boolean | null
          is_verified: boolean | null
          verified_by: string | null
          verified_at: string | null
          is_locked: boolean | null
          managed_unit_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          nik?: string | null
          nama: string
          foto?: string | null
          jabatan?: string | null
          departemen?: string | null
          email: string
          telepon?: string | null
          hireDate?: string | null
          birthDate?: string | null
          status?: string | null
          shift?: string | null
          sisaCuti?: number | null
          role?: string | null
          spesialisasi?: string | null
          kredensial?: string | null
          nomorSTR?: string | null
          tanggalKadaluarsaSTR?: string | null
          unitKerjaId?: string | null
          sertifikasi?: string[] | null
          kompetensi?: string[] | null
          compensation?: Json | null
          ktpNumber?: string | null
          npwp?: string | null
          bpjsKesehatan?: string | null
          bpjsKetenagakerjaan?: string | null
          maritalStatus?: string | null
          dependents?: number | null
          address?: Json | null
          emergencyContacts?: Json | null
          education?: Json | null
          workHistory?: Json | null
          bankAccount?: Json | null
          isProfileCompleted?: boolean | null
          isVerified?: boolean | null
          verifiedBy?: string | null
          verifiedAt?: string | null
          isLocked?: boolean | null
          managedUnitId?: string | null
          face_descriptor?: number[] | null
          face_verified_at?: string | null
          face_verification_enabled?: boolean | null
          ktp_number?: string | null
          gajiPokok?: number | null
          tunjanganProfesi?: number | null
          bpjs_kesehatan?: string | null
          bpjs_ketenagakerjaan?: string | null
          agama?: string | null
          marital_status?: string | null
          emergency_contacts?: Json | null
          work_history?: Json | null
          bank_account?: Json | null
          is_profile_completed?: boolean | null
          is_verified?: boolean | null
          verified_by?: string | null
          verified_at?: string | null
          is_locked?: boolean | null
          managed_unit_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          nik?: string | null
          nama?: string
          foto?: string | null
          jabatan?: string | null
          departemen?: string | null
          email?: string
          telepon?: string | null
          hireDate?: string | null
          birthDate?: string | null
          status?: string | null
          shift?: string | null
          sisaCuti?: number | null
          role?: string | null
          spesialisasi?: string | null
          kredensial?: string | null
          nomorSTR?: string | null
          tanggalKadaluarsaSTR?: string | null
          unitKerjaId?: string | null
          sertifikasi?: string[] | null
          kompetensi?: string[] | null
          compensation?: Json | null
          ktpNumber?: string | null
          npwp?: string | null
          bpjsKesehatan?: string | null
          bpjsKetenagakerjaan?: string | null
          maritalStatus?: string | null
          dependents?: number | null
          address?: Json | null
          emergencyContacts?: Json | null
          education?: Json | null
          workHistory?: Json | null
          bankAccount?: Json | null
          isProfileCompleted?: boolean | null
          isVerified?: boolean | null
          verifiedBy?: string | null
          verifiedAt?: string | null
          isLocked?: boolean | null
          managedUnitId?: string | null
          face_descriptor?: number[] | null
          face_verified_at?: string | null
          face_verification_enabled?: boolean | null
          ktp_number?: string | null
          gajiPokok?: number | null
          tunjanganProfesi?: number | null
          bpjs_kesehatan?: string | null
          bpjs_ketenagakerjaan?: string | null
          agama?: string | null
          marital_status?: string | null
          emergency_contacts?: Json | null
          work_history?: Json | null
          bank_account?: Json | null
          is_profile_completed?: boolean | null
          is_verified?: boolean | null
          verified_by?: string | null
          verified_at?: string | null
          is_locked?: boolean | null
          managed_unit_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      units: {
        Row: {
          id: string
          nama: string
          shifts: Json | null
          shift_assignments: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          nama: string
          shifts?: Json | null
          shift_assignments?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          nama?: string
          shifts?: Json | null
          shift_assignments?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          id: string
          nama: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          nama: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          nama?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      positions: {
        Row: {
          id: string
          nama: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          nama: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          nama?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          institution_name: string
          institution_type: string | null
          logo_url: string | null
          address: string | null
          phone: string | null
          default_shifts: Json | null
          overtime_rate_per_hour: number | null
          bpjs_kesehatan_rate: number | null
          bpjs_kesehatan_max_wage: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          institution_name: string
          institution_type?: string | null
          logo_url?: string | null
          address?: string | null
          phone?: string | null
          default_shifts?: Json | null
          overtime_rate_per_hour?: number | null
          bpjs_kesehatan_rate?: number | null
          bpjs_kesehatan_max_wage?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          institution_name?: string
          institution_type?: string | null
          logo_url?: string | null
          address?: string | null
          phone?: string | null
          default_shifts?: Json | null
          overtime_rate_per_hour?: number | null
          bpjs_kesehatan_rate?: number | null
          bpjs_kesehatan_max_wage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          id: string
          employeeId: string | null
          employee_id: string | null
          tanggal: string | null
          date: string | null
          clockIn: string | null
          clock_in: string | null
          clockOut: string | null
          clock_out: string | null
          location: string | null
          latitude: number | null
          longitude: number | null
          isLate: boolean | null
          is_late: boolean | null
          overtimeHours: number | null
          overtime_hours: number | null
          status: string | null
          source: string | null
          notes: string | null
          photoUrl: string | null
          photo_url: string | null
          deviceId: string | null
          device_id: string | null
          biometricType: string | null
          biometric_type: string | null
          biometricVerified: boolean | null
          biometric_verified: boolean | null
          faceMatchScoreCheckIn: number | null
          face_match_score_check_in: number | null
          faceMatchScoreCheckOut: number | null
          face_match_score_check_out: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employeeId?: string | null
          employee_id?: string | null
          tanggal?: string | null
          date?: string | null
          clockIn?: string | null
          clock_in?: string | null
          clockOut?: string | null
          clock_out?: string | null
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          isLate?: boolean | null
          is_late?: boolean | null
          overtimeHours?: number | null
          overtime_hours?: number | null
          status?: string | null
          source?: string | null
          notes?: string | null
          photoUrl?: string | null
          photo_url?: string | null
          deviceId?: string | null
          device_id?: string | null
          biometricType?: string | null
          biometric_type?: string | null
          biometricVerified?: boolean | null
          biometric_verified?: boolean | null
          faceMatchScoreCheckIn?: number | null
          face_match_score_check_in?: number | null
          faceMatchScoreCheckOut?: number | null
          face_match_score_check_out?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employeeId?: string | null
          employee_id?: string | null
          tanggal?: string | null
          date?: string | null
          clockIn?: string | null
          clock_in?: string | null
          clockOut?: string | null
          clock_out?: string | null
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          isLate?: boolean | null
          is_late?: boolean | null
          overtimeHours?: number | null
          overtime_hours?: number | null
          status?: string | null
          source?: string | null
          notes?: string | null
          photoUrl?: string | null
          photo_url?: string | null
          deviceId?: string | null
          device_id?: string | null
          biometricType?: string | null
          biometric_type?: string | null
          biometricVerified?: boolean | null
          biometric_verified?: boolean | null
          faceMatchScoreCheckIn?: number | null
          face_match_score_check_in?: number | null
          faceMatchScoreCheckOut?: number | null
          face_match_score_check_out?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      requests: {
        Row: {
          id: string
          employeeId: string | null
          employee_id: string | null
          type: string | null
          startDate: string | null
          start_date: string | null
          endDate: string | null
          end_date: string | null
          date: string | null
          reason: string | null
          description: string | null
          amount: number | null
          status: string | null
          requestedAt: string | null
          requested_at: string | null
          approvedBy: string | null
          approved_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employeeId?: string | null
          employee_id?: string | null
          type?: string | null
          startDate?: string | null
          start_date?: string | null
          endDate?: string | null
          end_date?: string | null
          date?: string | null
          reason?: string | null
          description?: string | null
          amount?: number | null
          status?: string | null
          requestedAt?: string | null
          requested_at?: string | null
          approvedBy?: string | null
          approved_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employeeId?: string | null
          employee_id?: string | null
          type?: string | null
          startDate?: string | null
          start_date?: string | null
          endDate?: string | null
          end_date?: string | null
          date?: string | null
          reason?: string | null
          description?: string | null
          amount?: number | null
          status?: string | null
          requestedAt?: string | null
          requested_at?: string | null
          approvedBy?: string | null
          approved_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          employeeId: string | null
          employee_id: string | null
          name: string | null
          type: string | null
          fileUrl: string | null
          file_url: string | null
          uploadedAt: string | null
          uploaded_at: string | null
          expiresAt: string | null
          expires_at: string | null
          notes: string | null
          isVerified: boolean | null
          verifiedBy: string | null
          verifiedAt: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          employeeId?: string | null
          employee_id?: string | null
          name?: string | null
          type?: string | null
          fileUrl?: string | null
          file_url?: string | null
          uploadedAt?: string | null
          uploaded_at?: string | null
          expiresAt?: string | null
          expires_at?: string | null
          notes?: string | null
          isVerified?: boolean | null
          verifiedBy?: string | null
          verifiedAt?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          employeeId?: string | null
          employee_id?: string | null
          name?: string | null
          type?: string | null
          fileUrl?: string | null
          file_url?: string | null
          uploadedAt?: string | null
          uploaded_at?: string | null
          expiresAt?: string | null
          expires_at?: string | null
          notes?: string | null
          isVerified?: boolean | null
          verifiedBy?: string | null
          verifiedAt?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          user_email: string | null
          user_name: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          entity_name: string | null
          old_data: Json | null
          new_data: Json | null
          changes: Json | null
          description: string | null
          portal_type: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          user_name?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          entity_name?: string | null
          old_data?: Json | null
          new_data?: Json | null
          changes?: Json | null
          description?: string | null
          portal_type?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          user_name?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          entity_name?: string | null
          old_data?: Json | null
          new_data?: Json | null
          changes?: Json | null
          description?: string | null
          portal_type?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      attendance_change_requests: {
        Row: {
          id: string
          employee_id: string
          attendance_date: string
          request_type: string
          reason_code: string
          reason_detail: string | null
          proposed_data: Json
          current_data: Json | null
          source_portal: string | null
          maker_user_id: string | null
          maker_employee_id: string | null
          maker_device_fingerprint: string | null
          maker_ip_address: string | null
          maker_user_agent: string | null
          location_lat: number | null
          location_lng: number | null
          location_text: string | null
          location_distance_meters: number | null
          location_verified: boolean
          status: string
          checker_user_id: string | null
          review_note: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          attendance_date: string
          request_type: string
          reason_code: string
          reason_detail?: string | null
          proposed_data: Json
          current_data?: Json | null
          source_portal?: string | null
          maker_user_id?: string | null
          maker_employee_id?: string | null
          maker_device_fingerprint?: string | null
          maker_ip_address?: string | null
          maker_user_agent?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string | null
          location_distance_meters?: number | null
          location_verified?: boolean
          status?: string
          checker_user_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          attendance_date?: string
          request_type?: string
          reason_code?: string
          reason_detail?: string | null
          proposed_data?: Json
          current_data?: Json | null
          source_portal?: string | null
          maker_user_id?: string | null
          maker_employee_id?: string | null
          maker_device_fingerprint?: string | null
          maker_ip_address?: string | null
          maker_user_agent?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string | null
          location_distance_meters?: number | null
          location_verified?: boolean
          status?: string
          checker_user_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_revision_history: {
        Row: {
          id: number
          attendance_id: string | null
          request_id: string | null
          employee_id: string
          attendance_date: string
          action: string
          before_data: Json | null
          after_data: Json | null
          reason_code: string | null
          reason_detail: string | null
          changed_by: string | null
          created_at: string
        }
        Insert: {
          id?: number
          attendance_id?: string | null
          request_id?: string | null
          employee_id: string
          attendance_date: string
          action: string
          before_data?: Json | null
          after_data?: Json | null
          reason_code?: string | null
          reason_detail?: string | null
          changed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          attendance_id?: string | null
          request_id?: string | null
          employee_id?: string
          attendance_date?: string
          action?: string
          before_data?: Json | null
          after_data?: Json | null
          reason_code?: string | null
          reason_detail?: string | null
          changed_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      rotation_patterns: {
        Row: {
          id: string
          unit_id: string
          name: string
          description: string | null
          pattern: string[]
          cycle_days: number
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unit_id: string
          name: string
          description?: string | null
          pattern: string[]
          cycle_days: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unit_id?: string
          name?: string
          description?: string | null
          pattern?: string[]
          cycle_days?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_schedules: {
        Row: {
          id: string
          employee_id: string
          unit_id: string
          schedule_date: string
          shift_name: string
          shift_start_time: string | null
          shift_end_time: string | null
          is_off_day: boolean
          status: string
          swapped_with_employee_id: string | null
          swapped_with_schedule_id: string | null
          swap_reason: string | null
          swap_approved_by: string | null
          swap_approved_at: string | null
          generated_from_pattern_id: string | null
          rotation_day_index: number | null
          override_reason: string | null
          override_by: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          unit_id: string
          schedule_date: string
          shift_name: string
          shift_start_time?: string | null
          shift_end_time?: string | null
          is_off_day?: boolean
          status?: string
          swapped_with_employee_id?: string | null
          swapped_with_schedule_id?: string | null
          swap_reason?: string | null
          swap_approved_by?: string | null
          swap_approved_at?: string | null
          generated_from_pattern_id?: string | null
          rotation_day_index?: number | null
          override_reason?: string | null
          override_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          unit_id?: string
          schedule_date?: string
          shift_name?: string
          shift_start_time?: string | null
          shift_end_time?: string | null
          is_off_day?: boolean
          status?: string
          swapped_with_employee_id?: string | null
          swapped_with_schedule_id?: string | null
          swap_reason?: string | null
          swap_approved_by?: string | null
          swap_approved_at?: string | null
          generated_from_pattern_id?: string | null
          rotation_day_index?: number | null
          override_reason?: string | null
          override_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_publish_logs: {
        Row: {
          id: string
          unit_id: string
          period_start: string
          period_end: string
          total_schedules: number | null
          total_employees: number | null
          published_by: string
          published_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          unit_id: string
          period_start: string
          period_end: string
          total_schedules?: number | null
          total_employees?: number | null
          published_by: string
          published_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          unit_id?: string
          period_start?: string
          period_end?: string
          total_schedules?: number | null
          total_employees?: number | null
          published_by?: string
          published_at?: string
          notes?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_schedule_from_pattern: {
        Args: {
          p_employee_id: string
          p_unit_id: string
          p_pattern_id: string
          p_start_date: string
          p_end_date: string
          p_rotation_offset: number
          p_created_by: string
        }
        Returns: number
      }
      publish_unit_schedules: {
        Args: {
          p_unit_id: string
          p_start_date: string
          p_end_date: string
          p_published_by: string
        }
        Returns: number
      }
      validate_weekly_hours: {
        Args: {
          p_employee_id: string
          p_week_start: string
        }
        Returns: {
          total_scheduled_days: number
          total_work_days: number
          total_off_days: number
          estimated_hours: number
          exceeds_limit: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
