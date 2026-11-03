/**
 * MAIL-K — Variabili d'ambiente del progetto Supabase KONTA (condiviso con KONTA PRO e K-CRM).
 *
 * Nomi (stessa convenzione di K-CRM):
 *   NEXT_PUBLIC_SUPABASE_URL              URL del progetto (in locale: API dello stack Docker di K-CRM)
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  chiave pubblica (ripiego: NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *   SUPABASE_SECRET_KEY                   chiave segreta per i cron (ripiego: SUPABASE_SERVICE_ROLE_KEY)
 */

export interface KontaPublicEnv {
  url: string;
  publishableKey: string;
}

export function readKontaPublicEnv(env: NodeJS.ProcessEnv = process.env): KontaPublicEnv | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function getKontaPublicEnv(env: NodeJS.ProcessEnv = process.env): KontaPublicEnv {
  const values = readKontaPublicEnv(env);
  if (!values) {
    throw new Error('Supabase KONTA non configurato: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY richiesti.');
  }
  return values;
}

export function getKontaSecretKey(env: NodeJS.ProcessEnv = process.env): string {
  const key = (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (!key) {
    throw new Error('SUPABASE_SECRET_KEY assente: le operazioni server (cron, credenziali cifrate) non sono disponibili.');
  }
  return key;
}

/** Modulo Lead Research (Tavily/OpenAI): fuori dalla tappa M1, attivo solo se LEAD_RESEARCH_ENABLED=true. */
export function isLeadResearchEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.LEAD_RESEARCH_ENABLED?.trim().toLowerCase() === 'true';
}
