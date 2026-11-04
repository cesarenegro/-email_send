/**
 * MAIL-K — Collaudo locale delle regole della prova gratuita (decisione del proprietario, 2026-11-04).
 *
 * Uso (dev server con LEAD_RESEARCH_ENABLED=true sulla porta 3200):
 *   node scripts/konta/test-konta-trial-local.mjs --app http://localhost:3200
 *
 * Solo host locali. Crea righe TEMPORANEE in crm_product_access (product_key 'mailk', source
 * 'mailk_local_trial_test') per le organizzazioni di owner-a@test.local e le rimuove SEMPRE alla fine.
 *
 * Controlli:
 *  1. mailk = trial_active: GET/POST /api/lead-research → 403 TRIAL_FEATURE_LOCKED con il messaggio italiano;
 *     GET /api/lead-research/<id>, start, cancel, export → 403 TRIAL_FEATURE_LOCKED; /api/workspace → mailk_state trial_active;
 *  2. mailk = active (stessa organizzazione): le stesse rotte NON rispondono più TRIAL_FEATURE_LOCKED;
 *  3. senza riga mailk (non_activated): nessun blocco TRIAL_FEATURE_LOCKED.
 */

import path from 'node:path';
import assert from 'node:assert/strict';
import { createServerClient } from '@supabase/ssr';
import { Client } from 'pg';

process.loadEnvFile(path.join(process.cwd(), '.env.local'));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const dbUrl = process.env.MAILK_LOCAL_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54342/postgres';
const appArg = process.argv.indexOf('--app');
const appUrl = appArg > 0 ? process.argv[appArg + 1] : 'http://localhost:3200';
const SOURCE = 'mailk_local_trial_test';
const OWNER_A = '11111111-1111-4111-8111-111111111111';
const MESSAGE = 'La ricerca di nuovi lead non è inclusa nella prova gratuita: disponibile con un piano attivo.';
const FAKE_JOB = '00000000-0000-4000-8000-000000000001';

for (const u of [url, dbUrl, appUrl]) {
  const h = new URL(u).hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(h)) {
    console.error(`Rifiutato: host "${h}" non locale.`);
    process.exit(2);
  }
}

const ok = (msg) => console.log(`  OK   ${msg}`);
const db = new Client({ connectionString: dbUrl });
await db.connect();

async function login() {
  const jar = new Map();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email: 'owner-a@test.local', password: 'Passw0rd!test' });
  assert.ifError(error);
  return jar;
}

const cookieFor = (jar, orgId) =>
  [...jar.entries()].map(([n, v]) => `${n}=${v}`).concat(`mailk_org=${orgId}`).join('; ');

async function call(jar, orgId, method, pathname, body) {
  const res = await fetch(`${appUrl}${pathname}`, {
    method,
    headers: { cookie: cookieFor(jar, orgId), 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

const LEAD_ROUTES = [
  ['GET', '/api/lead-research'],
  ['POST', '/api/lead-research', { sku: 'M', initial_brief: 'prova prova prova' }],
  ['GET', `/api/lead-research/${FAKE_JOB}`],
  ['POST', `/api/lead-research/${FAKE_JOB}/start`],
  ['POST', `/api/lead-research/${FAKE_JOB}/cancel`],
  ['GET', `/api/lead-research/${FAKE_JOB}/export?format=csv`],
];

try {
  const { rows: orgs } = await db.query(
    `select o.id::text as id, o.name from crm_organizations o join crm_memberships m on m.organization_id = o.id
      where m.user_id = $1 and m.status = 'active' and o.name = 'Alfa Impianti Srl'`,
    [OWNER_A]
  );
  assert.equal(orgs.length, 1, 'organizzazione Alfa Impianti Srl non trovata');
  const orgId = orgs[0].id;
  await db.query(`delete from crm_product_access where product_key = 'mailk' and source = $1`, [SOURCE]);
  const pre = await db.query(`select 1 from crm_product_access where product_key = 'mailk' and organization_id = $1`, [orgId]);
  assert.equal(pre.rowCount, 0, 'esiste già una riga mailk reale per questa organizzazione: collaudo interrotto');

  const jar = await login();

  console.log('[1] mailk = trial_active');
  await db.query(
    `insert into crm_product_access (organization_id, product_key, access_state, valid_until, source)
     values ($1, 'mailk', 'trial_active', now() + interval '14 days', $2)`,
    [orgId, SOURCE]
  );
  const ws = await call(jar, orgId, 'GET', '/api/workspace');
  assert.equal(ws.status, 200);
  assert.equal(ws.body.mailk_state, 'trial_active');
  ok('/api/workspace → mailk_state = trial_active');
  for (const [method, p, body] of LEAD_ROUTES) {
    const r = await call(jar, orgId, method, p, body);
    assert.equal(r.status, 403, `${method} ${p} → ${r.status}`);
    assert.equal(r.body.code, 'TRIAL_FEATURE_LOCKED');
    assert.equal(r.body.error, MESSAGE);
    ok(`${method} ${p.split('?')[0].replace(FAKE_JOB, '<id>')} → 403 TRIAL_FEATURE_LOCKED`);
  }

  console.log('[2] mailk = active (stessa organizzazione)');
  await db.query(`update crm_product_access set access_state = 'active', valid_until = null where product_key = 'mailk' and source = $1`, [SOURCE]);
  for (const [method, p, body] of LEAD_ROUTES) {
    const r = await call(jar, orgId, method, p, body);
    assert.notEqual(r.body.code, 'TRIAL_FEATURE_LOCKED', `${method} ${p} ancora bloccata`);
    ok(`${method} ${p.split('?')[0].replace(FAKE_JOB, '<id>')} → ${r.status} (non bloccata dalla prova)`);
  }

  console.log('[3] nessuna riga mailk (non_activated)');
  await db.query(`delete from crm_product_access where product_key = 'mailk' and source = $1`, [SOURCE]);
  const r3 = await call(jar, orgId, 'GET', '/api/lead-research');
  assert.notEqual(r3.body.code, 'TRIAL_FEATURE_LOCKED');
  ok(`GET /api/lead-research → ${r3.status} (nessun blocco prova)`);

  console.log('\nTUTTI I CONTROLLI SUPERATI');
} finally {
  await db.query(`delete from crm_product_access where product_key = 'mailk' and source = $1`, [SOURCE]);
  const left = await db.query(`select count(*)::int as n from crm_product_access where product_key = 'mailk' and source = $1`, [SOURCE]);
  console.log(`  pulizia: righe di prova rimaste = ${left.rows[0].n}`);
  await db.end();
}
