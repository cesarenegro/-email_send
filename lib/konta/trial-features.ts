/**
 * MAIL-K — Funzioni escluse dalla prova gratuita (decisione del proprietario, 2026-11-04).
 *
 * Ogni nuova azienda ha 14 giorni di prova Mail-K (`crm_product_access`, `product_key = 'mailk'`,
 * `access_state = 'trial_active'`). Durante la prova la ricerca di nuovi lead (Lead Research) non è
 * disponibile. Modulo senza dipendenze: usabile sia dal server sia dal browser.
 */

export const TRIAL_FEATURE_LOCKED_CODE = 'TRIAL_FEATURE_LOCKED';

export const LEAD_RESEARCH_TRIAL_LOCK_MESSAGE: Record<'it' | 'en', string> = {
  it: 'La ricerca di nuovi lead non è inclusa nella prova gratuita: disponibile con un piano attivo.',
  en: 'Searching for new leads is not included in the free trial: available with an active plan.',
};

/** `true` quando lo stato `mailk` dell'organizzazione attiva esclude la ricerca di nuovi lead. */
export function isLeadResearchLockedByState(state: string | null | undefined): boolean {
  return state === 'trial_active';
}
