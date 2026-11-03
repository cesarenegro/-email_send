-- =============================================================================
-- MAIL-K — Migrazione KONTA 02: bucket immagini per organizzazione
-- File: supabase/migrations/20261103120100_mailk_konta_02_storage.sql
--
-- Bucket pubblico `mail-images` (le immagini finiscono nelle email: devono essere
-- raggiungibili via HTTPS). Percorso degli oggetti: {organization_id}/...
-- Scrittura/aggiornamento/cancellazione solo ai membri attivi dell'organizzazione
-- indicata dalla prima cartella (helper K-CRM crm_is_active_member). Idempotente.
-- =============================================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mail-images', 'mail-images', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 3145728,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Prima cartella del percorso come uuid dell'organizzazione (NULL se non è un uuid).
CREATE OR REPLACE FUNCTION public.mail_storage_org_of(p_name text)
RETURNS uuid LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN (storage.foldername(p_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (storage.foldername(p_name))[1]::uuid
    ELSE NULL END;
$$;
REVOKE ALL ON FUNCTION public.mail_storage_org_of(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mail_storage_org_of(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "mail_images_public_read" ON storage.objects;
CREATE POLICY "mail_images_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'mail-images');

DROP POLICY IF EXISTS "mail_images_member_insert" ON storage.objects;
CREATE POLICY "mail_images_member_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mail-images'
    AND public.mail_can_write(public.mail_storage_org_of(name)));

DROP POLICY IF EXISTS "mail_images_member_update" ON storage.objects;
CREATE POLICY "mail_images_member_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'mail-images' AND public.mail_can_write(public.mail_storage_org_of(name)))
  WITH CHECK (bucket_id = 'mail-images' AND public.mail_can_write(public.mail_storage_org_of(name)));

DROP POLICY IF EXISTS "mail_images_member_delete" ON storage.objects;
CREATE POLICY "mail_images_member_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mail-images' AND public.mail_can_write(public.mail_storage_org_of(name)));

COMMIT;
