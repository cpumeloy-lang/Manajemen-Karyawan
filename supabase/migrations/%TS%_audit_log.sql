-- =============================================
-- AUDIT LOG SYSTEM
-- Mencatat semua aktivitas yang dilakukan admin
-- =============================================

-- 1. Buat tabel audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Siapa yang melakukan
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    
    -- Apa yang dilakukan
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    entity_type TEXT NOT NULL, -- 'employee', 'attendance', 'request', 'payroll', 'unit', 'department', 'position'
    entity_id UUID, -- ID dari data yang diubah
    entity_name TEXT, -- Nama dari data yang diubah (untuk referensi)
    
    -- Detail perubahan
    old_data JSONB, -- Data sebelum perubahan (untuk UPDATE dan DELETE)
    new_data JSONB, -- Data setelah perubahan (untuk CREATE dan UPDATE)
    changes JSONB, -- Ringkasan field yang berubah
    
    -- Metadata
    description TEXT, -- Deskripsi human-readable
    ip_address TEXT, -- IP address user (optional)
    user_agent TEXT, -- Browser info (optional)
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 3. RLS Policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin bisa melihat semua audit logs
CREATE POLICY "Admin can view all audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.role = 'admin'
        )
    );

-- Admin bisa insert audit logs (melalui aplikasi)
CREATE POLICY "Admin can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.role = 'admin'
        )
    );

-- Tidak ada yang bisa update atau delete audit logs (immutable)
-- Audit logs hanya bisa dibuat, tidak bisa diubah atau dihapus

-- 4. Function untuk membuat audit log otomatis (trigger-based)
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
    v_action TEXT;
    v_entity_name TEXT;
    v_changes JSONB;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();
    
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
    
    SELECT nama INTO v_user_name
    FROM public.employees
    WHERE user_id = v_user_id;
    
    -- Determine action
    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE';
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
    END IF;
    
    -- Get entity name based on table
    IF TG_TABLE_NAME = 'employees' THEN
        IF TG_OP = 'DELETE' THEN
            v_entity_name := OLD.nama;
        ELSE
            v_entity_name := NEW.nama;
        END IF;
    END IF;
    
    -- Calculate changes for UPDATE
    IF TG_OP = 'UPDATE' THEN
        v_changes := jsonb_build_object(
            'changed_fields', (
                SELECT jsonb_object_agg(key, jsonb_build_object('old', old_value, 'new', new_value))
                FROM (
                    SELECT key, 
                           to_jsonb(OLD) -> key AS old_value,
                           to_jsonb(NEW) -> key AS new_value
                    FROM jsonb_object_keys(to_jsonb(NEW)) AS key
                    WHERE to_jsonb(OLD) -> key IS DISTINCT FROM to_jsonb(NEW) -> key
                ) changes
            )
        );
    END IF;
    
    -- Insert audit log
    INSERT INTO public.audit_logs (
        user_id,
        user_email,
        user_name,
        action,
        entity_type,
        entity_id,
        entity_name,
        old_data,
        new_data,
        changes,
        description
    ) VALUES (
        v_user_id,
        COALESCE(v_user_email, 'unknown'),
        COALESCE(v_user_name, 'Unknown User'),
        v_action,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        v_entity_name,
        CASE 
            WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD)
            ELSE NULL
        END,
        CASE 
            WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW)
            ELSE NULL
        END,
        v_changes,
        CASE 
            WHEN TG_OP = 'INSERT' THEN v_user_name || ' menambahkan ' || TG_TABLE_NAME || ' baru: ' || v_entity_name
            WHEN TG_OP = 'UPDATE' THEN v_user_name || ' mengubah ' || TG_TABLE_NAME || ': ' || v_entity_name
            WHEN TG_OP = 'DELETE' THEN v_user_name || ' menghapus ' || TG_TABLE_NAME || ': ' || v_entity_name
        END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Buat triggers untuk tabel-tabel penting
-- Trigger untuk employees
DROP TRIGGER IF EXISTS audit_employees_trigger ON public.employees;
CREATE TRIGGER audit_employees_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.create_audit_log();

-- Trigger untuk attendance
DROP TRIGGER IF EXISTS audit_attendance_trigger ON public.attendance;
CREATE TRIGGER audit_attendance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.create_audit_log();

-- Trigger untuk requests
DROP TRIGGER IF EXISTS audit_requests_trigger ON public.requests;
CREATE TRIGGER audit_requests_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION public.create_audit_log();

-- Trigger untuk units
DROP TRIGGER IF EXISTS audit_units_trigger ON public.units;
CREATE TRIGGER audit_units_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION public.create_audit_log();

-- Trigger untuk departments
DROP TRIGGER IF EXISTS audit_departments_trigger ON public.departments;
CREATE TRIGGER audit_departments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.create_audit_log();

-- Trigger untuk positions
DROP TRIGGER IF EXISTS audit_positions_trigger ON public.positions;
CREATE TRIGGER audit_positions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.positions
    FOR EACH ROW
    EXECUTE FUNCTION public.create_audit_log();

-- 6. Grant permissions
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

-- =============================================
-- SELESAI!
-- =============================================
-- Cara menggunakan:
-- 1. Jalankan script ini di Supabase SQL Editor
-- 2. Setiap kali admin melakukan perubahan (CREATE/UPDATE/DELETE), 
--    akan otomatis tercatat di tabel audit_logs
-- 3. Gunakan query berikut untuk melihat history:
--
-- -- Lihat semua aktivitas
-- SELECT * FROM audit_logs ORDER BY created_at DESC;
--
-- -- Lihat aktivitas user tertentu
-- SELECT * FROM audit_logs WHERE user_email = 'admin@example.com' ORDER BY created_at DESC;
--
-- -- Lihat perubahan pada employee tertentu
-- SELECT * FROM audit_logs WHERE entity_type = 'employees' AND entity_id = 'xxx' ORDER BY created_at DESC;
--
-- -- Lihat aktivitas hari ini
-- SELECT * FROM audit_logs WHERE created_at >= CURRENT_DATE ORDER BY created_at DESC;
-- =============================================
