-- Migration: 004_claim_lead_rpc.sql
-- Function: public.claim_next_campaign_lead

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
