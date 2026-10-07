-- Migration: 003_email_logs.sql
-- Table: public.email_logs

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
