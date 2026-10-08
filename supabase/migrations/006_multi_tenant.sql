-- Migration 006_multi_tenant.sql
-- Multi-Tenant Support: user_id on campaigns, user_settings table, and RLS policies

-- 1. Add user_id column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill existing campaigns with the primary admin user (cesare@arkitecna.com)
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'cesare@arkitecna.com' LIMIT 1;
  IF v_admin_id IS NOT NULL THEN
    UPDATE public.campaigns SET user_id = v_admin_id WHERE user_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);

-- 2. Create user_settings table for per-user sender identity & onboarding state
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  from_name text NOT NULL DEFAULT 'Stefano Martini | ARKITECNA',
  from_email text NOT NULL DEFAULT 'cesare@arkitecna.com',
  reply_to text NOT NULL DEFAULT 'cesare@arkitecna.com',
  preferred_timezone text NOT NULL DEFAULT 'Europe/Rome',
  send_window_start time NOT NULL DEFAULT '09:00',
  send_window_end time NOT NULL DEFAULT '18:00',
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Initial settings for the admin (cesare@arkitecna.com)
INSERT INTO public.user_settings (user_id, from_name, from_email, reply_to, onboarding_completed)
SELECT id, 'Stefano Martini | ARKITECNA', 'cesare@arkitecna.com', 'cesare@arkitecna.com', true
FROM auth.users
WHERE email = 'cesare@arkitecna.com'
ON CONFLICT (user_id) DO NOTHING;

-- Trigger for user_settings updated_at
DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 3. Row Level Security Policies
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on user_settings" ON public.user_settings;
CREATE POLICY "Service role full access on user_settings"
  ON public.user_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Campaigns RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own campaigns" ON public.campaigns;
CREATE POLICY "Users can view own campaigns"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own campaigns" ON public.campaigns;
CREATE POLICY "Users can insert own campaigns"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;
CREATE POLICY "Users can update own campaigns"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;
CREATE POLICY "Users can delete own campaigns"
  ON public.campaigns FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on campaigns" ON public.campaigns;
CREATE POLICY "Service role full access on campaigns"
  ON public.campaigns FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Campaign Leads RLS
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage leads of own campaigns" ON public.campaign_leads;
CREATE POLICY "Users can manage leads of own campaigns"
  ON public.campaign_leads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_leads.campaign_id
        AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_leads.campaign_id
        AND campaigns.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access on campaign_leads" ON public.campaign_leads;
CREATE POLICY "Service role full access on campaign_leads"
  ON public.campaign_leads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
