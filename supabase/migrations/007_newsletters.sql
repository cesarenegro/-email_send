-- Migration: 007_newsletters.sql
-- Dedicated schema for scheduled newsletters and subscribers

-- 1. Create newsletters table
CREATE TABLE IF NOT EXISTS public.newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  title text NOT NULL,
  subject text NOT NULL DEFAULT '',
  html_content text NOT NULL DEFAULT '',

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused')),

  scheduled_at timestamptz,
  timezone text NOT NULL DEFAULT 'Europe/Rome',

  send_interval_seconds integer NOT NULL DEFAULT 60
    CHECK (send_interval_seconds >= 30),

  next_send_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletters_user_id ON public.newsletters(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_status_next_send ON public.newsletters(status, next_send_at);

DROP TRIGGER IF EXISTS trg_newsletters_updated_at ON public.newsletters;
CREATE TRIGGER trg_newsletters_updated_at
BEFORE UPDATE ON public.newsletters
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 2. Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  newsletter_id uuid NOT NULL
    REFERENCES public.newsletters(id)
    ON DELETE CASCADE,

  email text NOT NULL,
  name text,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),

  attempts integer NOT NULL DEFAULT 0,

  sent_at timestamptz,
  smtp_message_id text,
  last_error text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (newsletter_id, email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_lookup
  ON public.newsletter_subscribers(newsletter_id, status);

DROP TRIGGER IF EXISTS trg_newsletter_subscribers_updated_at ON public.newsletter_subscribers;
CREATE TRIGGER trg_newsletter_subscribers_updated_at
BEFORE UPDATE ON public.newsletter_subscribers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 3. Atomic subscriber claiming RPC via FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_next_newsletter_subscriber(
  p_newsletter_id uuid
)
RETURNS SETOF public.newsletter_subscribers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Newsletters RLS Policies
DROP POLICY IF EXISTS "Users can view own newsletters" ON public.newsletters;
CREATE POLICY "Users can view own newsletters"
  ON public.newsletters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own newsletters" ON public.newsletters;
CREATE POLICY "Users can insert own newsletters"
  ON public.newsletters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own newsletters" ON public.newsletters;
CREATE POLICY "Users can update own newsletters"
  ON public.newsletters FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own newsletters" ON public.newsletters;
CREATE POLICY "Users can delete own newsletters"
  ON public.newsletters FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on newsletters" ON public.newsletters;
CREATE POLICY "Service role full access on newsletters"
  ON public.newsletters FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Newsletter Subscribers RLS Policies
DROP POLICY IF EXISTS "Users can view own newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Users can view own newsletter subscribers"
  ON public.newsletter_subscribers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.newsletters n
      WHERE n.id = newsletter_subscribers.newsletter_id
        AND n.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Users can insert own newsletter subscribers"
  ON public.newsletter_subscribers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.newsletters n
      WHERE n.id = newsletter_subscribers.newsletter_id
        AND n.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Users can update own newsletter subscribers"
  ON public.newsletter_subscribers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.newsletters n
      WHERE n.id = newsletter_subscribers.newsletter_id
        AND n.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.newsletters n
      WHERE n.id = newsletter_subscribers.newsletter_id
        AND n.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Users can delete own newsletter subscribers"
  ON public.newsletter_subscribers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.newsletters n
      WHERE n.id = newsletter_subscribers.newsletter_id
        AND n.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access on newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Service role full access on newsletter_subscribers"
  ON public.newsletter_subscribers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
