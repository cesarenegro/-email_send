-- Migration: 009_security_hardening.sql
-- Description: Hardening isolamento database, RLS email_logs, revoca RPC pubbliche e search_path sicuro
-- Audit reference: AUDIT_MAILK_2026-10-13 (F01, F02, F03, Advisor warnings)
-- Modalita': Esecuzione atomica (BEGIN ... COMMIT) con modello di autorizzazione esclusivo per service_role

BEGIN;

-- ============================================================================
-- 1. HARDENING RPC: public.claim_next_campaign_lead
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_next_campaign_lead(
  p_campaign_id uuid
)
RETURNS SETOF public.campaign_leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := auth.role();
BEGIN
  -- Controllo autorizzativo rigoroso del chiamante:
  -- Il dispatcher di invio (/api/cron/send e /api/campaigns/[id]/send-now) opera
  -- esclusivamente tramite createAdminClient(), con ruolo JWT 'service_role'.
  -- Qualsiasi chiamata priva di ruolo o proveniente da ruoli diversi (anon, authenticated, ecc.)
  -- viene categoricamente rifiutata con codice di errore 42501.
  IF v_role IS NULL OR v_role <> 'service_role' THEN
    RAISE EXCEPTION 'Accesso negato: esecuzione consentita esclusivamente al ruolo service_role (role=%)', COALESCE(v_role, 'none')
      USING ERRCODE = '42501';
  END IF;

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

-- Revoca totale di EXECUTE da PUBLIC, anon e authenticated.
-- Concesso unicamente a service_role.
REVOKE ALL ON FUNCTION public.claim_next_campaign_lead(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_campaign_lead(uuid) TO service_role;


-- ============================================================================
-- 2. HARDENING RPC: public.claim_next_newsletter_subscriber
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_next_newsletter_subscriber(
  p_newsletter_id uuid
)
RETURNS SETOF public.newsletter_subscribers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := auth.role();
BEGIN
  -- Controllo autorizzativo rigoroso del chiamante:
  IF v_role IS NULL OR v_role <> 'service_role' THEN
    RAISE EXCEPTION 'Accesso negato: esecuzione consentita esclusivamente al ruolo service_role (role=%)', COALESCE(v_role, 'none')
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH candidate AS (
    SELECT id
    FROM public.newsletter_subscribers
    WHERE newsletter_id = p_newsletter_id
      AND status = 'pending'
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.newsletter_subscribers ns
  SET
    status = 'sending',
    attempts = attempts + 1,
    updated_at = now()
  FROM candidate
  WHERE ns.id = candidate.id
  RETURNING ns.*;
END;
$$;

-- Revoca totale di EXECUTE da PUBLIC, anon e authenticated.
-- Concesso unicamente a service_role.
REVOKE ALL ON FUNCTION public.claim_next_newsletter_subscriber(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_newsletter_subscriber(uuid) TO service_role;


-- ============================================================================
-- 3. ROW LEVEL SECURITY E GRANTS: public.email_logs
-- ============================================================================

-- Abilita RLS obbligatoria
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Revoca permessi pubblici e anonimi
REVOKE ALL ON public.email_logs FROM anon, PUBLIC;

-- Utenti autenticati: solo SELECT sui log delle proprie campagne
REVOKE INSERT, UPDATE, DELETE ON public.email_logs FROM authenticated;
GRANT SELECT ON public.email_logs TO authenticated;

DROP POLICY IF EXISTS "Users can view logs of own campaigns" ON public.email_logs;
CREATE POLICY "Users can view logs of own campaigns"
  ON public.email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = email_logs.campaign_id
        AND campaigns.user_id = auth.uid()
    )
  );

-- Service role: accesso completo per dispatcher e sync bounce
DROP POLICY IF EXISTS "Service role full access on email_logs" ON public.email_logs;
CREATE POLICY "Service role full access on email_logs"
  ON public.email_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================================
-- 4. HARDENING POLICY: public.app_settings
-- ============================================================================

-- Rimuovi la policy che permetteva a qualunque utente autenticato di modificare le impostazioni globali
DROP POLICY IF EXISTS "Allow authenticated upsert on app_settings" ON public.app_settings;

-- Revoca permessi di scrittura da authenticated, anon e PUBLIC
REVOKE INSERT, UPDATE, DELETE ON public.app_settings FROM authenticated, anon, PUBLIC;

-- Utenti autenticati hanno solo SELECT (lettura fallback client-side)
GRANT SELECT ON public.app_settings TO authenticated;

DROP POLICY IF EXISTS "Allow authenticated read on app_settings" ON public.app_settings;
CREATE POLICY "Allow authenticated read on app_settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Solo service_role puo' eseguire INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Allow service_role full access on app_settings" ON public.app_settings;
CREATE POLICY "Allow service_role full access on app_settings"
  ON public.app_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================================
-- 5. SEARCH_PATH SU FUNZIONI CONDIVISE E PRIVILEGIATE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Hardening funzioni lead research (se presenti da migrazione 008)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'reserve_lead_research_budget'
  ) THEN
    REVOKE ALL ON FUNCTION public.reserve_lead_research_budget(uuid, text, text, bigint) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.reserve_lead_research_budget(uuid, text, text, bigint) TO service_role;
    ALTER FUNCTION public.reserve_lead_research_budget(uuid, text, text, bigint) SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'reconcile_lead_research_budget'
  ) THEN
    REVOKE ALL ON FUNCTION public.reconcile_lead_research_budget(uuid, bigint, jsonb, text) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.reconcile_lead_research_budget(uuid, bigint, jsonb, text) TO service_role;
    ALTER FUNCTION public.reconcile_lead_research_budget(uuid, bigint, jsonb, text) SET search_path = public, pg_temp;
  END IF;
END $$;

COMMIT;
