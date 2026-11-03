/**
 * MAIL-K — Collaudo del bucket `mail-images` sul DB locale KONTA.
 * owner-a carica un'immagine nella cartella della propria organizzazione (consentito),
 * prova a caricarla nella cartella di owner-b (rifiutato), poi cancella i propri file.
 * Uso: node scripts/konta/test-storage-isolation.mjs
 */
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile(path.join(process.cwd(), '.env.local'));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.error('FATAL: variabili Supabase mancanti'); process.exit(2); }
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) { console.error('Rifiutato: host non locale'); process.exit(2); }

// PNG 1x1 trasparente (immagine minima valida generata in memoria, non un dato applicativo).
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a0d30000000049454e44ae426082', 'hex');
let failures = 0;
const ok = (m) => console.log(`  OK   ${m}`);
const ko = (m) => { failures += 1; console.log(`  FAIL ${m}`); };

async function login(email) {
  const c = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: 'Passw0rd!test' });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  const { data: m } = await c.from('crm_memberships').select('organization_id').eq('user_id', data.user.id).eq('status', 'active').order('created_at').limit(1);
  return { c, org: m[0].organization_id };
}

const A = await login('owner-a@test.local');
const B = await login('owner-b@test.local');
const stamp = Date.now();
const own = `${A.org}/campaigns/__probe_${stamp}/pixel.png`;
const foreign = `${B.org}/campaigns/__probe_${stamp}/pixel.png`;

const up = await A.c.storage.from('mail-images').upload(own, PNG, { contentType: 'image/png' });
if (up.error) ko(`upload nella propria org: ${up.error.message}`); else ok('upload nella propria organizzazione consentito');

const pub = A.c.storage.from('mail-images').getPublicUrl(own).data.publicUrl;
const res = await fetch(pub);
if (res.ok && (res.headers.get('content-type') || '').includes('image/png')) ok(`URL pubblico raggiungibile (${res.status})`);
else ko(`URL pubblico: ${res.status}`);

const x = await A.c.storage.from('mail-images').upload(foreign, PNG, { contentType: 'image/png' });
if (x.error) ok(`upload nella org altrui rifiutato (${x.error.message})`); else ko('upload nella org altrui consentito');

const svg = await A.c.storage.from('mail-images').upload(`${A.org}/campaigns/__probe_${stamp}/x.svg`, Buffer.from('<svg/>'), { contentType: 'image/svg+xml' });
if (svg.error) ok('SVG rifiutato dal bucket'); else ko('SVG accettato');

const del = await A.c.storage.from('mail-images').remove([own]);
if (del.error) ko(`cancellazione: ${del.error.message}`); else ok('file di prova cancellato');
const left = await A.c.storage.from('mail-images').list(`${A.org}/campaigns/__probe_${stamp}`);
if ((left.data || []).length === 0) ok('nessun file di prova rimasto'); else ko(`${left.data.length} file rimasti`);

console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : `\n${failures} CONTROLLI FALLITI`);
process.exit(failures === 0 ? 0 : 1);
