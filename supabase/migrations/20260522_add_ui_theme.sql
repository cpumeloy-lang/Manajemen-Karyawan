-- Supabase migration: add ui_theme to system_settings
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS ui_theme varchar(16) DEFAULT 'light';

COMMENT ON COLUMN public.system_settings.ui_theme IS 'UI theme preference for web admin: light|dark|system';

UPDATE public.system_settings SET ui_theme = COALESCE(ui_theme, 'light') WHERE ui_theme IS NULL;
