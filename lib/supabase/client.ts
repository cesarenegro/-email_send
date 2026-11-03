import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Supabase per il browser, puntato al progetto KONTA (stesso account di KONTA PRO e K-CRM).
 * I valori NEXT_PUBLIC_* sono incorporati in fase di build.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !publishableKey) {
    throw new Error('Supabase non configurato: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY richiesti.');
  }

  return createBrowserClient(supabaseUrl, publishableKey);
}
