/**
 * MAIL-K — Collaudo isolamento multi-tenant sul DB locale KONTA.
 *
 * Uso: node scripts/konta/test-tenant-isolation.mjs
 * Legge .env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) e
 * MAILK_LOCAL_DB_URL (default: DB Docker locale di K-CRM). Solo host locali.
 *
 * Passi:
 *  1. anon: SELECT su mail_campaigns → nessuna riga / permesso negato;
 *  2. login owner-a@test.local e owner-b@test.local (seed K-CRM) via API Supabase locale;
 *  3. ognuno crea UNA campagna di prova nella propria organizzazione (RLS);
 *  4. ognuno legge le campagne: vede solo la propria; tentativo cross-tenant → 0 righe / errore;
 *  5. query pg: le due campagne hanno organization_id diversi;
 *  6. pulizia: le campagne di prova vengono cancellate (dagli stessi utenti) e si verifica che non restino.
 */

import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

process.loadEnvFile(path.join(process.cwd(), '.env.local'));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const dbUrl = process.env.MAILK_LOCAL_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54342/postgres';
const PASSWORD = 'Passw0rd!test';

for (const [name, value] of [['NEXT_PUBLIC_SUPABASE_URL', url], ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', key]]) {
  if (!value) {
    console.error(`FATAL: ${name} mancante in .env.local`);
    process.exit(2);
  }
}
for (const u of [url, dbUrl]) {
  const h = new URL(u).hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(h)) {
    console.error(`Rifiutato: host "${h}" non locale.`);
    process.exit(2);
  }
}

let failures = 0;
const ok = (m) => console.log(`  OK   ${m}`);
const ko = (m) => { failures += 1; console.log(`  FAIL ${m}`); };
const stamp = Date.now();
const created = [];

async function loginAs(email) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.user) throw new Error(`login ${email} fallito: ${error?.message}`);
  const { data: m, error: mErr } = await client.from('crm_memberships').select('organization_id, role').eq('user_id', data.user.id).eq('status', 'active').order('created_at').limit(1);
  if (mErr || !m?.length) throw new Error(`membership ${email} non trovata: ${mErr?.message}`);
  return { client, user: data.user, org: m[0].organization_id, role: m[0].role };
}

const pg = new Client({ connectionString: dbUrl });
try {
  await pg.connect();

  console.log('[1] anon');
  const anon = createClient(url, key, { auth: { persistSession: false } });
  const anonRes = await anon.from('mail_campaigns').select('id').limit(1);
  if (anonRes.error) ok(`anon: ${anonRes.error.code || ''} ${anonRes.error.message}`);
  else if ((anonRes.data || []).length === 0) ok('anon: 0 righe');
  else ko('anon ha letto righe');

  console.log('[2] login');
  const A = await loginAs('owner-a@test.local');
  const B = await loginAs('owner-b@test.local');
  ok(`owner-a → org ${A.org} (ruolo ${A.role})`);
  ok(`owner-b → org ${B.org} (ruolo ${B.role})`);
  if (A.org === B.org) ko('le due organizzazioni coincidono: test non significativo');

  console.log('[3] creazione campagne di prova (una per utente, RLS)');
  for (const [who, ctx] of [['owner-a', A], ['owner-b', B]]) {
    const { data, error } = await ctx.client
      .from('mail_campaigns')
      .insert({ organization_id: ctx.org, created_by: ctx.user.id, name: `__isolation_probe_${who}_${stamp}` })
      .select('id, organization_id')
      .single();
    if (error) ko(`${who} insert: ${error.message}`);
    else { ok(`${who} ha creato ${data.id} in ${data.organization_id}`); created.push({ who, ctx, id: data.id }); }
  }

  console.log('[4] lettura isolata');
  for (const [who, ctx, otherOrg] of [['owner-a', A, B.org], ['owner-b', B, A.org]]) {
    const { data, error } = await ctx.client.from('mail_campaigns').select('id, organization_id').like('name', `__isolation_probe_%_${stamp}`);
    if (error) { ko(`${who} select: ${error.message}`); continue; }
    const orgs = new Set(data.map((r) => r.organization_id));
    if (orgs.size === 1 && orgs.has(ctx.org)) ok(`${who} vede solo la propria organizzazione (${data.length} riga)`);
    else ko(`${who} vede org ${[...orgs].join(',')}`);
    const cross = await ctx.client.from('mail_campaigns').select('id').eq('organization_id', otherOrg);
    if (cross.error || (cross.data || []).length === 0) ok(`${who} non legge l'altra organizzazione`);
    else ko(`${who} legge ${cross.data.length} righe dell'altra organizzazione`);
    const xInsert = await ctx.client.from('mail_campaigns').insert({ organization_id: otherOrg, name: `__isolation_probe_x_${stamp}` }).select('id');
    if (xInsert.error) ok(`${who} non può scrivere nell'altra organizzazione (${xInsert.error.code || xInsert.error.message})`);
    else { ko(`${who} ha scritto nell'altra organizzazione`); for (const r of xInsert.data) created.push({ who, ctx, id: r.id, cross: true }); }
  }

  console.log('[5] query pg: organization_id delle campagne di prova');
  const { rows } = await pg.query(`SELECT id, organization_id, name FROM public.mail_campaigns WHERE name LIKE $1 ORDER BY name`, [`__isolation_probe_%_${stamp}`]);
  for (const r of rows) console.log(`       ${r.name} → ${r.organization_id}`);
  const distinct = new Set(rows.map((r) => r.organization_id));
  if (rows.length === 2 && distinct.size === 2) ok('due campagne, due organization_id diversi');
  else ko(`attese 2 campagne con 2 org diversi, trovate ${rows.length} / ${distinct.size}`);
} catch (err) {
  ko(`errore: ${err.message}`);
} finally {
  console.log('[6] pulizia');
  for (const c of created) {
    const { error } = await c.ctx.client.from('mail_campaigns').delete().eq('id', c.id);
    if (error) ko(`cancellazione ${c.id} da ${c.who}: ${error.message}`); else ok(`${c.who} ha cancellato ${c.id}`);
  }
  try {
    const { rows } = await pg.query(`SELECT count(*)::int AS n FROM public.mail_campaigns WHERE name LIKE $1`, [`__isolation_probe_%_${stamp}`]);
    if (rows[0].n === 0) ok('nessuna riga di prova rimasta'); else ko(`${rows[0].n} righe di prova rimaste`);
  } catch (err) {
    ko(`verifica pulizia: ${err.message}`);
  }
  await pg.end();
  console.log(`\n${failures === 0 ? 'TUTTI I CONTROLLI SUPERATI' : `${failures} CONTROLLI FALLITI`}`);
  process.exit(failures === 0 ? 0 : 1);
}
