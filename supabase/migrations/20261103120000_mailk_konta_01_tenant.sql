-- =============================================================================
-- MAIL-K — Migrazione KONTA 01: tabelle multi-tenant `mail_*` nel DB condiviso KONTA
-- File: supabase/migrations/20261103120000_mailk_konta_01_tenant.sql
-- Tappa: M1 (account KONTA e multi-tenant), piano K-CRM_03_PROPOSTA_GAP_MAILK_AI_DASHBOARD §1
--
-- Regole:
--   * solo oggetti public.mail_* / trg_mail_* / idx_mail_*;
--   * ogni tabella ha organization_id uuid NOT NULL = id di public.crm_organizations,
--     SENZA chiave esterna verso crm_* o pro_* (Zero ERP Bleed);
--   * RLS attiva ovunque, una policy per verbo (mai FOR ALL), solo per `authenticated`;
--   * lettura: public.crm_is_active_member(organization_id, auth.uid());
--   * scrittura: public.crm_member_role(organization_id, auth.uid()) IN ('O','A','M','S','K');
--     impostazioni mittente: solo O/A;
--   * anon: nessun grant;  service_role: usato dai cron (bypassa RLS per natura);
--   * credenziali SMTP/IMAP solo cifrate (AES-256-GCM, chiave KCRM_SECRET_ENCRYPTION_KEY),
--     il testo cifrato non è leggibile da `authenticated` (grant per colonna);
--   * search_path fissato su tutte le funzioni; idempotente (rieseguibile).
--
-- Prerequisito: migrazione K-CRM 00 (crm_organizations, crm_memberships,
-- crm_is_active_member, crm_member_role) già applicata sullo stesso database.
-- Da applicare SOLO con approvazione umana (locale: scripts/konta/apply-mailk-migration.mjs).
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.crm_is_active_member(uuid, uuid)') IS NULL
     OR to_regprocedure('public.crm_member_role(uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'MAIL-K: helper RLS crm_is_active_member/crm_member_role assenti: applicare prima la migrazione K-CRM 00.';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 0. Helper interni
-- -----------------------------------------------------------------------------

-- Predicato di scrittura comune a campagne, destinatari, newsletter, iscritti, template.
CREATE OR REPLACE FUNCTION public.mail_can_write(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.crm_member_role(p_org, auth.uid()) IN ('O', 'A', 'M', 'S', 'K'), false);
$$;

-- Predicato per le impostazioni mittente (credenziali): solo Titolare/Amministratore.
CREATE OR REPLACE FUNCTION public.mail_can_manage_settings(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.crm_member_role(p_org, auth.uid()) IN ('O', 'A'), false);
$$;

REVOKE ALL ON FUNCTION public.mail_can_write(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.mail_can_manage_settings(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mail_can_write(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mail_can_manage_settings(uuid) TO authenticated, service_role;

-- updated_at automatico.
CREATE OR REPLACE FUNCTION public.mail_tg_touch_row()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- id e organization_id immutabili.
CREATE OR REPLACE FUNCTION public.mail_tg_guard_tenant()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION USING MESSAGE = 'TENANT_CHANGE_FORBIDDEN', HINT = '403',
      DETAIL = 'id e organization_id sono immutabili';
  END IF;
  RETURN NEW;
END;
$$;

-- Crea/rimpiazza le policy di una tabella mail_*: una policy per verbo, mai FOR ALL.
-- Un argomento NULL = nessuna policy e nessun grant per quel verbo.
CREATE OR REPLACE FUNCTION public.mail_admin_set_policies(
  p_table text, p_select text, p_insert text, p_update text, p_delete text
) RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  r record;
  v_rel regclass := format('public.%I', p_table)::regclass;
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid = v_rel LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.polname, p_table);
  END LOOP;
  EXECUTE format('REVOKE ALL ON public.%I FROM public, anon, authenticated', p_table);

  IF p_select IS NOT NULL THEN
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', p_table || '_select', p_table, p_select);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', p_table);
  END IF;
  IF p_insert IS NOT NULL THEN
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', p_table || '_insert', p_table, p_insert);
    EXECUTE format('GRANT INSERT ON public.%I TO authenticated', p_table);
  END IF;
  IF p_update IS NOT NULL THEN
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', p_table || '_update', p_table, p_update, p_update);
    EXECUTE format('GRANT UPDATE ON public.%I TO authenticated', p_table);
  END IF;
  IF p_delete IS NOT NULL THEN
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)', p_table || '_delete', p_table, p_delete);
    EXECUTE format('GRANT DELETE ON public.%I TO authenticated', p_table);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.mail_admin_set_policies(text, text, text, text, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mail_admin_attach_triggers(p_table text)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS trg_mail_touch_row ON public.%I', p_table);
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'updated_at') THEN
    EXECUTE format('CREATE TRIGGER trg_mail_touch_row BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.mail_tg_touch_row()', p_table);
  END IF;
  EXECUTE format('DROP TRIGGER IF EXISTS trg_mail_guard_tenant ON public.%I', p_table);
  EXECUTE format('CREATE TRIGGER trg_mail_guard_tenant BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.mail_tg_guard_tenant()', p_table);
END;
$$;
REVOKE ALL ON FUNCTION public.mail_admin_attach_triggers(text) FROM public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1. Impostazioni mittente per organizzazione (SMTP + identità + IMAP bounce)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mail_sender_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  from_name text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  reply_to text NOT NULL DEFAULT '',
  preferred_timezone text NOT NULL DEFAULT 'Europe/Rome',
  send_window_start time NOT NULL DEFAULT '09:00',
  send_window_end time NOT NULL DEFAULT '18:00',
  smtp_host text NOT NULL DEFAULT '',
  smtp_port integer NOT NULL DEFAULT 465 CHECK (smtp_port IN (25, 465, 587, 2525)),
  smtp_secure boolean NOT NULL DEFAULT true,
  smtp_user text NOT NULL DEFAULT '',
  smtp_pass_ciphertext text NULL,
  imap_host text NOT NULL DEFAULT '',
  imap_port integer NOT NULL DEFAULT 993 CHECK (imap_port BETWEEN 1 AND 65535),
  imap_user text NOT NULL DEFAULT '',
  imap_pass_ciphertext text NULL,
  key_version integer NOT NULL DEFAULT 1 CHECK (key_version >= 1),
  is_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mail_sender_settings_org_unique UNIQUE (organization_id)
);

-- -----------------------------------------------------------------------------
-- 2. Campagne outbound e destinatari
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mail_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  created_by uuid NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  subject_template text NOT NULL DEFAULT '',
  html_template text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  timezone text NOT NULL DEFAULT 'Europe/Rome',
  start_at timestamptz NULL,
  send_window_start time NOT NULL DEFAULT '09:00',
  send_window_end time NOT NULL DEFAULT '18:00',
  send_interval_seconds integer NOT NULL DEFAULT 240 CHECK (send_interval_seconds >= 60),
  daily_limit integer NOT NULL DEFAULT 80 CHECK (daily_limit > 0),
  next_send_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mail_campaigns_org_created ON public.mail_campaigns (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_campaigns_due ON public.mail_campaigns (next_send_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.mail_campaign_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.mail_campaigns(id) ON DELETE CASCADE,
  company_name text NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'retry', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  retry_at timestamptz NULL,
  sent_at timestamptz NULL,
  smtp_message_id text NULL,
  last_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mail_campaign_leads_campaign_email_unique UNIQUE (campaign_id, email)
);
CREATE INDEX IF NOT EXISTS idx_mail_campaign_leads_campaign_status ON public.mail_campaign_leads (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_mail_campaign_leads_org_email ON public.mail_campaign_leads (organization_id, email);
CREATE INDEX IF NOT EXISTS idx_mail_campaign_leads_retry ON public.mail_campaign_leads (retry_at) WHERE status = 'retry';

-- -----------------------------------------------------------------------------
-- 3. Newsletter e iscritti
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mail_newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  created_by uuid NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) > 0),
  subject text NOT NULL DEFAULT '',
  html_content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused')),
  scheduled_at timestamptz NULL,
  timezone text NOT NULL DEFAULT 'Europe/Rome',
  send_interval_seconds integer NOT NULL DEFAULT 60 CHECK (send_interval_seconds >= 30),
  next_send_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mail_newsletters_org_created ON public.mail_newsletters (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_newsletters_due ON public.mail_newsletters (status, next_send_at);

CREATE TABLE IF NOT EXISTS public.mail_newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  newsletter_id uuid NOT NULL REFERENCES public.mail_newsletters(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  sent_at timestamptz NULL,
  smtp_message_id text NULL,
  last_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mail_newsletter_subscribers_nl_email_unique UNIQUE (newsletter_id, email)
);
CREATE INDEX IF NOT EXISTS idx_mail_newsletter_subscribers_lookup ON public.mail_newsletter_subscribers (newsletter_id, status);

-- -----------------------------------------------------------------------------
-- 4. Log di invio, bounce, template, esecuzioni cron
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mail_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  campaign_id uuid NULL REFERENCES public.mail_campaigns(id) ON DELETE CASCADE,
  campaign_lead_id uuid NULL REFERENCES public.mail_campaign_leads(id) ON DELETE CASCADE,
  newsletter_id uuid NULL REFERENCES public.mail_newsletters(id) ON DELETE CASCADE,
  subscriber_id uuid NULL REFERENCES public.mail_newsletter_subscribers(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('sent', 'error')),
  smtp_message_id text NULL,
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mail_email_logs_org_created ON public.mail_email_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_email_logs_campaign_created ON public.mail_email_logs (campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mail_email_logs_lead ON public.mail_email_logs (campaign_lead_id);

CREATE TABLE IF NOT EXISTS public.mail_bounces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  campaign_id uuid NULL REFERENCES public.mail_campaigns(id) ON DELETE SET NULL,
  campaign_lead_id uuid NULL REFERENCES public.mail_campaign_leads(id) ON DELETE SET NULL,
  email text NOT NULL,
  reason text NOT NULL DEFAULT '',
  bounce_type text NOT NULL DEFAULT 'hard' CHECK (bounce_type IN ('hard', 'soft', 'unknown')),
  source text NOT NULL DEFAULT 'imap' CHECK (source IN ('imap', 'manual', 'crm')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mail_bounces_org_detected ON public.mail_bounces (organization_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_bounces_org_email ON public.mail_bounces (organization_id, email);

CREATE TABLE IF NOT EXISTS public.mail_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  created_by uuid NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  kind text NOT NULL DEFAULT 'campaign' CHECK (kind IN ('campaign', 'newsletter')),
  subject text NOT NULL DEFAULT '',
  html text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mail_templates_org_name ON public.mail_templates (organization_id, name);

-- Esecuzioni del cron che hanno prodotto lavoro per un'organizzazione (mai le esecuzioni a vuoto).
CREATE TABLE IF NOT EXISTS public.mail_cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  job_kind text NOT NULL CHECK (job_kind IN ('send', 'bounce_sync')),
  entity_type text NULL CHECK (entity_type IN ('campaign', 'newsletter')),
  entity_id uuid NULL,
  outcome text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL
);
CREATE INDEX IF NOT EXISTS idx_mail_cron_runs_org_started ON public.mail_cron_runs (organization_id, started_at DESC);

-- -----------------------------------------------------------------------------
-- 5. RPC di claim atomico (solo service_role, chiamate dal cron e da "invia ora")
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mail_claim_next_campaign_lead(p_campaign_id uuid)
RETURNS SETOF public.mail_campaign_leads
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_role text := auth.role();
BEGIN
  IF v_role IS NULL OR v_role <> 'service_role' THEN
    RAISE EXCEPTION 'Accesso negato: esecuzione consentita esclusivamente al ruolo service_role (role=%)', coalesce(v_role, 'none')
      USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH candidate AS (
    SELECT id FROM public.mail_campaign_leads
     WHERE campaign_id = p_campaign_id
       AND (status = 'pending' OR (status = 'retry' AND retry_at IS NOT NULL AND retry_at <= now()))
     ORDER BY created_at ASC
     FOR UPDATE SKIP LOCKED
     LIMIT 1
  )
  UPDATE public.mail_campaign_leads cl
     SET status = 'sending', attempts = attempts + 1, updated_at = now()
    FROM candidate
   WHERE cl.id = candidate.id
  RETURNING cl.*;
END;
$$;
REVOKE ALL ON FUNCTION public.mail_claim_next_campaign_lead(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mail_claim_next_campaign_lead(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.mail_claim_next_newsletter_subscriber(p_newsletter_id uuid)
RETURNS SETOF public.mail_newsletter_subscribers
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_role text := auth.role();
BEGIN
  IF v_role IS NULL OR v_role <> 'service_role' THEN
    RAISE EXCEPTION 'Accesso negato: esecuzione consentita esclusivamente al ruolo service_role (role=%)', coalesce(v_role, 'none')
      USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH candidate AS (
    SELECT id FROM public.mail_newsletter_subscribers
     WHERE newsletter_id = p_newsletter_id AND status = 'pending'
     ORDER BY created_at ASC
     FOR UPDATE SKIP LOCKED
     LIMIT 1
  )
  UPDATE public.mail_newsletter_subscribers ns
     SET status = 'sending', attempts = attempts + 1, updated_at = now()
    FROM candidate
   WHERE ns.id = candidate.id
  RETURNING ns.*;
END;
$$;
REVOKE ALL ON FUNCTION public.mail_claim_next_newsletter_subscriber(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mail_claim_next_newsletter_subscriber(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- 6. Trigger, RLS e policy
-- -----------------------------------------------------------------------------
SELECT public.mail_admin_attach_triggers(t) FROM unnest(ARRAY[
  'mail_sender_settings', 'mail_campaigns', 'mail_campaign_leads', 'mail_newsletters',
  'mail_newsletter_subscribers', 'mail_templates'
]) AS t;

-- Impostazioni mittente: lettura ai membri, scrittura solo O/A (updated_by = chi scrive).
SELECT public.mail_admin_set_policies('mail_sender_settings',
  'public.crm_is_active_member(organization_id, (select auth.uid()))',
  'public.mail_can_manage_settings(organization_id)',
  'public.mail_can_manage_settings(organization_id)',
  'public.mail_can_manage_settings(organization_id)');
-- Il testo cifrato non è mai leggibile dal client: grant SELECT per colonna (resta solo al server/service_role).
REVOKE SELECT ON public.mail_sender_settings FROM authenticated;
GRANT SELECT (id, organization_id, from_name, from_email, reply_to, preferred_timezone, send_window_start,
              send_window_end, smtp_host, smtp_port, smtp_secure, smtp_user, imap_host, imap_port, imap_user,
              key_version, is_verified, verified_at, updated_by, created_at, updated_at)
  ON public.mail_sender_settings TO authenticated;

-- Campagne, destinatari, newsletter, iscritti, template: lettura membri attivi; scrittura O/A/M/S/K.
SELECT public.mail_admin_set_policies(t,
  'public.crm_is_active_member(organization_id, (select auth.uid()))',
  'public.mail_can_write(organization_id)',
  'public.mail_can_write(organization_id)',
  'public.mail_can_write(organization_id)')
FROM unnest(ARRAY['mail_campaigns', 'mail_campaign_leads', 'mail_newsletters', 'mail_newsletter_subscribers', 'mail_templates']) AS t;

-- Log, bounce, esecuzioni cron: sola lettura per i membri; scritture solo dal server (service_role).
SELECT public.mail_admin_set_policies(t,
  'public.crm_is_active_member(organization_id, (select auth.uid()))', NULL, NULL, NULL)
FROM unnest(ARRAY['mail_email_logs', 'mail_bounces', 'mail_cron_runs']) AS t;

COMMIT;
