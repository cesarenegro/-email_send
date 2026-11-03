-- =============================================================================
-- MAIL-K — Migrazione KONTA 03: collegamento con K-CRM (tappa M3, lato Mail-K)
-- File: supabase/migrations/20261103140000_mailk_konta_03_crm_bridge.sql
--
-- Solo colonne nullable sulle tabelle mail_*: provenienza del destinatario e
-- riferimenti agli id K-CRM (persona, segmento). Nessuna FK verso crm_*
-- (Zero ERP Bleed); i riferimenti sono validati dall'API di K-CRM al momento
-- dell'import. Idempotente.
-- =============================================================================

BEGIN;

ALTER TABLE public.mail_campaigns ADD COLUMN IF NOT EXISTS crm_segment_id uuid NULL;
ALTER TABLE public.mail_newsletters ADD COLUMN IF NOT EXISTS crm_segment_id uuid NULL;

ALTER TABLE public.mail_campaign_leads ADD COLUMN IF NOT EXISTS crm_person_id uuid NULL;
ALTER TABLE public.mail_campaign_leads ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.mail_newsletter_subscribers ADD COLUMN IF NOT EXISTS crm_person_id uuid NULL;
ALTER TABLE public.mail_newsletter_subscribers ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mail_campaign_leads_source_check') THEN
    ALTER TABLE public.mail_campaign_leads
      ADD CONSTRAINT mail_campaign_leads_source_check CHECK (source IN ('manual', 'csv', 'crm_segment'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mail_newsletter_subscribers_source_check') THEN
    ALTER TABLE public.mail_newsletter_subscribers
      ADD CONSTRAINT mail_newsletter_subscribers_source_check CHECK (source IN ('manual', 'csv', 'crm_segment'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mail_campaign_leads_crm_person
  ON public.mail_campaign_leads (organization_id, crm_person_id) WHERE crm_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mail_newsletter_subscribers_crm_person
  ON public.mail_newsletter_subscribers (organization_id, crm_person_id) WHERE crm_person_id IS NOT NULL;

-- Le policy esistenti (una per verbo, per organizzazione) coprono già le nuove colonne.

COMMIT;
