/**
 * MAIL-K — Verifica RLS, policy e grant delle tabelle `mail_*` sul DB locale KONTA.
 *
 * Uso: node scripts/konta/verify-mailk-rls.mjs
 *
 * Controlli (tutti via `pg`, solo host locale):
 *  1. ogni tabella mail_* ha RLS attiva e nessuna policy FOR ALL;
 *  2. anon non ha alcun privilegio su alcuna tabella mail_*;
 *  3. authenticated non può leggere smtp_pass_ciphertext / imap_pass_ciphertext;
 *  4. tutte le funzioni mail_* hanno search_path fissato;
 *  5. prova pratica con SET ROLE anon: SELECT su ogni tabella mail_* → permission denied;
 *  6. prova pratica con SET ROLE authenticated + claim JWT di owner-a: vede solo le righe
 *     della propria organizzazione (inserimento e pulizia di righe di prova nella stessa transazione).
 */

import { Client } from 'pg';

const DEFAULT_LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:54342/postgres';
const dbUrl = process.env.MAILK_LOCAL_DB_URL || DEFAULT_LOCAL_DB;
const host = new URL(dbUrl).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  console.error(`Rifiutato: host "${host}" non locale.`);
  process.exit(2);
}

const client = new Client({ connectionString: dbUrl });
let failures = 0;
const ok = (msg) => console.log(`  OK   ${msg}`);
const ko = (msg) => { failures += 1; console.log(`  FAIL ${msg}`); };

try {
  await client.connect();

  const { rows: tables } = await client.query(
    `SELECT c.relname AS table_name, c.relrowsecurity AS rls
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'mail\\_%' ORDER BY 1`
  );
  if (tables.length === 0) ko('nessuna tabella mail_* trovata'); else ok(`${tables.length} tabelle mail_*`);

  console.log('\n[1] RLS attiva e nessuna policy FOR ALL');
  for (const t of tables) {
    if (!t.rls) ko(`${t.table_name}: RLS disattiva`); else ok(`${t.table_name}: RLS attiva`);
  }
  const { rows: forAll } = await client.query(
    `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'mail\\_%' AND cmd = 'ALL'`
  );
  if (forAll.length) ko(`policy FOR ALL presenti: ${forAll.map((r) => `${r.tablename}.${r.policyname}`).join(', ')}`);
  else ok('nessuna policy FOR ALL');
  const { rows: pols } = await client.query(
    `SELECT tablename, cmd, count(*)::int AS n FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'mail\\_%' GROUP BY 1,2 ORDER BY 1,2`
  );
  for (const p of pols) console.log(`       ${p.tablename} ${p.cmd} x${p.n}`);

  console.log('\n[2] anon senza privilegi');
  const { rows: anonGrants } = await client.query(
    `SELECT table_name, privilege_type FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name LIKE 'mail\\_%' AND grantee = 'anon'`
  );
  if (anonGrants.length) ko(`grant ad anon: ${anonGrants.map((g) => `${g.table_name}:${g.privilege_type}`).join(', ')}`);
  else ok('nessun grant di tabella ad anon');
  const { rows: anonCols } = await client.query(
    `SELECT table_name, column_name FROM information_schema.column_privileges
      WHERE table_schema = 'public' AND table_name LIKE 'mail\\_%' AND grantee = 'anon'`
  );
  if (anonCols.length) ko(`grant di colonna ad anon: ${anonCols.length}`); else ok('nessun grant di colonna ad anon');

  console.log('\n[3] authenticated non legge i testi cifrati');
  const { rows: secretCols } = await client.query(
    `SELECT column_name FROM information_schema.column_privileges
      WHERE table_schema = 'public' AND table_name = 'mail_sender_settings' AND grantee = 'authenticated'
        AND privilege_type = 'SELECT' AND column_name IN ('smtp_pass_ciphertext', 'imap_pass_ciphertext')`
  );
  if (secretCols.length) ko(`authenticated legge: ${secretCols.map((c) => c.column_name).join(', ')}`);
  else ok('smtp_pass_ciphertext / imap_pass_ciphertext non leggibili da authenticated');

  console.log('\n[4] search_path fissato sulle funzioni mail_*');
  const { rows: fns } = await client.query(
    `SELECT p.proname, p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname LIKE 'mail\\_%' ORDER BY 1`
  );
  for (const f of fns) {
    const sp = (f.proconfig || []).find((c) => c.startsWith('search_path='));
    if (!sp) ko(`${f.proname}: search_path assente`); else ok(`${f.proname}: ${sp}`);
  }

  console.log('\n[5] SET ROLE anon: nessuna lettura');
  for (const t of tables) {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE anon');
      await client.query(`SELECT 1 FROM public.${t.table_name} LIMIT 1`);
      ko(`${t.table_name}: anon ha letto`);
    } catch (err) {
      if (err.code === '42501') ok(`${t.table_name}: permission denied (42501)`);
      else ko(`${t.table_name}: errore inatteso ${err.code} ${err.message}`);
    } finally {
      await client.query('ROLLBACK');
    }
  }

  console.log('\n[6] SET ROLE authenticated: isolamento per organizzazione (righe di prova in transazione annullata)');
  const { rows: users } = await client.query(
    `SELECT u.id, u.email, m.organization_id FROM auth.users u
       JOIN public.crm_memberships m ON m.user_id = u.id AND m.status = 'active' AND m.role = 'O'
      WHERE u.email IN ('owner-a@test.local', 'owner-b@test.local') ORDER BY u.email, m.organization_id`
  );
  const a = users.find((u) => u.email === 'owner-a@test.local');
  const b = users.find((u) => u.email === 'owner-b@test.local');
  if (!a || !b) {
    ko('utenti seed owner-a/owner-b non trovati con membership attiva');
  } else {
    await client.query('BEGIN');
    try {
      const ins = await client.query(
        `INSERT INTO public.mail_campaigns (organization_id, created_by, name)
         VALUES ($1, $2, '__rls_probe_a__'), ($3, $4, '__rls_probe_b__') RETURNING id, organization_id`,
        [a.organization_id, a.id, b.organization_id, b.id]
      );
      const claimsA = JSON.stringify({ sub: a.id, role: 'authenticated', email: a.email });
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claimsA]);
      const seen = await client.query(`SELECT organization_id FROM public.mail_campaigns WHERE name LIKE '__rls_probe_%'`);
      const orgs = new Set(seen.rows.map((r) => r.organization_id));
      if (orgs.size === 1 && orgs.has(a.organization_id)) ok(`owner-a vede solo org ${a.organization_id}`);
      else ko(`owner-a vede org: ${[...orgs].join(', ') || 'nessuna'}`);
      // Tentativo di scrittura cross-tenant: deve essere rifiutato dalla policy INSERT.
      try {
        await client.query('SAVEPOINT xt');
        await client.query(`INSERT INTO public.mail_campaigns (organization_id, name) VALUES ($1, '__rls_probe_x__')`, [b.organization_id]);
        ko('owner-a ha inserito una campagna nella org di owner-b');
      } catch (err) {
        if (err.code === '42501') ok('owner-a non può inserire nella org di owner-b (42501)');
        else ko(`errore inatteso ${err.code}: ${err.message}`);
        await client.query('ROLLBACK TO SAVEPOINT xt');
      }
      // Lettura dei segreti: la colonna cifrata non deve essere leggibile.
      try {
        await client.query('SAVEPOINT sec');
        await client.query(`SELECT smtp_pass_ciphertext FROM public.mail_sender_settings LIMIT 1`);
        ko('authenticated ha letto smtp_pass_ciphertext');
      } catch (err) {
        if (err.code === '42501') ok('authenticated non legge smtp_pass_ciphertext (42501)');
        else ko(`errore inatteso ${err.code}: ${err.message}`);
        await client.query('ROLLBACK TO SAVEPOINT sec');
      }
      void ins;
    } finally {
      await client.query('ROLLBACK');
    }
    const { rows: left } = await client.query(`SELECT count(*)::int AS n FROM public.mail_campaigns WHERE name LIKE '__rls_probe_%'`);
    if (left[0].n === 0) ok('nessuna riga di prova rimasta'); else ko(`${left[0].n} righe di prova rimaste`);
  }

  console.log(`\n${failures === 0 ? 'TUTTI I CONTROLLI SUPERATI' : `${failures} CONTROLLI FALLITI`}`);
  process.exitCode = failures === 0 ? 0 : 1;
} catch (err) {
  console.error(`[verify] ERRORE: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
