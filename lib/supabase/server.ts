import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getKontaPublicEnv } from '@/lib/konta/env';

/**
 * Client Supabase SSR legato ai cookie della richiesta, puntato al progetto KONTA.
 * Opera sotto RLS con l'identità dell'utente: mai la chiave segreta.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getKontaPublicEnv();

  return createServerClient(url, publishableKey, {
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
