import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Consensi K-CRM (tabella append-only public.crm_consents, sola lettura da Mail-K).
 * Un indirizzo è soppresso se, per uno degli scopi indicati, l'ultimo evento è "revoked".
 * In caso di errore di lettura il risultato è 'unknown': il chiamante NON invia (fail-closed).
 */
export type ConsentCheck = 'allowed' | 'suppressed' | 'unknown';

export async function checkConsent(
  supabase: SupabaseClient,
  organizationId: string,
  email: string,
  purposes: Array<'marketing' | 'newsletter' | 'commercial_followup'>
): Promise<ConsentCheck> {
  const { data, error } = await supabase
    .from('crm_consents')
    .select('purpose, status, happened_at')
    .eq('organization_id', organizationId)
    .eq('email_normalized', email.trim().toLowerCase())
    .in('purpose', purposes)
    .order('happened_at', { ascending: false })
    .limit(50);
  if (error) {
    console.warn('[consent] lettura crm_consents fallita:', error.message);
    return 'unknown';
  }
  const latest = new Map<string, string>();
  for (const row of (data || []) as Array<{ purpose: string; status: string }>) {
    if (!latest.has(row.purpose)) latest.set(row.purpose, row.status);
  }
  return [...latest.values()].includes('revoked') ? 'suppressed' : 'allowed';
}
