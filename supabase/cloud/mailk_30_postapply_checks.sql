-- MAIL-K — Controlli dopo l'applicazione sul cloud KONTA (sola lettura). Ogni riga deve dire OK.
SELECT 'tabelle mail_* = 9' AS controllo,
       CASE WHEN count(*) = 9 THEN 'OK' ELSE 'FAIL: ' || count(*) END AS esito
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'mail_%'
UNION ALL
SELECT 'RLS attiva su tutte',
       CASE WHEN bool_and(c.relrowsecurity) THEN 'OK' ELSE 'FAIL' END
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'mail_%'
UNION ALL
SELECT 'nessuna policy FOR ALL',
       CASE WHEN count(*) = 0 THEN 'OK' ELSE 'FAIL: ' || count(*) END
  FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'mail_%' AND cmd = 'ALL'
UNION ALL
SELECT 'anon senza privilegi',
       CASE WHEN count(*) = 0 THEN 'OK' ELSE 'FAIL: ' || count(*) END
  FROM information_schema.role_table_grants
 WHERE table_schema = 'public' AND table_name LIKE 'mail_%' AND grantee = 'anon'
UNION ALL
SELECT 'segreti non leggibili da authenticated',
       CASE WHEN count(*) = 0 THEN 'OK' ELSE 'FAIL: ' || count(*) END
  FROM information_schema.column_privileges
 WHERE table_schema = 'public' AND table_name = 'mail_sender_settings' AND grantee = 'authenticated'
   AND privilege_type = 'SELECT'
   AND column_name IN ('smtp_pass_ciphertext', 'imap_pass_ciphertext', 'imap_last_uid', 'imap_uid_validity')
UNION ALL
SELECT 'search_path fissato sulle funzioni mail_*',
       CASE WHEN count(*) = 0 THEN 'OK' ELSE 'FAIL: ' || string_agg(proname, ', ') END
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND proname LIKE 'mail_%'
   AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(proconfig, '{}')) cfg WHERE cfg LIKE 'search_path=%')
UNION ALL
SELECT 'bucket mail-images pubblico',
       CASE WHEN count(*) = 1 THEN 'OK' ELSE 'FAIL' END
  FROM storage.buckets WHERE id = 'mail-images' AND public;
