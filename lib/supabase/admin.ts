import { createClient } from '@supabase/supabase-js';
import { getKontaPublicEnv, getKontaSecretKey } from '@/lib/konta/env';

/**
 * Client con la chiave segreta del progetto KONTA (bypassa RLS).
 * Solo lato server: cron, dispatcher, lettura delle credenziali cifrate.
 * Ogni query che lo usa DEVE filtrare esplicitamente per organization_id.
 */
export function createAdminClient() {
  const { url } = getKontaPublicEnv();
  const secretKey = getKontaSecretKey();

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
