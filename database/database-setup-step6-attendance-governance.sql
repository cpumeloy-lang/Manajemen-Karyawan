-- STEP 6: Attendance Governance (Maker-Checker + Revision History)
-- Jalankan setelah database-setup-step5-audit-log.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper: role user saat ini
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT e.role
    FROM public.employees e
    WHERE e."user_id" = auth.uid()
    LIMIT 1;
$$;

-- Helper: apakah user termasuk peran operasional
CREATE OR REPLACE FUNCTION public.is_operational_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(public.current_user_role() IN ('admin', 'hrd', 'hr', 'kepala_ruangan'), FALSE);
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_operational_user() TO authenticated;

-- Reason code terstruktur untuk perubahan manual
CREATE TABLE IF NOT EXISTS public.attendance_reason_codes (
    code TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO public.attendance_reason_codes (code, label, description)
VALUES
    ('FORGOT_CHECK_IN', 'Lupa Check-in', 'Karyawan lupa melakukan check-in tepat waktu.'),
    ('FORGOT_CHECK_OUT', 'Lupa Check-out', 'Karyawan lupa melakukan check-out tepat waktu.'),
    ('DEVICE_FAILURE', 'Gangguan Perangkat', 'Perangkat absensi tidak dapat digunakan.'),
    ('NETWORK_FAILURE', 'Gangguan Jaringan', 'Kendala jaringan saat absensi.'),
    ('SHIFT_ADJUSTMENT', 'Penyesuaian Shift', 'Perubahan jadwal/shift terkonfirmasi.'),
    ('EMERGENCY_OVERRIDE', 'Emergency Override', 'Koreksi karena kondisi darurat operasional.'),
    ('BULK_IMPORT_FIX', 'Perbaikan Bulk Import', 'Perbaikan massal hasil import data absensi.')
ON CONFLICT (code) DO NOTHING;

-- Request perubahan absensi (maker-checker)
CREATE TABLE IF NOT EXISTS public.attendance_change_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    request_type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (request_type IN ('single', 'bulk_import')),
    reason_code TEXT NOT NULL REFERENCES public.attendance_reason_codes(code),
    reason_detail TEXT,
    proposed_data JSONB NOT NULL,
    current_data JSONB,
    source_portal VARCHAR(20) NOT NULL DEFAULT 'operational' CHECK (source_portal IN ('personal', 'operational')),
    maker_user_id UUID NOT NULL DEFAULT auth.uid(),
    maker_employee_id TEXT,
    maker_device_fingerprint TEXT,
    maker_ip_address VARCHAR(45),
    maker_user_agent TEXT,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    location_text TEXT,
    location_distance_meters DOUBLE PRECISION,
    location_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    checker_user_id UUID,
    review_note TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_change_requests_status_time
    ON public.attendance_change_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_change_requests_employee_date
    ON public.attendance_change_requests(employee_id, attendance_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_change_requests_employee_date_pending
    ON public.attendance_change_requests(employee_id, attendance_date)
    WHERE status = 'pending';

-- Riwayat revisi spesifik per record absensi
CREATE TABLE IF NOT EXISTS public.attendance_revision_history (
    id BIGSERIAL PRIMARY KEY,
    attendance_id TEXT,
    request_id TEXT REFERENCES public.attendance_change_requests(id) ON DELETE SET NULL,
    employee_id TEXT NOT NULL,
    attendance_date DATE NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('APPROVE', 'REJECT', 'SYSTEM')),
    before_data JSONB,
    after_data JSONB,
    reason_code TEXT,
    reason_detail TEXT,
    changed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_revision_employee_date
    ON public.attendance_revision_history(employee_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_revision_request
    ON public.attendance_revision_history(request_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_attendance_change_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.set_attendance_change_request_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS trigger_set_attendance_change_request_updated_at ON public.attendance_change_requests;
CREATE TRIGGER trigger_set_attendance_change_request_updated_at
    BEFORE UPDATE ON public.attendance_change_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_attendance_change_request_updated_at();

CREATE OR REPLACE FUNCTION public.validate_attendance_change_request_review()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('approved', 'rejected') THEN
        IF NEW.checker_user_id IS NULL THEN
            NEW.checker_user_id := auth.uid();
        END IF;

        IF NEW.checker_user_id = NEW.maker_user_id THEN
            RAISE EXCEPTION 'Maker dan checker tidak boleh user yang sama';
        END IF;

        IF NEW.reviewed_at IS NULL THEN
            NEW.reviewed_at := NOW();
        END IF;

        IF NEW.status = 'rejected' AND COALESCE(BTRIM(NEW.review_note), '') = '' THEN
            RAISE EXCEPTION 'Alasan reject wajib diisi';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.validate_attendance_change_request_review() FROM PUBLIC;

DROP TRIGGER IF EXISTS trigger_validate_attendance_change_request_review ON public.attendance_change_requests;
CREATE TRIGGER trigger_validate_attendance_change_request_review
    BEFORE UPDATE ON public.attendance_change_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_attendance_change_request_review();

CREATE OR REPLACE FUNCTION public.resolve_attendance_record_id(
    p_employee_id TEXT,
    p_attendance_date DATE
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    attendance_id TEXT;
    has_camel BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'attendance'
          AND c.column_name = 'employeeId'
    ) INTO has_camel;

    IF has_camel THEN
        EXECUTE 'SELECT a.id::text FROM public.attendance a WHERE a."employeeId" = $1 AND a.tanggal = $2 LIMIT 1'
        INTO attendance_id
        USING p_employee_id, p_attendance_date;
    ELSE
        EXECUTE 'SELECT a.id::text FROM public.attendance a WHERE a.employee_id = $1 AND a.date = $2 LIMIT 1'
        INTO attendance_id
        USING p_employee_id, p_attendance_date;
    END IF;

    RETURN attendance_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_attendance_record_id(TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_attendance_record_id(TEXT, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION public.insert_attendance_revision_from_request()
RETURNS TRIGGER AS $$
DECLARE
    resolved_attendance_id TEXT;
    revision_action TEXT;
    has_camel_case BOOLEAN;
BEGIN
    IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
        resolved_attendance_id := public.resolve_attendance_record_id(NEW.employee_id, NEW.attendance_date);
        revision_action := UPPER(NEW.status);

        INSERT INTO public.attendance_revision_history (
            attendance_id,
            request_id,
            employee_id,
            attendance_date,
            action,
            before_data,
            after_data,
            reason_code,
            reason_detail,
            changed_by
        ) VALUES (
            resolved_attendance_id,
            NEW.id,
            NEW.employee_id,
            NEW.attendance_date,
            revision_action,
            NEW.current_data,
            CASE
                WHEN NEW.status = 'approved' THEN NEW.proposed_data
                ELSE NEW.current_data
            END,
            NEW.reason_code,
            COALESCE(NEW.review_note, NEW.reason_detail),
            COALESCE(NEW.checker_user_id, auth.uid())
        );

        IF NEW.status = 'approved' THEN
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns c
                WHERE c.table_schema = 'public'
                  AND c.table_name = 'attendance'
                  AND c.column_name = 'employeeId'
            ) INTO has_camel_case;

            IF resolved_attendance_id IS NOT NULL THEN
                IF has_camel_case THEN
                    EXECUTE $sql$UPDATE public.attendance
                             SET "clockIn" = COALESCE((NEW.proposed_data->>'clockIn')::time, "clockIn"),
                                 "clockOut" = COALESCE((NEW.proposed_data->>'clockOut')::time, "clockOut"),
                                 location = COALESCE(NEW.proposed_data->>'location', location),
                                 latitude = COALESCE((NEW.proposed_data->>'latitude')::numeric, latitude),
                                 longitude = COALESCE((NEW.proposed_data->>'longitude')::numeric, longitude),
                                 "isLate" = COALESCE((NEW.proposed_data->>'isLate')::boolean, "isLate"),
                                 "overtimeHours" = COALESCE((NEW.proposed_data->>'overtimeHours')::numeric, "overtimeHours"),
                                 status = COALESCE(NEW.proposed_data->>'status', status),
                                 source = COALESCE(NEW.proposed_data->>'source', source),
                                 notes = COALESCE(NEW.proposed_data->>'notes', notes),
                                 updated_at = NOW()
                             WHERE id = $1$sql$
                    USING resolved_attendance_id;
                ELSE
                    EXECUTE $sql$UPDATE public.attendance
                             SET check_in = COALESCE((NEW.proposed_data->>'clockIn')::time, check_in),
                                 check_out = COALESCE((NEW.proposed_data->>'clockOut')::time, check_out),
                                 lokasi = COALESCE(NEW.proposed_data->>'location', lokasi),
                                 latitude = COALESCE((NEW.proposed_data->>'latitude')::numeric, latitude),
                                 longitude = COALESCE((NEW.proposed_data->>'longitude')::numeric, longitude),
                                 is_late = COALESCE((NEW.proposed_data->>'isLate')::boolean, is_late),
                                 overtime_hours = COALESCE((NEW.proposed_data->>'overtimeHours')::numeric, overtime_hours),
                                 status = COALESCE(NEW.proposed_data->>'status', status),
                                 source = COALESCE(NEW.proposed_data->>'source', source),
                                 notes = COALESCE(NEW.proposed_data->>'notes', notes),
                                 updated_at = NOW()
                             WHERE id = $1$sql$
                    USING resolved_attendance_id;
                END IF;
            ELSE
                IF has_camel_case THEN
                    EXECUTE $sql$INSERT INTO public.attendance (
                              id,
                              "employeeId",
                              tanggal,
                              "clockIn",
                              "clockOut",
                              location,
                              latitude,
                              longitude,
                              "isLate",
                              "overtimeHours",
                              status,
                              source,
                              notes,
                              created_at,
                              updated_at
                          )
                          SELECT
                              gen_random_uuid()::text,
                              $1,
                              $2,
                              (NEW.proposed_data->>'clockIn')::time,
                              (NEW.proposed_data->>'clockOut')::time,
                              NEW.proposed_data->>'location',
                              (NEW.proposed_data->>'latitude')::numeric,
                              (NEW.proposed_data->>'longitude')::numeric,
                              (NEW.proposed_data->>'isLate')::boolean,
                              (NEW.proposed_data->>'overtimeHours')::numeric,
                              COALESCE(NEW.proposed_data->>'status', 'Hadir'),
                              COALESCE(NEW.proposed_data->>'source', 'web-admin'),
                              NEW.proposed_data->>'notes',
                              NOW(),
                              NOW()
                          WHERE NOT EXISTS (
                              SELECT 1
                              FROM public.attendance a
                              WHERE a."employeeId" = $1
                                AND a.tanggal = $2
                          )$sql$
                    USING NEW.employee_id, NEW.attendance_date;
                ELSE
                    EXECUTE $sql$INSERT INTO public.attendance (
                              id,
                              employee_id,
                              date,
                              check_in,
                              check_out,
                              lokasi,
                              latitude,
                              longitude,
                              is_late,
                              overtime_hours,
                              status,
                              source,
                              notes,
                              created_at,
                              updated_at
                          )
                          SELECT
                              gen_random_uuid()::text,
                              $1,
                              $2,
                              (NEW.proposed_data->>'clockIn')::time,
                              (NEW.proposed_data->>'clockOut')::time,
                              NEW.proposed_data->>'location',
                              (NEW.proposed_data->>'latitude')::numeric,
                              (NEW.proposed_data->>'longitude')::numeric,
                              (NEW.proposed_data->>'isLate')::boolean,
                              (NEW.proposed_data->>'overtimeHours')::numeric,
                              COALESCE(NEW.proposed_data->>'status', 'Hadir'),
                              COALESCE(NEW.proposed_data->>'source', 'web-admin'),
                              NEW.proposed_data->>'notes',
                              NOW(),
                              NOW()
                          WHERE NOT EXISTS (
                              SELECT 1
                              FROM public.attendance a
                              WHERE a.employee_id = $1
                                AND a.date = $2
                          )$sql$
                    USING NEW.employee_id, NEW.attendance_date;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.insert_attendance_revision_from_request() FROM PUBLIC;

DROP TRIGGER IF EXISTS trigger_insert_attendance_revision_from_request ON public.attendance_change_requests;
CREATE TRIGGER trigger_insert_attendance_revision_from_request
    AFTER UPDATE ON public.attendance_change_requests
    FOR EACH ROW
    WHEN (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected'))
    EXECUTE FUNCTION public.insert_attendance_revision_from_request();

-- RLS
ALTER TABLE public.attendance_reason_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_revision_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_reason_codes_read" ON public.attendance_reason_codes;
CREATE POLICY "attendance_reason_codes_read"
    ON public.attendance_reason_codes FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "attendance_change_requests_select" ON public.attendance_change_requests;
CREATE POLICY "attendance_change_requests_select"
    ON public.attendance_change_requests FOR SELECT
    USING (
        public.is_operational_user() OR
        maker_user_id = auth.uid() OR
        employee_id = public.current_employee_id()
    );

DROP POLICY IF EXISTS "attendance_change_requests_insert" ON public.attendance_change_requests;
CREATE POLICY "attendance_change_requests_insert"
    ON public.attendance_change_requests FOR INSERT
    WITH CHECK (
        public.is_operational_user() OR
        (
            source_portal = 'personal' AND
            maker_user_id = auth.uid() AND
            employee_id = public.current_employee_id()
        )
    );

DROP POLICY IF EXISTS "attendance_change_requests_update" ON public.attendance_change_requests;
CREATE POLICY "attendance_change_requests_update"
    ON public.attendance_change_requests FOR UPDATE
    USING (
        public.is_operational_user()
    )
    WITH CHECK (
        public.is_operational_user()
    );

DROP POLICY IF EXISTS "attendance_revision_history_select" ON public.attendance_revision_history;
CREATE POLICY "attendance_revision_history_select"
    ON public.attendance_revision_history FOR SELECT
    USING (
        public.is_operational_user() OR
        employee_id = public.current_employee_id()
    );

DROP POLICY IF EXISTS "attendance_revision_history_insert" ON public.attendance_revision_history;
CREATE POLICY "attendance_revision_history_insert"
    ON public.attendance_revision_history FOR INSERT
    WITH CHECK (public.is_operational_user());

GRANT SELECT ON public.attendance_reason_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.attendance_change_requests TO authenticated;
GRANT SELECT, INSERT ON public.attendance_revision_history TO authenticated;
REVOKE DELETE ON public.attendance_change_requests FROM authenticated;
REVOKE UPDATE, DELETE ON public.attendance_reason_codes FROM authenticated;
REVOKE UPDATE, DELETE ON public.attendance_revision_history FROM authenticated;

-- Verifikasi cepat
SELECT to_regclass('public.attendance_reason_codes') AS attendance_reason_codes_table;
SELECT to_regclass('public.attendance_change_requests') AS attendance_change_requests_table;
SELECT to_regclass('public.attendance_revision_history') AS attendance_revision_history_table;
