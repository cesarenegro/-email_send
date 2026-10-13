-- Migration 010_user_smtp_connections.sql
-- Fase 2: Isolamento Connessioni SMTP per Utente con Cifratura Server-Side e Restrizione Privilegi
-- PREPARATO LOCALMENTE - NON APPLICARE AL DATABASE REMOTO SENZA APPROVAZIONE ESPLICITA

BEGIN;

-- 1. Tabella smtp_connections: memorizza le credenziali cifrate
CREATE TABLE IF NOT EXISTS public.smtp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Casella Principale',
  host text NOT NULL,
  port integer NOT NULL CHECK (port IN (25, 465, 587, 2525)),
  secure boolean NOT NULL DEFAULT true,
  username text NOT NULL,
  encrypted_password text NOT NULL,
  from_name text NOT NULL,
  from_email text NOT NULL,
  reply_to text,
  is_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indici e vincoli di unicità per isolamento tenant
CREATE INDEX IF NOT EXISTS idx_smtp_connections_user_id ON public.smtp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_smtp_connections_user_verified ON public.smtp_connections(user_id, is_verified);
ALTER TABLE public.smtp_connections DROP CONSTRAINT IF EXISTS uq_smtp_connections_id_user_id;
ALTER TABLE public.smtp_connections ADD CONSTRAINT uq_smtp_connections_id_user_id UNIQUE (id, user_id);

-- 2. Trigger per aggiornamento automatico updated_at
DROP TRIGGER IF EXISTS trg_smtp_connections_updated_at ON public.smtp_connections;
CREATE TRIGGER trg_smtp_connections_updated_at
BEFORE UPDATE ON public.smtp_connections
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 3. Collegamento chiavi esterne su campagne e newsletter con vincolo composite di proprietà (id, user_id)
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS smtp_connection_id uuid;

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS fk_campaigns_smtp_connection_owner;
ALTER TABLE public.campaigns 
ADD CONSTRAINT fk_campaigns_smtp_connection_owner
FOREIGN KEY (smtp_connection_id, user_id) 
REFERENCES public.smtp_connections(id, user_id) 
ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_campaigns_smtp_connection_id ON public.campaigns(smtp_connection_id);

ALTER TABLE public.newsletters 
ADD COLUMN IF NOT EXISTS smtp_connection_id uuid;

ALTER TABLE public.newsletters DROP CONSTRAINT IF EXISTS fk_newsletters_smtp_connection_owner;
ALTER TABLE public.newsletters 
ADD CONSTRAINT fk_newsletters_smtp_connection_owner
FOREIGN KEY (smtp_connection_id, user_id) 
REFERENCES public.smtp_connections(id, user_id) 
ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_newsletters_smtp_connection_id ON public.newsletters(smtp_connection_id);

-- 4. Trigger di controllo integrità e stato di verifica (impedisce assegnazione caselle altrui o non verificate)
CREATE OR REPLACE FUNCTION public.check_smtp_connection_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.smtp_connection_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.smtp_connections
      WHERE id = NEW.smtp_connection_id 
        AND user_id = NEW.user_id 
        AND is_verified = true
    ) THEN
      RAISE EXCEPTION 'Violazione di integrità: la connessione SMTP % non appartiene all''utente % oppure non è verificata', 
        NEW.smtp_connection_id, NEW.user_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_campaigns_smtp_integrity ON public.campaigns;
CREATE TRIGGER trg_campaigns_smtp_integrity
BEFORE INSERT OR UPDATE OF smtp_connection_id, user_id ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.check_smtp_connection_integrity();

DROP TRIGGER IF EXISTS trg_newsletters_smtp_integrity ON public.newsletters;
CREATE TRIGGER trg_newsletters_smtp_integrity
BEFORE INSERT OR UPDATE OF smtp_connection_id, user_id ON public.newsletters
FOR EACH ROW
EXECUTE FUNCTION public.check_smtp_connection_integrity();

-- 5. Rigorosa Protezione Privilegi sulla Tabella Base
-- NESSUN ACCESSO DIRETTO ALLA TABELLA BASE PER UTENTI CLIENT/AUTHENTICATED
ALTER TABLE public.smtp_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.smtp_connections FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.smtp_connections TO service_role;

DROP POLICY IF EXISTS "Service role full access on smtp connections" ON public.smtp_connections;
CREATE POLICY "Service role full access on smtp connections"
  ON public.smtp_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Vista Sicura per la Sola Lettura dei Metadati da parte dell'Utente Autenticato
-- NOTA ARCHITETTURALE: L'applicazione client recupera i metadati tramite l'API server protetta
-- (/api/smtp/connections via service_role). Per compatibilità con accessi SQL diretti,
-- la vista utilizza security_barrier = true (SENZA security_invoker) in modo che l'accesso
-- avvenga con i privilegi del proprietario della vista, preservando il blocco totale sulla tabella base
-- ed evitando errori di permission denied pur garantendo WHERE auth.uid() = user_id e zero leak di password.
CREATE OR REPLACE VIEW public.user_smtp_connections_view 
WITH (security_barrier = true) AS
SELECT 
  id,
  user_id,
  name,
  host,
  port,
  secure,
  username,
  from_name,
  from_email,
  reply_to,
  is_verified,
  verified_at,
  created_at,
  updated_at
FROM public.smtp_connections
WHERE auth.uid() = user_id;

-- GRANT SELECT is additive: remove inherited default object grants first.
REVOKE ALL ON public.user_smtp_connections_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_smtp_connections_view TO authenticated;

COMMIT;
