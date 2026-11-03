/**
 * MAIL-K — Percorsi stabili dei flussi Supabase Auth condivisi con l'ecosistema KONTA.
 *
 * Stesse convenzioni di K-CRM (src/domain/auth/auth-paths.ts), concordate il 2026-11-03:
 * un account registrato da una qualunque app vale per tutte (stesso progetto Supabase).
 *
 * - `/login`            accesso, registrazione e "password dimenticata" (stessa pagina).
 * - `/auth/callback`    route server che scambia `code` (PKCE) o `token_hash` con una sessione
 *                       e reindirizza a `next` (solo percorsi relativi).
 * - `/login/reset`      atterraggio del link di recupero: l'utente imposta la nuova password.
 * - `/account/password` cambio password con verifica della password attuale.
 * - `/workspace`        scelta dell'organizzazione; se l'utente non ne ha, rimanda a K-CRM.
 *
 * Redirect URL da avere in Supabase Auth: `https://mailk.arkai.dev/**` (runbook K-CRM §8).
 */

export const LOGIN_PATH = '/login';
export const AUTH_CALLBACK_PATH = '/auth/callback';
export const PASSWORD_RESET_PATH = '/login/reset';
export const ACCOUNT_PASSWORD_PATH = '/account/password';
export const WORKSPACE_PATH = '/workspace';

/** Dove un nuovo utente senza azienda crea la propria organizzazione (K-CRM). */
export const KCRM_ONBOARDING_URL =
  (process.env.NEXT_PUBLIC_KCRM_URL?.replace(/\/+$/, '') || 'https://kcrm.arkai.dev') + '/onboarding';

/** Parametri di query che `/login` legge dopo un reindirizzo della callback. */
export const AUTH_ERROR_QUERY_PARAM = 'auth_error';
export const AUTH_NOTICE_QUERY_PARAM = 'auth_notice';

/** `access_revoked`: accesso a Mail-K revocato (abilitazione `mailk` = `revoked`, CONTRATTO §4). */
export type AuthCallbackErrorCode = 'link_invalid' | 'link_expired' | 'exchange_failed' | 'auth_unavailable' | 'access_revoked';
export type AuthNoticeCode = 'email_confirmed' | 'password_updated';

/**
 * Accetta solo percorsi relativi interni (`/qualcosa`), mai URL assoluti,
 * `//host`, schemi o caratteri di controllo: evita open redirect dalla callback.
 */
export function safeNextPath(input: string | null | undefined, fallback: string = WORKSPACE_PATH): string {
  if (typeof input !== 'string') return fallback;
  const candidate = input.trim();
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  if (/^\/[^/?#]*:/.test(candidate)) return fallback; // es. "/javascript:..."
  return candidate;
}

/** URL assoluto di callback per `emailRedirectTo` / `redirectTo` (origin = window.location.origin). */
export function buildAuthCallbackUrl(origin: string, next: string): string {
  const base = origin.replace(/\/+$/, '');
  return `${base}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(safeNextPath(next))}`;
}

export function isAuthCallbackErrorCode(value: string | null | undefined): value is AuthCallbackErrorCode {
  return (
    value === 'link_invalid' ||
    value === 'link_expired' ||
    value === 'exchange_failed' ||
    value === 'auth_unavailable' ||
    value === 'access_revoked'
  );
}

export function isAuthNoticeCode(value: string | null | undefined): value is AuthNoticeCode {
  return value === 'email_confirmed' || value === 'password_updated';
}

export const AUTH_CALLBACK_ERROR_MESSAGES: Record<'it' | 'en', Record<AuthCallbackErrorCode, string>> = {
  it: {
    link_invalid: 'Il link non è valido o è già stato usato. Richiedine uno nuovo.',
    link_expired: 'Il link è scaduto. Richiedi un nuovo link di conferma o di recupero password.',
    exchange_failed:
      'Non è stato possibile attivare la sessione da questo link. Aprilo nello stesso browser da cui hai fatto la richiesta, oppure richiedine uno nuovo.',
    auth_unavailable: 'Autenticazione non configurata.',
    access_revoked: 'L’accesso a Mail-K per il tuo account è stato revocato. Per informazioni rivolgiti al titolare dell’azienda.',
  },
  en: {
    link_invalid: 'This link is invalid or was already used. Request a new one.',
    link_expired: 'This link has expired. Request a new confirmation or password-recovery link.',
    exchange_failed:
      'The session could not be started from this link. Open it in the same browser you used for the request, or request a new one.',
    auth_unavailable: 'Authentication is not configured.',
    access_revoked: 'Your access to Mail-K has been revoked. Contact the owner of your company for details.',
  },
};

export const AUTH_NOTICE_MESSAGES: Record<'it' | 'en', Record<AuthNoticeCode, string>> = {
  it: {
    email_confirmed: 'Indirizzo email confermato. Accedi con la password scelta in fase di registrazione.',
    password_updated: 'Password aggiornata. Accedi con la nuova password.',
  },
  en: {
    email_confirmed: 'Email address confirmed. Sign in with the password you chose at sign-up.',
    password_updated: 'Password updated. Sign in with your new password.',
  },
};

/** Regola minima lato client (Supabase applica la propria policy lato server). */
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordErrors {
  password?: string;
  confirmation?: string;
}

export function validateNewPassword(password: string, confirmation: string, locale: 'it' | 'en' = 'it'): PasswordErrors {
  const errors: PasswordErrors = {};
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password =
      locale === 'en'
        ? `The password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
        : `La password deve contenere almeno ${PASSWORD_MIN_LENGTH} caratteri.`;
  }
  if (confirmation !== password) {
    errors.confirmation = locale === 'en' ? 'The two passwords do not match.' : 'Le due password non coincidono.';
  }
  return errors;
}

/** Classifica l'errore restituito da Supabase nel reindirizzo o nello scambio del token. */
export function classifyAuthProviderError(message: string | undefined, providerCode: string | null): AuthCallbackErrorCode {
  const text = `${providerCode ?? ''} ${message ?? ''}`.toLowerCase();
  if (text.includes('expired')) return 'link_expired';
  if (text.includes('invalid') || text.includes('not found') || text.includes('already')) return 'link_invalid';
  return 'exchange_failed';
}
