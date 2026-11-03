-- =============================================================================
-- MAIL-K — Migrazione KONTA 04: segnalibro IMAP per organizzazione
-- File: supabase/migrations/20261103160000_mailk_konta_04_imap_cursor.sql
--
-- La lettura dei rimbalzi ricorda l'ultimo UID IMAP già esaminato (valido solo
-- finché UIDVALIDITY della casella non cambia), così ogni "Invia/Ricevi" legge
-- solo i messaggi nuovi. Colonne scritte solo dal server (chiave segreta);
-- non aggiunte al grant di colonna per `authenticated`. Idempotente.
-- =============================================================================

BEGIN;

ALTER TABLE public.mail_sender_settings ADD COLUMN IF NOT EXISTS imap_uid_validity bigint NULL;
ALTER TABLE public.mail_sender_settings ADD COLUMN IF NOT EXISTS imap_last_uid bigint NULL;
ALTER TABLE public.mail_sender_settings ADD COLUMN IF NOT EXISTS imap_synced_at timestamptz NULL;

COMMIT;
