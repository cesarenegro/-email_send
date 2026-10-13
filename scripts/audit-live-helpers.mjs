// Real Auth sessions for the two previously identified audit accounts; secrets stay in memory.
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { createRequire } from 'node:module';
import path from 'node:path';
process.loadEnvFile('.env.local');
export const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (new URL(url).hostname !== 'cayceyagmorwlbmmvyoc.supabase.co') throw new Error('Wrong audit project');
export const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false, autoRefreshToken:false}});
export const tools = createRequire(path.join(process.cwd(), 'output/audit-local-20261013/tools/package.json'));
export async function login(email) {
  const existing = await admin.auth.admin.listUsers();
  if (existing.error || !existing.data.users.some(u => u.email === email)) throw new Error('Existing audit user required');
  const link = await admin.auth.admin.generateLink({type:'magiclink', email});
  if (link.error) throw new Error(link.error.message);
  const client = createClient(url, anonKey, {auth:{persistSession:false, autoRefreshToken:false}});
  const result = await client.auth.verifyOtp({type:'magiclink', token_hash:link.data.properties.hashed_token});
  if (result.error) throw new Error(result.error.message);
  return {client, session:result.data.session, user:result.data.user};
}
export async function cookiesFor(session, origin) {
  const jar = new Map();
  const client = createServerClient(url, anonKey, {cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(x=>jar.set(x.name,x.value))}});
  const result = await client.auth.setSession(session);
  if (result.error) throw new Error(result.error.message);
  return [...jar].map(([name,value])=>({name,value,url:origin,sameSite:'Lax',secure:origin.startsWith('https')}));
}
export async function revoke(account) {
  if (!account) return;
  const result = await admin.auth.admin.signOut(account.session.access_token, 'local');
  if (result.error) throw new Error('Audit session cleanup failed: '+result.error.message);
}
