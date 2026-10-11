-- Migration: 008_lead_research.sql
-- Dedicated schema for Lead Research (Ricerca Leads: M, XL, AD-HOC)
-- Implements atomic budget reservation, audit tracking, RLS, and source evidence constraints

-- 1. Create lead_research_jobs table
CREATE TABLE IF NOT EXISTS public.lead_research_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  sku text NOT NULL CHECK (sku IN ('M', 'XL', 'AD_HOC')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'accepted', 'in_progress', 'human_review', 'delivered', 'completed', 'failed', 'cancelled')),

  title text NOT NULL DEFAULT '',
  initial_brief text NOT NULL,
  confirmed_scope jsonb,

  price_cents integer NOT NULL CHECK (price_cents > 0),
  currency text NOT NULL DEFAULT 'USD',

  api_budget_micro_usd bigint,
  api_spent_micro_usd bigint NOT NULL DEFAULT 0,
  api_reserved_micro_usd bigint NOT NULL DEFAULT 0,

  pricing_version text NOT NULL DEFAULT '2026-10-v1',
  stop_reason text,

  accepted_at timestamptz,
  due_at timestamptz,
  assigned_staff_id uuid REFERENCES auth.users(id),
  delivered_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_spent_budget CHECK (
    api_budget_micro_usd IS NULL OR
    (api_spent_micro_usd + api_reserved_micro_usd) <= api_budget_micro_usd
  )
);

CREATE INDEX IF NOT EXISTS idx_lead_research_jobs_user_id ON public.lead_research_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_research_jobs_status ON public.lead_research_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lead_research_jobs_due_at ON public.lead_research_jobs(due_at) WHERE status IN ('accepted', 'in_progress', 'human_review');

DROP TRIGGER IF EXISTS trg_lead_research_jobs_updated_at ON public.lead_research_jobs;
CREATE TRIGGER trg_lead_research_jobs_updated_at
BEFORE UPDATE ON public.lead_research_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 2. Create lead_research_results table
CREATE TABLE IF NOT EXISTS public.lead_research_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.lead_research_jobs(id) ON DELETE CASCADE,

  company_name text NOT NULL,
  category text,
  country text,
  region text,
  city text,
  address text,
  email text,
  phone text,
  website text,
  contact_person text,
  contact_role text,

  source_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_status text NOT NULL DEFAULT 'web_found' CHECK (data_status IN ('web_found', 'unverified')),

  human_verified boolean NOT NULL DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  verification_notes text,

  deliverability_status text NOT NULL DEFAULT 'unverified',
  normalized_domain text,
  normalized_email text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_research_results_job_id ON public.lead_research_results(job_id);
CREATE INDEX IF NOT EXISTS idx_lead_research_results_domain ON public.lead_research_results(normalized_domain);

DROP TRIGGER IF EXISTS trg_lead_research_results_updated_at ON public.lead_research_results;
CREATE TRIGGER trg_lead_research_results_updated_at
BEFORE UPDATE ON public.lead_research_results
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 3. Create lead_research_messages table (chat history & clarifications)
CREATE TABLE IF NOT EXISTS public.lead_research_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.lead_research_jobs(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('user', 'assistant', 'system', 'staff')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_research_messages_job_id ON public.lead_research_messages(job_id, created_at);

-- 4. Create lead_research_usage table (atomic usage & reservations)
CREATE TABLE IF NOT EXISTS public.lead_research_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.lead_research_jobs(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('openai', 'tavily')),
  endpoint_or_model text NOT NULL,
  request_id text,
  reserved_micro_usd bigint NOT NULL DEFAULT 0,
  actual_cost_micro_usd bigint NOT NULL DEFAULT 0,
  raw_usage jsonb,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'reconciled', 'failed_reconciled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_research_usage_job_id ON public.lead_research_usage(job_id);

-- 5. Atomic Budget Functions (RPC)
CREATE OR REPLACE FUNCTION public.reserve_lead_research_budget(
  p_job_id uuid,
  p_provider text,
  p_endpoint_or_model text,
  p_amount_micro_usd bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget bigint;
  v_spent bigint;
  v_reserved bigint;
  v_usage_id uuid;
BEGIN
  -- Lock job row for atomic budget update
  SELECT api_budget_micro_usd, api_spent_micro_usd, api_reserved_micro_usd
  INTO v_budget, v_spent, v_reserved
  FROM public.lead_research_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;

  IF v_budget IS NOT NULL AND (v_spent + v_reserved + p_amount_micro_usd) > v_budget THEN
    RAISE EXCEPTION 'Budget exceeded: current spent=%, reserved=%, requested=%, budget=%',
      v_spent, v_reserved, p_amount_micro_usd, v_budget;
  END IF;

  -- Create usage record in reserved state
  INSERT INTO public.lead_research_usage (
    job_id, provider, endpoint_or_model, reserved_micro_usd, status
  ) VALUES (
    p_job_id, p_provider, p_endpoint_or_model, p_amount_micro_usd, 'reserved'
  )
  RETURNING id INTO v_usage_id;

  -- Update job reservations
  UPDATE public.lead_research_jobs
  SET api_reserved_micro_usd = api_reserved_micro_usd + p_amount_micro_usd
  WHERE id = p_job_id;

  RETURN v_usage_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_lead_research_budget(
  p_usage_id uuid,
  p_actual_cost_micro_usd bigint,
  p_raw_usage jsonb DEFAULT NULL,
  p_request_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id uuid;
  v_reserved bigint;
  v_status text;
BEGIN
  SELECT job_id, reserved_micro_usd, status
  INTO v_job_id, v_reserved, v_status
  FROM public.lead_research_usage
  WHERE id = p_usage_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usage record not found: %', p_usage_id;
  END IF;

  IF v_status <> 'reserved' THEN
    RETURN false; -- already reconciled
  END IF;

  -- Lock and update job
  UPDATE public.lead_research_jobs
  SET api_reserved_micro_usd = GREATEST(0, api_reserved_micro_usd - v_reserved),
      api_spent_micro_usd = api_spent_micro_usd + p_actual_cost_micro_usd
  WHERE id = v_job_id;

  -- Update usage record
  UPDATE public.lead_research_usage
  SET status = 'reconciled',
      actual_cost_micro_usd = p_actual_cost_micro_usd,
      raw_usage = p_raw_usage,
      request_id = p_request_id
  WHERE id = p_usage_id;

  RETURN true;
END;
$$;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.lead_research_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_research_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_research_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_research_usage ENABLE ROW LEVEL SECURITY;

-- Policies for lead_research_jobs
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.lead_research_jobs;
CREATE POLICY "Users can view their own jobs"
ON public.lead_research_jobs FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own jobs" ON public.lead_research_jobs;
CREATE POLICY "Users can insert their own jobs"
ON public.lead_research_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own draft/cancelled jobs" ON public.lead_research_jobs;
CREATE POLICY "Users can update their own draft/cancelled jobs"
ON public.lead_research_jobs FOR UPDATE
USING (auth.uid() = user_id AND status IN ('draft', 'submitted'));

-- Policies for lead_research_results
DROP POLICY IF EXISTS "Users can view results for their jobs" ON public.lead_research_results;
CREATE POLICY "Users can view results for their jobs"
ON public.lead_research_results FOR SELECT
USING (
  job_id IN (SELECT id FROM public.lead_research_jobs WHERE user_id = auth.uid())
);

-- Policies for lead_research_messages
DROP POLICY IF EXISTS "Users can view messages for their jobs" ON public.lead_research_messages;
CREATE POLICY "Users can view messages for their jobs"
ON public.lead_research_messages FOR SELECT
USING (
  job_id IN (SELECT id FROM public.lead_research_jobs WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert messages into their jobs" ON public.lead_research_messages;
CREATE POLICY "Users can insert messages into their jobs"
ON public.lead_research_messages FOR INSERT
WITH CHECK (
  job_id IN (SELECT id FROM public.lead_research_jobs WHERE user_id = auth.uid())
);
