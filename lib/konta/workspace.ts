/**
 * MAIL-K — Spazio di lavoro (organizzazione KONTA attiva): costanti condivise client/server.
 *
 * Il server legge l'organizzazione attiva dal cookie httpOnly MAILK_ORG_COOKIE,
 * scritto da POST /api/workspace dopo aver verificato la membership.
 * Il browser conserva la stessa scelta in localStorage (come K-CRM) per il
 * caricamento delle immagini e per ripristinare la selezione tra sessioni.
 */

export const MAILK_ORG_COOKIE = 'mailk_org';
export const ACTIVE_ORGANIZATION_STORAGE_KEY = 'konta_mailk_active_org_id';

/** Ruoli KONTA che possono scrivere campagne, destinatari, newsletter e template. */
export const MAILK_WRITE_ROLES = ['O', 'A', 'M', 'S', 'K'] as const;
/** Ruoli KONTA che possono gestire le impostazioni mittente (credenziali SMTP/IMAP). */
export const MAILK_SETTINGS_ROLES = ['O', 'A'] as const;

export type KontaRole = 'O' | 'A' | 'M' | 'S' | 'K' | 'R';

export const KONTA_ROLE_LABELS: Record<KontaRole, string> = {
  O: 'Titolare',
  A: 'Amministratore',
  M: 'Manager',
  S: 'Commerciale',
  K: 'Collaboratore',
  R: 'Lettura',
};

export function canWriteMail(role: string | null | undefined): boolean {
  return !!role && (MAILK_WRITE_ROLES as readonly string[]).includes(role);
}

export function canManageSenderSettings(role: string | null | undefined): boolean {
  return !!role && (MAILK_SETTINGS_ROLES as readonly string[]).includes(role);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function readStoredOrganizationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
    return isUuid(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredOrganizationId(organizationId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (organizationId) window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId);
    else window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
  } catch {
    // storage non disponibile: la scelta vive comunque nel cookie
  }
}
