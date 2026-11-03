/**
 * MAIL-K — Sessione KONTA e spazio di lavoro lato server.
 *
 * Imita K-CRM (src/adapters/auth/supabase-server.ts): la presenza di un cookie non
 * equivale a sessione valida; l'identità arriva solo da supabase.auth.getUser().
 * Lo spazio di lavoro è l'organizzazione KONTA scelta dall'utente (cookie MAILK_ORG_COOKIE),
 * riverificata a ogni richiesta sulla membership attiva in crm_memberships (sotto RLS).
 * Nessuna scrittura su crm_* o pro_*.
 *
 * Account KONTA unico (CONTRATTO_ACCOUNT_UNICO.md §4): oltre al ruolo, le scritture richiedono uno
 * stato `mailk` operativo dell'organizzazione (`active`, `trial_active`, `cancel_scheduled`), letto da
 * `konta_my_entitlements()`. Altri stati → sola consultazione; `revoked` → accesso negato.
 * Finché la funzione non esiste sul progetto resta valido il solo controllo di ruolo (comportamento precedente).
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { MAILK_ORG_COOKIE, canManageSenderSettings, canWriteMail, isUuid, type KontaRole } from '@/lib/konta/workspace';
import { isKontaStateOperational, type KontaAccessState } from '@/lib/konta/entitlements';
import { readMailkOrganizationState } from '@/lib/konta/entitlements-server';

export interface KontaUser {
  id: string;
  email: string;
}

export interface KontaMembership {
  organization_id: string;
  role: KontaRole;
  name: string;
}

export interface TenantContext {
  user: KontaUser;
  organizationId: string;
  organizationName: string;
  role: KontaRole;
  canWrite: boolean;
  canManageSettings: boolean;
  /**
   * Stato `mailk` dell'organizzazione da `konta_my_entitlements()`; `null` se la funzione non è
   * disponibile sul progetto (vale il solo controllo di ruolo) o se la risposta non è valida.
   */
  mailkState: KontaAccessState | null;
  /** Perché le scritture sono bloccate oltre al ruolo: `product` = stato mailk non operativo o non verificabile. */
  writeBlockedBy: 'role' | 'product' | null;
  /** Client legato ai cookie dell'utente: ogni query passa dalla RLS. */
  supabase: SupabaseClient;
}

export type TenantErrorCode =
  | 'SESSION_REQUIRED'
  | 'ORGANIZATION_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'PRODUCT_READ_ONLY'
  | 'PRODUCT_REVOKED';

export class TenantError extends Error {
  constructor(
    public readonly code: TenantErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'TenantError';
  }
}

export async function getVerifiedUser(
  supabase: SupabaseClient
): Promise<KontaUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id || !data.user.email) return null;
  return { id: data.user.id, email: data.user.email.trim().toLowerCase() };
}

/** Membership attive dell'utente (lettura sotto RLS di crm_memberships + crm_organizations). */
export async function listActiveMemberships(
  supabase: SupabaseClient,
  userId: string
): Promise<KontaMembership[]> {
  const { data, error } = await supabase
    .from('crm_memberships')
    .select('organization_id, role, crm_organizations(name)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Lettura membership KONTA fallita: ${error.message}`);

  return (data || []).map((row) => {
    const rel = (row as { crm_organizations?: { name?: string } | { name?: string }[] | null }).crm_organizations;
    const org = Array.isArray(rel) ? rel[0] : rel;
    return {
      organization_id: String((row as { organization_id: string }).organization_id),
      role: String((row as { role: string }).role) as KontaRole,
      name: org?.name || 'Organizzazione',
    };
  });
}

export async function readActiveOrganizationCookie(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(MAILK_ORG_COOKIE)?.value;
  return isUuid(value) ? value : null;
}

/**
 * Risolve utente e organizzazione attiva. Lancia TenantError se manca la sessione,
 * se nessuna organizzazione è selezionata o se la membership non è più attiva.
 */
export async function requireTenant(): Promise<TenantContext> {
  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) {
    throw new TenantError('SESSION_REQUIRED', 'Accesso richiesto.', 401);
  }

  const organizationId = await readActiveOrganizationCookie();
  if (!organizationId) {
    throw new TenantError('ORGANIZATION_REQUIRED', 'Scegli un’organizzazione per continuare.', 409);
  }

  const [memberships, product] = await Promise.all([
    listActiveMemberships(supabase, user.id),
    readMailkOrganizationState(supabase, organizationId),
  ]);
  const membership = memberships.find((m) => m.organization_id === organizationId);
  if (!membership) {
    throw new TenantError('ORGANIZATION_REQUIRED', 'Non sei più membro di questa organizzazione.', 409);
  }

  const mailkState = product.kind === 'ok' ? product.state : null;
  if (mailkState === 'revoked') {
    throw new TenantError('PRODUCT_REVOKED', 'L’accesso a Mail-K per questa organizzazione è stato revocato.', 403);
  }
  // `unavailable` = funzione assente sul progetto: resta il solo controllo di ruolo (comportamento precedente).
  const productWritable = product.kind === 'unavailable' || (mailkState !== null && isKontaStateOperational(mailkState));
  const roleWritable = canWriteMail(membership.role);

  return {
    user,
    organizationId,
    organizationName: membership.name,
    role: membership.role,
    canWrite: roleWritable && productWritable,
    canManageSettings: canManageSenderSettings(membership.role) && productWritable,
    mailkState,
    writeBlockedBy: !productWritable ? 'product' : !roleWritable ? 'role' : null,
    supabase,
  };
}

/** Versione che non lancia: utile nelle pagine server per mostrare stati vuoti. */
export async function getTenantOrNull(): Promise<TenantContext | null> {
  try {
    return await requireTenant();
  } catch (err) {
    if (err instanceof TenantError) return null;
    throw err;
  }
}

export function tenantErrorResponse(err: unknown): NextResponse {
  if (err instanceof TenantError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : 'Errore inatteso';
  return NextResponse.json({ error: message }, { status: 500 });
}

const PRODUCT_READ_ONLY_MESSAGE =
  'Mail-K non è attivo per questa organizzazione: sei in sola consultazione. I dati restano disponibili; per inviare o modificare serve un piano attivo.';

export function requireWrite(tenant: TenantContext): void {
  if (tenant.writeBlockedBy === 'product') {
    throw new TenantError('PRODUCT_READ_ONLY', PRODUCT_READ_ONLY_MESSAGE, 403);
  }
  if (!tenant.canWrite) {
    throw new TenantError('PERMISSION_DENIED', 'Il tuo ruolo in questa organizzazione è di sola lettura.', 403);
  }
}

export function requireSettingsManager(tenant: TenantContext): void {
  if (tenant.writeBlockedBy === 'product') {
    throw new TenantError('PRODUCT_READ_ONLY', PRODUCT_READ_ONLY_MESSAGE, 403);
  }
  if (!tenant.canManageSettings) {
    throw new TenantError('PERMISSION_DENIED', 'Solo Titolare o Amministratore possono modificare le impostazioni mittente.', 403);
  }
}
