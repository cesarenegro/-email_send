/**
 * MAIL-K — Opzioni del cookie di sessione Supabase condivise con l'ecosistema KONTA.
 * Copia allineata a K-CRM `src/adapters/auth/cookie-options.ts` (stesso contenuto in tutte le app).
 *
 * CONTRATTO_ACCOUNT_UNICO.md §2: in produzione le quattro app (Light, PRO, K-CRM, Mail-K) emettono il
 * cookie di sessione di `@supabase/ssr` sul dominio padre `.arkai.dev`, così un solo accesso vale per
 * tutte. Il nome del cookie deriva dal progetto Supabase ed è già identico ovunque; qui si fissa solo il
 * dominio. Senza la variabile (locale, preview `*.vercel.app`) il cookie resta host-only come oggi.
 */

export interface KontaCookieOptions {
  domain?: string;
  path: string;
  sameSite: 'lax';
  secure: boolean;
}

/**
 * Lettura LETTERALE della variabile: nel bundle del browser Next.js sostituisce solo
 * `process.env.NEXT_PUBLIC_…` scritto per esteso; `process.env` passato come oggetto è vuoto
 * lato client e il dominio condiviso andrebbe perso (correzione del 4/11/2026, come in Light).
 */
function publicCookieEnv(): Record<string, string | undefined> {
  return { NEXT_PUBLIC_KONTA_AUTH_COOKIE_DOMAIN: process.env.NEXT_PUBLIC_KONTA_AUTH_COOKIE_DOMAIN };
}

/** Dominio del cookie condiviso, letto da `NEXT_PUBLIC_KONTA_AUTH_COOKIE_DOMAIN` (es. `.arkai.dev`). */
export function readSharedCookieDomain(env: Record<string, string | undefined> = publicCookieEnv()): string | null {
  const raw = (env.NEXT_PUBLIC_KONTA_AUTH_COOKIE_DOMAIN ?? '').trim().toLowerCase();
  if (!raw) return null;
  // Solo un dominio padre con punto iniziale e almeno un punto interno (es. `.arkai.dev`); mai "localhost".
  if (!/^\.[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(raw)) return null;
  return raw;
}

/**
 * Opzioni da passare a `createBrowserClient` / `createServerClient` come `cookieOptions`.
 * Restituisce `undefined` quando il dominio condiviso non è configurato: nessun cambiamento di comportamento.
 */
export function sharedSessionCookieOptions(
  env: Record<string, string | undefined> = publicCookieEnv()
): KontaCookieOptions | undefined {
  const domain = readSharedCookieDomain(env);
  if (!domain) return undefined;
  return { domain, path: '/', sameSite: 'lax', secure: true };
}
