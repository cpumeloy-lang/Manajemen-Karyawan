DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'employees'
		  AND column_name = 'managedunitid'
	) THEN
		ALTER TABLE public.employees RENAME COLUMN managedunitid TO managed_unit_id;
	END IF;
END $$;
