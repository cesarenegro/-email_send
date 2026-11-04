/**
 * MAIL-K — Blocco server della ricerca di nuovi lead durante la prova gratuita.
 *
 * Si aggiunge ai controlli esistenti delle route Lead Research (modulo attivo, utente autenticato),
 * senza sostituirli. Legge lo stato `mailk` dell'organizzazione attiva (cookie `mailk_org`) da
 * `konta_my_entitlements()` tramite `readMailkOrganizationState`.
 *
 * - `trial_active` → 403 `TRIAL_FEATURE_LOCKED`.
 * - Nessuna organizzazione scelta, RPC assente o risposta non valida → nessun blocco aggiuntivo
 *   (comportamento di prima): il middleware impone già l'organizzazione sulle API.
 */

import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readActiveOrganizationCookie } from '@/lib/konta/session';
import { readMailkOrganizationState } from '@/lib/konta/entitlements-server';
import {
  LEAD_RESEARCH_TRIAL_LOCK_MESSAGE,
  TRIAL_FEATURE_LOCKED_CODE,
  isLeadResearchLockedByState,
} from '@/lib/konta/trial-features';

export async function leadResearchTrialLockResponse(supabase: SupabaseClient): Promise<NextResponse | null> {
  const organizationId = await readActiveOrganizationCookie();
  if (!organizationId) return null;
  const product = await readMailkOrganizationState(supabase, organizationId);
  if (product.kind !== 'ok' || !isLeadResearchLockedByState(product.state)) return null;
  return NextResponse.json(
    { error: LEAD_RESEARCH_TRIAL_LOCK_MESSAGE.it, code: TRIAL_FEATURE_LOCKED_CODE },
    { status: 403 }
  );
}
