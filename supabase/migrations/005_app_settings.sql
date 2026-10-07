CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on app_settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated upsert on app_settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service_role full access on app_settings"
  ON public.app_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.app_settings (key, value) VALUES
  ('from_name', 'Stefano Martini | ARKITECNA'),
  ('from_email', 'info@arkitecna.com'),
  ('reply_to', 'info@arkitecna.com')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
