/**
 * MAIL-K — Sessione KONTA e spazio di lavoro lato server.
 *
 * Imita K-CRM (src/adapters/auth/supabase-server.ts): la presenza di un cookie non
 * equivale a sessione valida; l'identità arriva solo da supabase.auth.getUser().
 * Lo spazio di lavoro è l'organizzazione KONTA scelta dall'utente (cookie MAILK_ORG_COOKIE),
 * riverificata a ogni richiesta sulla membership attiva in crm_memberships (sotto RLS).
 * Nessuna scrittura su crm_* o pro_*.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { MAILK_ORG_COOKIE, canManageSenderSettings, canWriteMail, isUuid, type KontaRole } from '@/lib/konta/workspace';

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
  /** Client legato ai cookie dell'utente: ogni query passa dalla RLS. */
  supabase: SupabaseClient;
}

export type TenantErrorCode = 'SESSION_REQUIRED' | 'ORGANIZATION_REQUIRED' | 'PERMISSION_DENIED';

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

  const memberships = await listActiveMemberships(supabase, user.id);
  const membership = memberships.find((m) => m.organization_id === organizationId);
  if (!membership) {
    throw new TenantError('ORGANIZATION_REQUIRED', 'Non sei più membro di questa organizzazione.', 409);
  }

  return {
    user,
    organizationId,
    organizationName: membership.name,
    role: membership.role,
    canWrite: canWriteMail(membership.role),
    canManageSettings: canManageSenderSettings(membership.role),
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

export function requireWrite(tenant: TenantContext): void {
  if (!tenant.canWrite) {
    throw new TenantError('PERMISSION_DENIED', 'Il tuo ruolo in questa organizzazione è di sola lettura.', 403);
  }
}

export function requireSettingsManager(tenant: TenantContext): void {
  if (!tenant.canManageSettings) {
    throw new TenantError('PERMISSION_DENIED', 'Solo Titolare o Amministratore possono modificare le impostazioni mittente.', 403);
  }
}
