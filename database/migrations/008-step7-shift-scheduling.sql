-- STEP 7: Shift Scheduling Architecture (Full)
-- Arsitektur penjadwalan shift dengan pola rotasi, transaksi jadwal harian, dan tukar shift.
-- Jalankan setelah database-setup-step6-attendance-governance.sql
-- ==================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. TABEL MASTER: rotation_patterns (Pola Rotasi per Unit)
-- ============================================================
-- Menyimpan template pola rotasi yang dapat di-generate otomatis.
-- Contoh: "P-P-S-S-M-M-L-L" untuk siklus 8 hari.

CREATE TABLE IF NOT EXISTS public.rotation_patterns (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    unit_id TEXT NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                          -- "Rotasi 3 Shift 8 Hari"
    description TEXT,                            -- Deskripsi opsional
    pattern JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of shift names: ["Pagi","Pagi","Siang","Siang","Malam","Malam","Libur","Libur"]
    cycle_days INTEGER NOT NULL DEFAULT 7,       -- Panjang siklus (jumlah elemen pattern)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT rotation_patterns_cycle_check CHECK (cycle_days > 0 AND cycle_days <= 56),
    CONSTRAINT rotation_patterns_name_unit_unique UNIQUE (unit_id, name)
);

COMMENT ON TABLE public.rotation_patterns IS 'Template pola rotasi shift per unit. Pattern berisi array nama shift yang berulang setiap cycle_days hari.';
COMMENT ON COLUMN public.rotation_patterns.pattern IS 'JSON array of shift names. Contoh: ["Pagi","Pagi","Siang","Siang","Malam","Malam","Libur","Libur"]. "Libur" = hari libur.';

-- ============================================================
-- 2. TABEL TRANSAKSI: employee_schedules (Jadwal Harian per Karyawan)
-- ============================================================
-- Setiap baris = 1 hari kerja untuk 1 karyawan.
-- Ini adalah tabel utama yang menggantikan employee.shift statis.

CREATE TABLE IF NOT EXISTS public.employee_schedules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    unit_id TEXT NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    schedule_date DATE NOT NULL,
    shift_name TEXT NOT NULL,                   -- Nama shift (reference ke ShiftDefinition.name di units.shifts)
    shift_start_time TIME,                     -- Cached jam masuk (dari ShiftDefinition, untuk query cepat)
    shift_end_time TIME,                       -- Cached jam pulang
    is_off_day BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE jika hari ini libur (shift_name = "Libur")

    -- Status & workflow
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'swapped', 'override', 'cancelled')),
    
    -- Swap tracking
    swapped_with_employee_id TEXT REFERENCES public.employees(id),
    swapped_with_schedule_id TEXT REFERENCES public.employee_schedules(id),
    swap_reason TEXT,
    swap_approved_by UUID REFERENCES auth.users(id),
    swap_approved_at TIMESTAMP WITH TIME ZONE,

    -- Generation tracking
    generated_from_pattern_id TEXT REFERENCES public.rotation_patterns(id),
    rotation_day_index INTEGER,                -- Posisi dalam siklus rotasi (0-based)

    -- Override tracking
    override_reason TEXT,
    override_by UUID REFERENCES auth.users(id),

    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT employee_schedules_unique_day UNIQUE (employee_id, schedule_date),
    CONSTRAINT employee_schedules_swap_self_check CHECK (swapped_with_employee_id != employee_id)
);

COMMENT ON TABLE public.employee_schedules IS 'Jadwal shift harian per karyawan. Setiap baris = 1 karyawan pada 1 tanggal tertentu.';
COMMENT ON COLUMN public.employee_schedules.status IS 'draft = belum dipublikasi, published = aktif untuk absensi, swapped = hasil tukar shift, override = diubah manual, cancelled = dibatalkan.';

-- ============================================================
-- 3. TABEL: schedule_publish_logs (Riwayat Publish Jadwal)
-- ============================================================
-- Track kapan jadwal di-lock/publish oleh Kepala Ruangan.

CREATE TABLE IF NOT EXISTS public.schedule_publish_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    unit_id TEXT NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_schedules INTEGER NOT NULL DEFAULT 0,
    total_employees INTEGER NOT NULL DEFAULT 0,
    published_by UUID NOT NULL REFERENCES auth.users(id),
    published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    notes TEXT,

    CONSTRAINT schedule_publish_period_check CHECK (period_end >= period_start)
);

COMMENT ON TABLE public.schedule_publish_logs IS 'Log riwayat publish/lock jadwal per periode oleh Kepala Ruangan.';

-- ============================================================
-- 4. INDEXES untuk performa query
-- ============================================================

-- Query utama: jadwal per unit per bulan
CREATE INDEX IF NOT EXISTS idx_employee_schedules_unit_date
    ON public.employee_schedules (unit_id, schedule_date);

-- Query: jadwal per karyawan per bulan
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee_date
    ON public.employee_schedules (employee_id, schedule_date);

-- Query: filter by status (draft vs published)
CREATE INDEX IF NOT EXISTS idx_employee_schedules_status
    ON public.employee_schedules (status) WHERE status != 'cancelled';

-- Query: find swapped schedules
CREATE INDEX IF NOT EXISTS idx_employee_schedules_swap
    ON public.employee_schedules (swapped_with_employee_id) WHERE swapped_with_employee_id IS NOT NULL;

-- Rotation patterns per unit
CREATE INDEX IF NOT EXISTS idx_rotation_patterns_unit
    ON public.rotation_patterns (unit_id) WHERE is_active = TRUE;

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.rotation_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_publish_logs ENABLE ROW LEVEL SECURITY;

-- rotation_patterns: Kepala Ruangan hanya lihat/edit unit sendiri; Admin/HRD lihat semua
DROP POLICY IF EXISTS "rotation_patterns_select" ON public.rotation_patterns;
CREATE POLICY "rotation_patterns_select" ON public.rotation_patterns
    FOR SELECT TO authenticated
    USING (
        public.is_operational_user()
        OR unit_id IN (
            SELECT COALESCE(e."managedUnitId", e."unitKerjaId")
            FROM public.employees e WHERE e.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "rotation_patterns_insert" ON public.rotation_patterns;
CREATE POLICY "rotation_patterns_insert" ON public.rotation_patterns
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_operational_user()
        OR unit_id IN (
            SELECT COALESCE(e."managedUnitId", e."unitKerjaId")
            FROM public.employees e WHERE e.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "rotation_patterns_update" ON public.rotation_patterns;
CREATE POLICY "rotation_patterns_update" ON public.rotation_patterns
    FOR UPDATE TO authenticated
    USING (
        public.is_operational_user()
        OR unit_id IN (
            SELECT COALESCE(e."managedUnitId", e."unitKerjaId")
            FROM public.employees e WHERE e.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "rotation_patterns_delete" ON public.rotation_patterns;
CREATE POLICY "rotation_patterns_delete" ON public.rotation_patterns
    FOR DELETE TO authenticated
    USING (
        public.is_operational_user()
        OR unit_id IN (
            SELECT COALESCE(e."managedUnitId", e."unitKerjaId")
            FROM public.employees e WHERE e.user_id = auth.uid()
        )
    );

-- employee_schedules: Kepala Ruangan lihat/edit unit sendiri; Karyawan lihat jadwal sendiri; Admin semua
DROP POLICY IF EXISTS "employee_schedules_select" ON public.employee_schedules;
CREATE POLICY "employee_schedules_select" ON public.employee_schedules
    FOR SELECT TO authenticated
    USING (
        public.is_operational_user()
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
        OR unit_id IN (
            SELECT COALESCE(e."managedUnitId", e."unitKerjaId")
            FROM public.employees e WHERE e.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "employee_schedules_insert" ON public.employee_schedules;
CREATE POLICY "employee_schedules_insert" ON public.employee_schedules
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_operational_user()
        OR unit_id IN (
            SELECT COALESCE(e."managedUnitId", e."unitKerjaId")
            FROM public.employees e WHERE e.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "employee_schedules_update" ON public.employee_schedules;
CREATE POLICY "employee_schedules_update" ON public.employee_schedules
    FOR UPDATE TO authenticated
    USING (
        public.is_operational_user()
        OR unit_id IN (
            SELECT COALESCE(e."managedUnitId", e."unitKerjaId")
            FROM public.employees e WHERE e.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "employee_schedules_delete" ON public.employee_schedules;
CREATE POLICY "employee_schedules_delete" ON public.employee_schedules
    FOR DELETE TO authenticated
    USING (
        public.is_operational_user()
    );

-- schedule_publish_logs: Kepala Ruangan + Admin
DROP POLICY IF EXISTS "schedule_publish_logs_select" ON public.schedule_publish_logs;
CREATE POLICY "schedule_publish_logs_select" ON public.schedule_publish_logs
    FOR SELECT TO authenticated
    USING (
        public.is_operational_user()
        OR unit_id IN (
            SELECT COALESCE(e."managedUnitId", e."unitKerjaId")
            FROM public.employees e WHERE e.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "schedule_publish_logs_insert" ON public.schedule_publish_logs;
CREATE POLICY "schedule_publish_logs_insert" ON public.schedule_publish_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_operational_user()
        OR unit_id IN (
            SELECT COALESCE(e."managedUnitId", e."unitKerjaId")
            FROM public.employees e WHERE e.user_id = auth.uid()
        )
    );

-- ============================================================
-- 6. TRIGGER: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_rotation_patterns ON public.rotation_patterns;
CREATE TRIGGER set_updated_at_rotation_patterns
    BEFORE UPDATE ON public.rotation_patterns
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_employee_schedules ON public.employee_schedules;
CREATE TRIGGER set_updated_at_employee_schedules
    BEFORE UPDATE ON public.employee_schedules
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================
-- 7. FUNCTION: Generate jadwal dari pola rotasi
-- ============================================================
-- Digunakan untuk bulk-insert jadwal berdasarkan pola rotasi.
-- Parameter:
--   p_employee_id: ID karyawan
--   p_unit_id: ID unit
--   p_pattern_id: ID pola rotasi
--   p_start_date: Tanggal mulai generate
--   p_end_date: Tanggal akhir generate
--   p_rotation_offset: Offset hari dalam siklus (untuk staggered start)
--   p_created_by: User ID yang generate

CREATE OR REPLACE FUNCTION public.generate_schedule_from_pattern(
    p_employee_id TEXT,
    p_unit_id TEXT,
    p_pattern_id TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_rotation_offset INTEGER DEFAULT 0,
    p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pattern JSONB;
    v_cycle_days INTEGER;
    v_current_date DATE;
    v_day_index INTEGER;
    v_shift_name TEXT;
    v_is_off BOOLEAN;
    v_count INTEGER := 0;
    v_unit_shifts JSONB;
    v_shift_start TIME;
    v_shift_end TIME;
BEGIN
    -- Load pattern
    SELECT pattern, cycle_days INTO v_pattern, v_cycle_days
    FROM public.rotation_patterns
    WHERE id = p_pattern_id AND is_active = TRUE;

    IF v_pattern IS NULL THEN
        RAISE EXCEPTION 'Pola rotasi tidak ditemukan atau tidak aktif: %', p_pattern_id;
    END IF;

    -- Load unit shifts for time lookup
    SELECT shifts INTO v_unit_shifts FROM public.units WHERE id = p_unit_id;

    -- Loop through each date
    v_current_date := p_start_date;
    WHILE v_current_date <= p_end_date LOOP
        -- Calculate rotation index with offset
        v_day_index := ((v_current_date - p_start_date) + p_rotation_offset) % v_cycle_days;
        v_shift_name := v_pattern->>v_day_index;
        v_is_off := (v_shift_name IS NULL OR LOWER(v_shift_name) = 'libur' OR v_shift_name = '');

        -- Lookup shift start/end from unit config
        v_shift_start := NULL;
        v_shift_end := NULL;
        IF NOT v_is_off AND v_unit_shifts IS NOT NULL THEN
            SELECT
                (elem->>'startTime')::TIME,
                (elem->>'endTime')::TIME
            INTO v_shift_start, v_shift_end
            FROM jsonb_array_elements(v_unit_shifts) AS elem
            WHERE elem->>'name' = v_shift_name
            LIMIT 1;
        END IF;

        -- Insert (skip if already exists via ON CONFLICT)
        INSERT INTO public.employee_schedules (
            employee_id, unit_id, schedule_date, shift_name,
            shift_start_time, shift_end_time, is_off_day,
            status, generated_from_pattern_id, rotation_day_index, created_by
        ) VALUES (
            p_employee_id, p_unit_id, v_current_date, COALESCE(v_shift_name, 'Libur'),
            v_shift_start, v_shift_end, v_is_off,
            'draft', p_pattern_id, v_day_index, p_created_by
        )
        ON CONFLICT (employee_id, schedule_date)
        DO UPDATE SET
            shift_name = EXCLUDED.shift_name,
            shift_start_time = EXCLUDED.shift_start_time,
            shift_end_time = EXCLUDED.shift_end_time,
            is_off_day = EXCLUDED.is_off_day,
            status = 'draft',
            generated_from_pattern_id = EXCLUDED.generated_from_pattern_id,
            rotation_day_index = EXCLUDED.rotation_day_index,
            updated_at = NOW();

        v_count := v_count + 1;
        v_current_date := v_current_date + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.generate_schedule_from_pattern IS 'Generate jadwal harian untuk seorang karyawan berdasarkan pola rotasi. ON CONFLICT akan overwrite jadwal draft yang sudah ada.';

-- ============================================================
-- 8. FUNCTION: Publish jadwal (lock draft → published)
-- ============================================================

CREATE OR REPLACE FUNCTION public.publish_unit_schedules(
    p_unit_id TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_published_by UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.employee_schedules
    SET status = 'published', updated_at = NOW()
    WHERE unit_id = p_unit_id
      AND schedule_date BETWEEN p_start_date AND p_end_date
      AND status = 'draft';

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Log the publish event
    INSERT INTO public.schedule_publish_logs (
        unit_id, period_start, period_end,
        total_schedules, total_employees, published_by
    ) VALUES (
        p_unit_id, p_start_date, p_end_date,
        v_count,
        (SELECT COUNT(DISTINCT employee_id) FROM public.employee_schedules
         WHERE unit_id = p_unit_id AND schedule_date BETWEEN p_start_date AND p_end_date AND status = 'published'),
        p_published_by
    );

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.publish_unit_schedules IS 'Publish semua jadwal draft dalam range tanggal untuk sebuah unit. Menandai status menjadi published dan mencatat log.';

-- ============================================================
-- 9. FUNCTION: Validasi jam kerja mingguan
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_weekly_hours(
    p_employee_id TEXT,
    p_week_start DATE  -- Harus hari Senin
)
RETURNS TABLE (
    total_scheduled_days INTEGER,
    total_work_days INTEGER,
    total_off_days INTEGER,
    estimated_hours NUMERIC(5,2),
    exceeds_limit BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_week_end DATE := p_week_start + 6;
    v_scheduled INTEGER;
    v_work INTEGER;
    v_off INTEGER;
    v_hours NUMERIC(5,2) := 0;
    rec RECORD;
BEGIN
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE NOT is_off_day),
        COUNT(*) FILTER (WHERE is_off_day)
    INTO v_scheduled, v_work, v_off
    FROM public.employee_schedules
    WHERE employee_id = p_employee_id
      AND schedule_date BETWEEN p_week_start AND v_week_end
      AND status NOT IN ('cancelled');

    -- Estimate hours from shift times
    FOR rec IN
        SELECT shift_start_time, shift_end_time, is_off_day
        FROM public.employee_schedules
        WHERE employee_id = p_employee_id
          AND schedule_date BETWEEN p_week_start AND v_week_end
          AND status NOT IN ('cancelled')
          AND NOT is_off_day
    LOOP
        IF rec.shift_start_time IS NOT NULL AND rec.shift_end_time IS NOT NULL THEN
            IF rec.shift_end_time > rec.shift_start_time THEN
                v_hours := v_hours + EXTRACT(EPOCH FROM (rec.shift_end_time - rec.shift_start_time)) / 3600.0;
            ELSE
                -- Overnight shift
                v_hours := v_hours + EXTRACT(EPOCH FROM (('24:00:00'::TIME - rec.shift_start_time) + rec.shift_end_time)) / 3600.0;
            END IF;
        ELSE
            v_hours := v_hours + 8; -- Default 8 hours if times not cached
        END IF;
    END LOOP;

    RETURN QUERY SELECT v_scheduled, v_work, v_off, v_hours, (v_hours > 40.0);
END;
$$;

COMMENT ON FUNCTION public.validate_weekly_hours IS 'Validasi total jam kerja per minggu untuk seorang karyawan. Mengembalikan estimasi jam dan flag jika melebihi 40 jam.';

-- ============================================================
-- 10. GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON public.rotation_patterns TO authenticated;
GRANT ALL ON public.employee_schedules TO authenticated;
GRANT ALL ON public.schedule_publish_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_schedule_from_pattern TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_unit_schedules TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_weekly_hours TO authenticated;

-- ============================================================
-- DONE! Jalankan script ini di Supabase SQL Editor.
-- Setelah ini, jalankan Phase 2 (TypeScript types & services).
-- ============================================================
