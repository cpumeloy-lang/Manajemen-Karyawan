-- ============================================================================
-- FIX EMPLOYEE_SCHEDULES RLS POLICIES
-- Run this in Supabase SQL Editor to fix 406 Not Acceptable errors
-- ============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own schedules" ON public.employee_schedules;
DROP POLICY IF EXISTS "Admin/HRD can view all schedules" ON public.employee_schedules;

-- Create new RLS policies
-- Policy 1: Users can view their own schedules
CREATE POLICY "Users can view their own schedules"
  ON public.employee_schedules FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.employees WHERE id = employee_id
    )
  );

-- Policy 2: Admin/HRD can view all schedules
CREATE POLICY "Admin/HRD can view all schedules"
  ON public.employee_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE id = employee_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'hrd')
    )
  );

-- Policy 3: Kepala Ruangan can view unit schedules
CREATE POLICY "Kepala Ruangan can view unit schedules"
  ON public.employee_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE id = employee_id 
      AND user_id = auth.uid() 
      AND role = 'kepala_ruangan'
      AND unit_id IN (
        SELECT id FROM public.units WHERE id = (
          SELECT unitKerjaId FROM public.employees WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Policy 4: Allow insert for admin/hrd
CREATE POLICY "Admin/HRD can insert schedules"
  ON public.employee_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'hrd')
    )
  );

-- Policy 5: Allow update for admin/hrd
CREATE POLICY "Admin/HRD can update schedules"
  ON public.employee_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'hrd')
    )
  );

-- Policy 6: Allow delete for admin only
CREATE POLICY "Admin can delete schedules"
  ON public.employee_schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'employee_schedules';
