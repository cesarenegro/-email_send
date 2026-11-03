/**
 * MAIL-K — Applicazione delle migrazioni mail_* al database cloud KONTA (condiviso con KONTA PRO e K-CRM).
 *
 * Uso:
 *   node scripts/konta/cloud-apply-mailk.mjs --env-file <percorso .env con MAILK_CLOUD_DB_PASSWORD> --check
 *   node scripts/konta/cloud-apply-mailk.mjs --env-file <...> --apply
 *
 * Connessione: pooler Supabase in modalità sessione (porta 5432), utente postgres.<ref>.
 * Variabile letta dal file indicato (mai stampata): MAILK_CLOUD_DB_PASSWORD
 * (password attuale del database del progetto KONTA, dal dashboard Supabase).
 * Parametri non segreti: MAILK_CLOUD_PROJECT_REF (default yyzqtaqpbudnkgbvymrf),
 * MAILK_CLOUD_POOLER_HOST (default aws-0-eu-west-1.pooler.supabase.com).
 *
 * --check : solo controlli in lettura (prerequisiti K-CRM, assenza oggetti mail_*, impronta policy).
 * --apply : controlli + migrazioni 01→04 in UNA transazione + controlli successivi;
 *           se un controllo successivo fallisce la transazione viene annullata.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const args = process.argv.slice(2);
const envFileIdx = args.indexOf('--env-file');
const mode = args.includes('--apply') ? 'apply' : args.includes('--check') ? 'check' : null;
if (envFileIdx < 0 || !args[envFileIdx + 1] || !mode) {
  console.error('Uso: --env-file <file> (--check | --apply)');
  process.exit(2);
}

const envText = fs.readFileSync(args[envFileIdx + 1], 'utf8');
let password = null;
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^MAILK_CLOUD_DB_PASSWORD=(.*)$/);
  if (m) password = m[1].trim().replace(/^"(.*)"$/, '$1');
}
if (!password) {
  console.error('MAILK_CLOUD_DB_PASSWORD non trovata nel file indicato.');
  process.exit(2);
}

const ref = process.env.MAILK_CLOUD_PROJECT_REF || 'yyzqtaqpbudnkgbvymrf';
const host = process.env.MAILK_CLOUD_POOLER_HOST || 'aws-0-eu-west-1.pooler.supabase.com';
const MIGRATIONS = [
  'supabase/migrations/20261103120000_mailk_konta_01_tenant.sql',
  'supabase/migrations/20261103120100_mailk_konta_02_storage.sql',
  'supabase/migrations/20261103140000_mailk_konta_03_crm_bridge.sql',
  'supabase/migrations/20261103160000_mailk_konta_04_imap_cursor.sql',
];

const client = new Client({
  host,
  port: 5432,
  user: `postgres.${ref}`,
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

let failures = 0;
const ok = (m) => console.log(`  OK   ${m}`);
const ko = (m) => { failures += 1; console.log(`  FAIL ${m}`); };

const FINGERPRINT_SQL = `
  SELECT md5(string_agg(schemaname || '.' || tablename || '.' || policyname || ':' || cmd || ':' ||
                        coalesce(qual, '') || ':' || coalesce(with_check, ''), '|' ORDER BY schemaname, tablename, policyname)) AS fp,
         count(*)::int AS n
    FROM pg_policies
   WHERE NOT (schemaname = 'public' AND tablename LIKE 'mail\\_%')
     AND NOT (schemaname = 'storage' AND policyname LIKE 'mail\\_images\\_%')`;

async function prechecks() {
  console.log('[pre] prerequisiti e stato attuale');
  const { rows: db } = await client.query(`SELECT current_database() AS db, current_user AS u`);
  ok(`connesso a ${db[0].db} come ${db[0].u.split('.')[0]} (progetto ${ref})`);
  const { rows: fns } = await client.query(
    `SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND proname IN ('crm_is_active_member', 'crm_member_role')`
  );
  if (fns.length === 2) ok('helper K-CRM crm_is_active_member e crm_member_role presenti'); else ko(`helper K-CRM mancanti (${fns.length}/2)`);
  const { rows: t } = await client.query(
    `SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_organizations')::int AS crm_orgs,
            (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_memberships')::int AS crm_mem,
            (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_consents')::int AS crm_cons,
            (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'pro\\_%')::int AS pro_tables,
            (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'mail\\_%')::int AS mail_tables,
            (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname LIKE 'mail\\_%')::int AS mail_fns,
            (SELECT count(*) FROM storage.buckets WHERE id = 'mail-images')::int AS bucket`
  );
  const s = t[0];
  if (s.crm_orgs === 1 && s.crm_mem === 1 && s.crm_cons === 1) ok('tabelle K-CRM crm_organizations, crm_memberships, crm_consents presenti'); else ko('tabelle K-CRM mancanti');
  if (s.pro_tables > 0) ok(`database KONTA PRO riconosciuto (${s.pro_tables} tabelle pro_*)`); else ko('nessuna tabella pro_*: database inatteso');
  console.log(`       oggetti Mail-K già presenti: tabelle ${s.mail_tables}, funzioni ${s.mail_fns}, bucket ${s.bucket}`);
  const { rows: fp } = await client.query(FINGERPRINT_SQL);
  console.log(`       impronta policy non Mail-K: ${fp[0].fp} (${fp[0].n} policy)`);
  return { state: s, fingerprint: fp[0].fp, policies: fp[0].n };
}

async function postchecks(before) {
  console.log('[post] controlli dopo l\'applicazione (dentro la transazione)');
  const { rows: tables } = await client.query(
    `SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'mail\\_%' ORDER BY 1`
  );
  if (tables.length === 9) ok('9 tabelle mail_*'); else ko(`${tables.length} tabelle mail_* (attese 9)`);
  const noRls = tables.filter((r) => !r.relrowsecurity).map((r) => r.relname);
  if (noRls.length === 0) ok('RLS attiva su tutte'); else ko(`RLS disattiva: ${noRls.join(', ')}`);
  const { rows: forAll } = await client.query(`SELECT count(*)::int n FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'mail\\_%' AND cmd='ALL'`);
  if (forAll[0].n === 0) ok('nessuna policy FOR ALL'); else ko(`${forAll[0].n} policy FOR ALL`);
  const { rows: anon } = await client.query(
    `SELECT (SELECT count(*) FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name LIKE 'mail\\_%' AND grantee='anon')
          + (SELECT count(*) FROM information_schema.column_privileges WHERE table_schema='public' AND table_name LIKE 'mail\\_%' AND grantee='anon') AS n`
  );
  if (Number(anon[0].n) === 0) ok('anon senza privilegi su mail_*'); else ko(`anon ha ${anon[0].n} privilegi`);
  const { rows: sec } = await client.query(
    `SELECT count(*)::int n FROM information_schema.column_privileges WHERE table_schema='public' AND table_name='mail_sender_settings'
      AND grantee='authenticated' AND privilege_type='SELECT' AND column_name IN ('smtp_pass_ciphertext','imap_pass_ciphertext','imap_last_uid','imap_uid_validity')`
  );
  if (sec[0].n === 0) ok('authenticated non legge segreti né segnalibro IMAP'); else ko(`authenticated legge ${sec[0].n} colonne riservate`);
  const { rows: sp } = await client.query(
    `SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND proname LIKE 'mail\\_%' AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(proconfig, '{}')) c WHERE c LIKE 'search_path=%')`
  );
  if (sp.length === 0) ok('search_path fissato su tutte le funzioni mail_*'); else ko(`search_path assente: ${sp.map((r) => r.proname).join(', ')}`);
  for (const r of tables) {
    await client.query('SAVEPOINT anon_probe');
    try {
      await client.query('SET LOCAL ROLE anon');
      await client.query(`SELECT 1 FROM public.${r.relname} LIMIT 1`);
      ko(`${r.relname}: anon ha letto`);
    } catch (err) {
      if (err.code !== '42501') ko(`${r.relname}: errore inatteso ${err.code}`);
    }
    await client.query('ROLLBACK TO SAVEPOINT anon_probe');
    await client.query('RESET ROLE');
  }
  ok('SET ROLE anon: lettura negata (42501) su ogni tabella mail_*');
  const { rows: b } = await client.query(`SELECT public, file_size_limit FROM storage.buckets WHERE id='mail-images'`);
  if (b.length === 1 && b[0].public === true) ok('bucket mail-images pubblico creato'); else ko('bucket mail-images assente');
  const { rows: fp } = await client.query(FINGERPRINT_SQL);
  if (fp[0].fp === before.fingerprint && fp[0].n === before.policies) ok(`impronta policy non Mail-K invariata (${fp[0].n} policy)`);
  else ko(`impronta policy non Mail-K CAMBIATA: ${before.fingerprint} → ${fp[0].fp}`);
}

try {
  await client.connect();
  const before = await prechecks();
  if (failures > 0) {
    console.log(`\n${failures} PREREQUISITI NON SODDISFATTI: nulla applicato.`);
    process.exitCode = 1;
  } else if (mode === 'check') {
    console.log('\nCONTROLLI OK (solo lettura, nulla applicato).');
  } else {
    console.log('\n[apply] migrazioni in una sola transazione');
    await client.query('BEGIN');
    try {
      for (const file of MIGRATIONS) {
        const sql = fs.readFileSync(path.resolve(file), 'utf8')
          .split(/\r?\n/)
          .filter((l) => !/^\s*(BEGIN|COMMIT)\s*;\s*$/i.test(l))
          .join('\n');
        const t0 = Date.now();
        await client.query(sql);
        ok(`${path.basename(file)} (${Date.now() - t0} ms)`);
      }
      await postchecks(before);
      if (failures > 0) {
        await client.query('ROLLBACK');
        console.log(`\n${failures} CONTROLLI FALLITI: transazione annullata, nulla applicato.`);
        process.exitCode = 1;
      } else {
        await client.query('COMMIT');
        console.log('\nAPPLICATO E VERIFICATO (COMMIT eseguito).');
      }
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.log(`\nERRORE: ${err.message}. Transazione annullata, nulla applicato.`);
      process.exitCode = 1;
    }
  }
} catch (err) {
  console.error(`Connessione o controllo fallito: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
