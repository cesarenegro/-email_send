'use client';

/**
 * MAIL-K — Account KONTA unico lato browser (CONTRATTO_ACCOUNT_UNICO.md §3, §4, §5).
 *
 * - `fetchKontaEntitlements`: `supabase.rpc('konta_my_entitlements')` con la sessione dell'utente
 *   (nessuna chiave segreta). Senza risposta valida restituisce `null`: nessuna deduzione.
 * - `decideMailkRoute`: instradamento di Mail-K su `products.mailk` (stessa regola di K-CRM).
 * - `signInWithProvider`: Google, Facebook (scope `email`), LinkedIn OIDC con ritorno su `/auth/callback?next=…`.
 */

import { createClient } from '@/lib/supabase/client';
import { WORKSPACE_PATH, buildAuthCallbackUrl } from '@/lib/konta/auth-paths';
import {
  decideCrmRoute,
  parseKontaEntitlements,
  type KontaEntitlements,
  type KontaOAuthProvider,
  type KontaRouteDecision,
} from '@/lib/konta/entitlements';

export async function fetchKontaEntitlements(): Promise<KontaEntitlements | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('konta_my_entitlements');
    if (error) return null; // RPC non ancora applicata sul progetto o sessione assente
    return parseKontaEntitlements(data);
  } catch {
    return null;
  }
}

/** `null` quando le abilitazioni non sono disponibili: il chiamante mantiene il comportamento attuale. */
export function decideMailkRoute(entitlements: KontaEntitlements | null): KontaRouteDecision | null {
  if (!entitlements) return null;
  return decideCrmRoute(entitlements.products.mailk);
}

/** Avvia l'accesso OAuth; restituisce un messaggio d'errore o `null` (il browser viene reindirizzato). */
export async function signInWithProvider(provider: KontaOAuthProvider, next: string = WORKSPACE_PATH): Promise<string | null> {
  if (typeof window === 'undefined') return 'Accesso con provider disponibile solo nel browser.';
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildAuthCallbackUrl(window.location.origin, next),
        ...(provider === 'facebook' ? { scopes: 'email' } : {}),
      },
    });
    if (error) return 'Impossibile avviare l’accesso con questo provider. Riprova o usa l’email.';
    return null;
  } catch {
    return 'Impossibile avviare l’accesso con questo provider. Riprova o usa l’email.';
  }
}
