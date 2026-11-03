import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getKontaPublicEnv } from '@/lib/konta/env';
import { sharedSessionCookieOptions } from '@/lib/supabase/cookie-options';

/**
 * Client Supabase SSR legato ai cookie della richiesta, puntato al progetto KONTA.
 * Opera sotto RLS con l'identità dell'utente: mai la chiave segreta.
 * `cookieOptions` fissa il dominio del cookie condiviso solo se NEXT_PUBLIC_KONTA_AUTH_COOKIE_DOMAIN è presente (CONTRATTO §2).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getKontaPublicEnv();

  return createServerClient(url, publishableKey, {
    cookieOptions: sharedSessionCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Chiamato da Server Component: i cookie si scrivono solo nel middleware o nelle route.
        }
      },
    },
  });
}
