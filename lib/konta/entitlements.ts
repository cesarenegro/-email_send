/**
 * MAIL-K — Abilitazioni dell'account KONTA unico (risposta di `konta_my_entitlements()`).
 * Copia allineata a K-CRM `src/domain/auth/konta-entitlements.ts`: stesso contenuto in tutte le app.
 *
 * CONTRATTO_ACCOUNT_UNICO.md §3 (forma della risposta) e §4 (instradamento dopo il login).
 * La funzione SQL vive nella repo KONTA PRO; qui solo tipi, ordine degli stati e regole di
 * instradamento, uguali in tutte le app. Nessun dato finto: senza risposta non si deduce nulla.
 */
export type KontaProductKey = 'light' | 'pro' | 'kcrm' | 'mailk';

/** Provider OAuth del modale unico (CONTRATTO §5); LinkedIn usa il provider OIDC di Supabase. */
export type KontaOAuthProvider = 'google' | 'facebook' | 'linkedin_oidc';
export const KONTA_OAUTH_PROVIDERS: readonly { id: KontaOAuthProvider; label: string }[] = [
  { id: 'google', label: 'Continua con Google' },
  { id: 'facebook', label: 'Continua con Facebook' },
  { id: 'linkedin_oidc', label: 'Continua con LinkedIn' },
];

export type KontaAccessState =
  | 'non_activated'
  | 'trial_active'
  | 'active'
  | 'cancel_scheduled'
  | 'past_due'
  | 'expired'
  | 'suspended'
  | 'revoked'
  | 'security_hold';

export interface KontaProOrganizationEntitlement {
  organization_id: string;
  name: string;
  role: string;
  state: KontaAccessState;
  plan: string | null;
  trial_expires_at: string | null;
  subscription_status: string | null;
  subscription_plan_id: string | null;
  billing_cycle: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface KontaCrmOrganizationEntitlement {
  organization_id: string;
  name: string;
  role: string;
  state: KontaAccessState;
  valid_until: string | null;
  source: string | null;
  pro_organization_id?: string | null;
}

export interface KontaProductEntitlement<TOrg = KontaCrmOrganizationEntitlement> {
  state: KontaAccessState;
  organizations: TOrg[];
}

export interface KontaEntitlements {
  user_id: string;
  email: string | null;
  evaluated_at: string;
  products: {
    light: KontaProductEntitlement<never>;
    pro: KontaProductEntitlement<KontaProOrganizationEntitlement>;
    kcrm: KontaProductEntitlement<KontaCrmOrganizationEntitlement>;
    mailk: KontaProductEntitlement<KontaCrmOrganizationEntitlement>;
  };
}

/** Stesso ordine di `konta_state_rank` in SQL: più basso = più favorevole. */
export const KONTA_STATE_RANK: Record<KontaAccessState, number> = {
  active: 1,
  trial_active: 2,
  cancel_scheduled: 3,
  past_due: 4,
  non_activated: 5,
  expired: 6,
  suspended: 7,
  security_hold: 8,
  revoked: 9,
};

const KNOWN_STATES = new Set<string>(Object.keys(KONTA_STATE_RANK));
const PRODUCT_KEYS: readonly KontaProductKey[] = ['light', 'pro', 'kcrm', 'mailk'];

export function isKontaAccessState(value: unknown): value is KontaAccessState {
  return typeof value === 'string' && KNOWN_STATES.has(value);
}

/** Stati in cui si entra nell'app e si può scrivere. */
export function isKontaStateOperational(state: KontaAccessState | string): boolean {
  return state === 'active' || state === 'trial_active' || state === 'cancel_scheduled';
}

/** Stati in cui si entra in sola consultazione (dati conservati, scritture bloccate). */
export function isKontaStateReadOnly(state: KontaAccessState | string): boolean {
  return state === 'past_due' || state === 'expired' || state === 'suspended' || state === 'non_activated' || state === 'security_hold';
}

/**
 * Valida la risposta della RPC senza fidarsi della forma: ritorna `null` se non è quella attesa,
 * così il chiamante non deduce abilitazioni da un payload incompleto.
 */
export function parseKontaEntitlements(raw: unknown): KontaEntitlements | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.user_id !== 'string') return null;
  const products = r.products as Record<string, unknown> | undefined;
  if (!products || typeof products !== 'object') return null;
  for (const key of PRODUCT_KEYS) {
    const p = products[key] as Record<string, unknown> | undefined;
    if (!p || !isKontaAccessState(p.state) || !Array.isArray(p.organizations)) return null;
  }
  return raw as KontaEntitlements;
}

export type KontaRouteDecision =
  | { kind: 'enter' }
  | { kind: 'enter_read_only'; state: KontaAccessState }
  | { kind: 'onboarding' }
  | { kind: 'denied'; state: KontaAccessState };

/**
 * Decisione di instradamento per K-CRM e Mail-K (CONTRATTO §4). `revoked` nega; nessuna
 * organizzazione → onboarding; stato operativo → entra; altrimenti sola consultazione.
 */
export function decideCrmRoute(product: KontaProductEntitlement<KontaCrmOrganizationEntitlement>): KontaRouteDecision {
  if (product.organizations.length === 0) return { kind: 'onboarding' };
  if (product.state === 'revoked') return { kind: 'denied', state: product.state };
  if (isKontaStateOperational(product.state)) return { kind: 'enter' };
  return { kind: 'enter_read_only', state: product.state };
}

/** Giorni interi mancanti a `iso` (negativi se passata); `null` senza data. */
export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now.getTime()) / 86_400_000);
}

export interface KontaAppLink {
  key: KontaProductKey;
  name: string;
  url: string;
  state: KontaAccessState;
  /** `open` entra; `activate` porta al piano/onboarding; `current` è l'app in uso. */
  action: 'open' | 'activate' | 'current';
  detail: string;
}

export const KONTA_APP_URLS: Record<KontaProductKey, string> = {
  light: 'https://kontalight.arkai.dev',
  pro: 'https://kontapro.arkai.dev',
  kcrm: 'https://kcrm.arkai.dev',
  mailk: 'https://mailk.arkai.dev',
};

export const KONTA_APP_NAMES: Record<KontaProductKey, string> = {
  light: 'KONTA Light',
  pro: 'KONTA PRO',
  kcrm: 'K-CRM',
  mailk: 'Mail-K',
};

const STATE_LABELS: Record<KontaAccessState, string> = {
  active: 'Attivo',
  trial_active: 'Prova attiva',
  cancel_scheduled: 'Attivo, disdetta programmata',
  past_due: 'Pagamento in ritardo',
  non_activated: 'Non attivato',
  expired: 'Scaduto',
  suspended: 'Sospeso',
  security_hold: 'Blocco di sicurezza',
  revoked: 'Accesso revocato',
};

export function kontaStateLabel(state: KontaAccessState | string): string {
  return isKontaAccessState(state) ? STATE_LABELS[state] : 'Stato sconosciuto';
}

/**
 * Voci del menu "App KONTA" (CONTRATTO §4): una per prodotto, con stato e azione.
 * `current` è la chiave dell'app in cui il menu viene mostrato.
 */
export function buildKontaAppLinks(
  entitlements: KontaEntitlements,
  current: KontaProductKey,
  now: Date = new Date()
): KontaAppLink[] {
  return PRODUCT_KEYS.map((key) => {
    const product = entitlements.products[key] as KontaProductEntitlement<KontaCrmOrganizationEntitlement | KontaProOrganizationEntitlement>;
    const state = product.state;
    const best = product.organizations[0] as (KontaCrmOrganizationEntitlement & KontaProOrganizationEntitlement) | undefined;
    let detail: string;
    if (key === 'light') detail = 'Documenti di cortesia · gratuito';
    else if (product.organizations.length === 0) detail = 'Nessuna azienda: inizia da qui';
    else {
      const until = key === 'pro' ? best?.trial_expires_at ?? best?.current_period_end : best?.valid_until;
      const days = daysUntil(until ?? null, now);
      const when = days === null ? '' : days >= 0 ? ` · ${days} giorni rimasti` : '';
      detail = `${kontaStateLabel(state)}${when}${best?.name ? ` · ${best.name}` : ''}`;
    }
    const action: KontaAppLink['action'] =
      key === current ? 'current' : key === 'light' || isKontaStateOperational(state) ? 'open' : 'activate';
    return { key, name: KONTA_APP_NAMES[key], url: KONTA_APP_URLS[key], state, action, detail };
  });
}
