-- Migration: 002_campaign_leads.sql
-- Table: public.campaign_leads

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
