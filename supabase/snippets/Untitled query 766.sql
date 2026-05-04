-- STEP 2: Enable RLS dan Setup Policies
-- Jalankan setelah STEP 1 berhasil

-- Enable Row Level Security (RLS)
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop policies jika sudah ada (untuk re-run)
DROP POLICY IF EXISTS "Units dapat dibaca oleh user yang login" ON public.units;
DROP POLICY IF EXISTS "Units dapat diubah oleh admin" ON public.units;
DROP POLICY IF EXISTS "Employees dapat dibaca oleh user yang login" ON public.employees;
DROP POLICY IF EXISTS "Employees dapat diubah oleh admin atau diri sendiri" ON public.employees;
DROP POLICY IF EXISTS "Attendance dapat dibaca oleh admin atau karyawan sendiri" ON public.attendance;
DROP POLICY IF EXISTS "Attendance dapat diinput oleh admin atau karyawan sendiri" ON public.attendance;
DROP POLICY IF EXISTS "Requests dapat dibaca oleh admin atau karyawan sendiri" ON public.requests;
DROP POLICY IF EXISTS "Requests dapat dibuat oleh karyawan sendiri" ON public.requests;
DROP POLICY IF EXISTS "Requests dapat diupdate oleh admin" ON public.requests;
DROP POLICY IF EXISTS "Documents dapat dibaca oleh admin atau karyawan sendiri" ON public.documents;
DROP POLICY IF EXISTS "Documents dapat diupload oleh admin atau karyawan sendiri" ON public.documents;

-- RLS Policies untuk units
CREATE POLICY "Units dapat dibaca oleh user yang login" 
    ON public.units FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Units dapat diubah oleh admin" 
    ON public.units FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies untuk employees
CREATE POLICY "Employees dapat dibaca oleh user yang login" 
    ON public.employees FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Employees dapat diubah oleh admin atau diri sendiri" 
    ON public.employees FOR ALL 
    USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies untuk attendance
CREATE POLICY "Attendance dapat dibaca oleh admin atau karyawan sendiri" 
    ON public.attendance FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = employee_id AND (
                e.user_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.employees admin 
                    WHERE admin.user_id = auth.uid() AND admin.role = 'admin'
                )
            )
        )
    );

CREATE POLICY "Attendance dapat diinput oleh admin atau karyawan sendiri" 
    ON public.attendance FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = employee_id AND (
                e.user_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.employees admin 
                    WHERE admin.user_id = auth.uid() AND admin.role = 'admin'
                )
            )
        )
    );

-- RLS Policies untuk requests
CREATE POLICY "Requests dapat dibaca oleh admin atau karyawan sendiri" 
    ON public.requests FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = employee_id AND (
                e.user_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.employees admin 
                    WHERE admin.user_id = auth.uid() AND admin.role = 'admin'
                )
            )
        )
    );

CREATE POLICY "Requests dapat dibuat oleh karyawan sendiri" 
    ON public.requests FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = employee_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "Requests dapat diupdate oleh admin" 
    ON public.requests FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies untuk documents
CREATE POLICY "Documents dapat dibaca oleh admin atau karyawan sendiri" 
    ON public.documents FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = employee_id AND (
                e.user_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.employees admin 
                    WHERE admin.user_id = auth.uid() AND admin.role = 'admin'
                )
            )
        )
    );

CREATE POLICY "Documents dapat diupload oleh admin atau karyawan sendiri" 
    ON public.documents FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = employee_id AND (
                e.user_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM public.employees admin 
                    WHERE admin.user_id = auth.uid() AND admin.role = 'admin'
                )
            )
        )
    );