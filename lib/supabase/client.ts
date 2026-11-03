import { createBrowserClient } from '@supabase/ssr';
import { sharedSessionCookieOptions } from '@/lib/supabase/cookie-options';

/**
 * Client Supabase per il browser, puntato al progetto KONTA (stesso account di KONTA PRO e K-CRM).
 * I valori NEXT_PUBLIC_* sono incorporati in fase di build.
 * Con `NEXT_PUBLIC_KONTA_AUTH_COOKIE_DOMAIN` il cookie di sessione è emesso sul dominio padre
 * (SSO fra le app KONTA, CONTRATTO §2); senza, resta host-only come prima.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !publishableKey) {
    throw new Error('Supabase non configurato: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY richiesti.');
  }

  const cookieOptions = sharedSessionCookieOptions();
  return cookieOptions
    ? createBrowserClient(supabaseUrl, publishableKey, { cookieOptions })
    : createBrowserClient(supabaseUrl, publishableKey);
}
