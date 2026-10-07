-- =====================================================================
-- ARKITECNA MAILER - ALL DATABASE MIGRATIONS (COMBINED)
-- Copy and run this script inside Supabase SQL Editor
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  subject_template text NOT NULL DEFAULT '',
  html_template text NOT NULL DEFAULT '',

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'completed')),

  timezone text NOT NULL DEFAULT 'Europe/Rome',

  start_at timestamptz,
  send_window_start time NOT NULL DEFAULT '09:00',
  send_window_end time NOT NULL DEFAULT '18:00',

  send_interval_seconds integer NOT NULL DEFAULT 240
    CHECK (send_interval_seconds >= 60),

  daily_limit integer NOT NULL DEFAULT 80
    CHECK (daily_limit > 0),

  next_send_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER trg_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 2. CAMPAIGN LEADS
CREATE TABLE IF NOT EXISTS public.campaign_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  campaign_id uuid NOT NULL
    REFERENCES public.campaigns(id)
    ON DELETE CASCADE,

  company_name text,
  email text NOT NULL,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'retry', 'failed')),

  attempts integer NOT NULL DEFAULT 0,

  retry_at timestamptz,
  sent_at timestamptz,

  smtp_message_id text,
  last_error text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (campaign_id, email)
);

CREATE INDEX IF NOT EXISTS campaign_leads_campaign_status_idx
  ON public.campaign_leads(campaign_id, status);

CREATE INDEX IF NOT EXISTS campaign_leads_retry_idx
  ON public.campaign_leads(retry_at)
  WHERE status = 'retry';

DROP TRIGGER IF EXISTS trg_campaign_leads_updated_at ON public.campaign_leads;
CREATE TRIGGER trg_campaign_leads_updated_at
BEFORE UPDATE ON public.campaign_leads
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 3. EMAIL LOGS
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  campaign_id uuid NOT NULL
    REFERENCES public.campaigns(id)
    ON DELETE CASCADE,

  campaign_lead_id uuid NOT NULL
    REFERENCES public.campaign_leads(id)
    ON DELETE CASCADE,

  event_type text NOT NULL
    CHECK (event_type IN ('sent', 'error')),

  smtp_message_id text,
  error_message text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_campaign_created_idx
  ON public.email_logs(campaign_id, created_at);

CREATE INDEX IF NOT EXISTS email_logs_lead_idx
  ON public.email_logs(campaign_lead_id);

-- 4. ATOMIC CLAIM RPC
CREATE OR REPLACE FUNCTION public.claim_next_campaign_lead(
  p_campaign_id uuid
)
RETURNS SETOF public.campaign_leads
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT id
    FROM public.campaign_leads
    WHERE campaign_id = p_campaign_id
      AND (
        status = 'pending'
        OR (
          status = 'retry'
          AND retry_at IS NOT NULL
          AND retry_at <= now()
        )
      )
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.campaign_leads cl
  SET
    status = 'sending',
    attempts = attempts + 1,
    updated_at = now()
  FROM candidate
  WHERE cl.id = candidate.id
  RETURNING cl.*;
END;
$$;
