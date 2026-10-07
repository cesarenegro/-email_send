-- Migration: 001_campaigns.sql
-- Table: public.campaigns

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
