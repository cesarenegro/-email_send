/**
 * MAIL-K — Collaudo locale dell'account KONTA unico (CONTRATTO_ACCOUNT_UNICO.md §2, §3, §4).
 *
 * Uso: node scripts/konta/test-konta-account-local.mjs [--app http://localhost:3200]
 * Legge .env.local; solo host locali. Nessuna scrittura sul database.
 *
 * Passi:
 *  1. login owner-a@test.local (seed K-CRM) con createServerClient di @supabase/ssr e le opzioni
 *     di lib/supabase/cookie-options.ts: senza variabile i cookie sb-* non hanno `domain` (host-only);
 *     con NEXT_PUBLIC_KONTA_AUTH_COOKIE_DOMAIN=.arkai.dev hanno `domain=.arkai.dev`, secure, lax;
 *  2. RPC konta_my_entitlements dal client utente: products.mailk.state e organizations coincidono
 *     con le membership attive lette dal DB; la risposta passa parseKontaEntitlements;
 *  3. con --app: GET /api/workspace 200; POST /api/campaigns sull'organizzazione → 403 PRODUCT_READ_ONLY
 *     quando mailk non è operativo (nessuna campagna creata).
 */

import path from 'node:path';
import assert from 'node:assert/strict';
import { createServerClient } from '@supabase/ssr';
import { Client } from 'pg';
import { sharedSessionCookieOptions } from '../../lib/supabase/cookie-options.ts';
import { decideCrmRoute, parseKontaEntitlements } from '../../lib/konta/entitlements.ts';

process.loadEnvFile(path.join(process.cwd(), '.env.local'));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const dbUrl = process.env.MAILK_LOCAL_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54342/postgres';
const appArg = process.argv.indexOf('--app');
const appUrl = appArg > 0 ? process.argv[appArg + 1] : null;
const EMAIL = 'owner-a@test.local';
const PASSWORD = 'Passw0rd!test';

for (const u of [url, dbUrl, ...(appUrl ? [appUrl] : [])]) {
  const h = new URL(u).hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(h)) {
    console.error(`Rifiutato: host "${h}" non locale.`);
    process.exit(2);
  }
}

const ok = (msg) => console.log(`  OK   ${msg}`);

async function signIn(env) {
  const jar = new Map();
  const written = [];
  const supabase = createServerClient(url, key, {
    cookieOptions: sharedSessionCookieOptions(env),
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (list) => {
        for (const { name, value, options } of list) {
          jar.set(name, value);
          written.push({ name, options });
        }
      },
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  assert.ifError(error);
  assert.ok(data.session, 'sessione assente');
  return { supabase, jar, written, user: data.user };
}

console.log('[1] cookie di sessione');
const local = await signIn({});
const sessionCookies = local.written.filter((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'));
assert.ok(sessionCookies.length > 0, 'nessun cookie sb-*-auth-token scritto');
for (const c of sessionCookies) assert.equal(c.options?.domain, undefined, `${c.name} ha un domain senza variabile`);
ok(`senza variabile: ${sessionCookies.map((c) => c.name).join(', ')} senza domain (host-only)`);

const shared = await signIn({ NEXT_PUBLIC_KONTA_AUTH_COOKIE_DOMAIN: '.arkai.dev' });
const sharedCookies = shared.written.filter((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'));
for (const c of sharedCookies) {
  assert.equal(c.options?.domain, '.arkai.dev');
  assert.equal(c.options?.secure, true);
  assert.equal(String(c.options?.sameSite).toLowerCase(), 'lax');
  assert.equal(c.options?.path, '/');
}
ok('con NEXT_PUBLIC_KONTA_AUTH_COOKIE_DOMAIN=.arkai.dev: domain .arkai.dev, secure, sameSite lax, path /');

console.log('[2] RPC konta_my_entitlements (client utente)');
const { data: raw, error: rpcError } = await local.supabase.rpc('konta_my_entitlements');
assert.ifError(rpcError);
const ent = parseKontaEntitlements(raw);
assert.ok(ent, 'risposta non conforme al contratto');
assert.equal(ent.user_id, local.user.id);
const db = new Client({ connectionString: dbUrl });
await db.connect();
const { rows: memberships } = await db.query(
  `select m.organization_id::text as id, o.name from crm_memberships m join crm_organizations o on o.id = m.organization_id
    where m.user_id = $1 and m.status = 'active' order by o.name`,
  [local.user.id]
);
const { rows: mailkRows } = await db.query(
  `select organization_id::text as id, access_state from crm_product_access where product_key = 'mailk' and organization_id = any($1::uuid[])`,
  [memberships.map((m) => m.id)]
);
await db.end();
const rpcOrgIds = ent.products.mailk.organizations.map((o) => o.organization_id).sort();
assert.deepEqual(rpcOrgIds, memberships.map((m) => m.id).sort());
ok(`products.mailk.organizations = membership attive (${memberships.map((m) => m.name).join(', ')})`);
ok(`righe crm_product_access mailk per queste organizzazioni: ${mailkRows.length}`);
console.log(`       products.mailk.state = ${ent.products.mailk.state}; products.kcrm.state = ${ent.products.kcrm.state}`);
if (mailkRows.length === 0) assert.equal(ent.products.mailk.state, 'non_activated');
const decision = decideCrmRoute(ent.products.mailk);
ok(`instradamento Mail-K: ${JSON.stringify(decision)}`);

if (appUrl) {
  console.log(`[3] dev server ${appUrl}`);
  const orgId = memberships[0].id;
  const cookieHeader = [...local.jar.entries()].map(([n, v]) => `${n}=${v}`).concat(`mailk_org=${orgId}`).join('; ');
  const ws = await fetch(`${appUrl}/api/workspace`, { headers: { cookie: cookieHeader } });
  assert.equal(ws.status, 200);
  ok('GET /api/workspace 200 con la sessione di owner-a');
  const orgState = ent.products.mailk.organizations.find((o) => o.organization_id === orgId)?.state;
  const res = await fetch(`${appUrl}/api/campaigns`, {
    method: 'POST',
    headers: { cookie: cookieHeader, 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  const body = await res.json().catch(() => ({}));
  if (['active', 'trial_active', 'cancel_scheduled'].includes(orgState)) {
    assert.notEqual(body.code, 'PRODUCT_READ_ONLY');
    ok(`POST /api/campaigns non bloccato dallo stato (${orgState}): ${res.status}`);
  } else {
    assert.equal(res.status, 403);
    assert.equal(body.code, 'PRODUCT_READ_ONLY');
    ok(`POST /api/campaigns con mailk "${orgState}" → 403 PRODUCT_READ_ONLY (nessuna campagna creata)`);
  }
}

console.log('\nTUTTI I CONTROLLI SUPERATI');
