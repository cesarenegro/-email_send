/**
 * MAIL-K — Stato di abilitazione `mailk` dell'organizzazione attiva, lato server (CONTRATTO §3, §4).
 *
 * Chiama `konta_my_entitlements()` con il client legato ai cookie dell'utente (RLS/JWT dell'utente).
 * Esiti:
 * - `unavailable`: la funzione non esiste ancora sul progetto (migrazione non applicata). Mail-K
 *   mantiene il comportamento di prima (solo i controlli di ruolo), come prevede la regola "solo aggiunte".
 * - `error`: risposta assente o non valida. Nessuna deduzione favorevole: le scritture restano bloccate.
 * - `ok`: stato dell'organizzazione (`non_activated` se l'organizzazione non compare).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { parseKontaEntitlements, type KontaAccessState } from '@/lib/konta/entitlements';

export type MailkOrganizationState =
  | { kind: 'ok'; state: KontaAccessState }
  | { kind: 'unavailable' }
  | { kind: 'error' };

/** Codici con cui PostgREST/Postgres segnalano una funzione assente. */
function isMissingFunction(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === 'PGRST202' || error.code === '42883') return true;
  return /could not find the function|function .* does not exist/i.test(error.message ?? '');
}

export async function readMailkOrganizationState(
  supabase: SupabaseClient,
  organizationId: string
): Promise<MailkOrganizationState> {
  try {
    const { data, error } = await supabase.rpc('konta_my_entitlements');
    if (error) return isMissingFunction(error) ? { kind: 'unavailable' } : { kind: 'error' };
    const parsed = parseKontaEntitlements(data);
    if (!parsed) return { kind: 'error' };
    const org = parsed.products.mailk.organizations.find((o) => o.organization_id === organizationId);
    return { kind: 'ok', state: org?.state ?? 'non_activated' };
  } catch {
    return { kind: 'error' };
  }
}
