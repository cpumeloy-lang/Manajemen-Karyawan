-- Diagnostic Query: Verify Actual Column Names in Your Database
-- Run this in Supabase SQL Editor to check what columns actually exist

-- Check attendance table columns
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'attendance'
ORDER BY ordinal_position;

-- Check employees table columns
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'employees'
ORDER BY ordinal_position;

-- Check employee_devices table columns
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'employee_devices'
ORDER BY ordinal_position;

-- Check requests table columns
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'requests'
ORDER BY ordinal_position;

-- Check documents table columns
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'documents'
ORDER BY ordinal_position;
