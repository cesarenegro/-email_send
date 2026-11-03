/**
 * MAIL-K — Applica una migrazione `mail_*` al database locale KONTA (Docker di K-CRM) con `pg`.
 *
 * Uso:
 *   node scripts/konta/apply-mailk-migration.mjs [percorso-migrazione]
 *
 * Connessione: MAILK_LOCAL_DB_URL oppure il DB Docker locale di K-CRM
 * (postgresql://postgres:postgres@127.0.0.1:54342/postgres).
 * Rifiuta qualsiasi host che non sia locale: questo script non tocca mai il cloud.
 * Non usa `supabase db reset` né ferma lo stack: lo stack serve anche ad altre sessioni.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const DEFAULT_LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:54342/postgres';
const migrationArg = process.argv[2] || 'supabase/migrations/20261103120000_mailk_konta_01_tenant.sql';
const dbUrl = process.env.MAILK_LOCAL_DB_URL || DEFAULT_LOCAL_DB;

const host = new URL(dbUrl).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  console.error(`Rifiutato: host "${host}" non locale. Questo script applica migrazioni solo al DB Docker locale.`);
  process.exit(2);
}

const file = path.resolve(process.cwd(), migrationArg);
if (!fs.existsSync(file)) {
  console.error(`Migrazione non trovata: ${file}`);
  process.exit(2);
}

const sql = fs.readFileSync(file, 'utf8');
const client = new Client({ connectionString: dbUrl });

try {
  await client.connect();
  const { rows: pre } = await client.query(
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'mail\\_%'`
  );
  console.log(`[apply] DB ${host}: tabelle mail_* prima = ${pre[0].n}`);
  await client.query(sql);
  const { rows: post } = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'mail\\_%' ORDER BY 1`
  );
  console.log(`[apply] OK: ${path.basename(file)} applicata. Tabelle mail_* ora = ${post.length}`);
  for (const r of post) console.log(`  - ${r.table_name}`);
  process.exitCode = 0;
} catch (err) {
  console.error(`[apply] ERRORE: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
