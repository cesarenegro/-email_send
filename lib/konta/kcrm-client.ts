/**
 * MAIL-K — Client server-side verso l'API di K-CRM (tappa M3).
 *
 * Mail-K e K-CRM usano lo stesso progetto Supabase KONTA: i cookie di sessione
 * `sb-*` dell'utente sono validi anche per K-CRM, che li verifica lato server
 * (verifyServerSession + membership). Mail-K inoltra SOLO quei cookie e SOLO
 * verso l'URL configurato in KCRM_API_URL (mai un URL fornito dal client).
 * La logica dei segmenti e dei consensi resta in K-CRM: nessuna duplicazione.
 */

import { cookies } from 'next/headers';

export class KcrmError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'KcrmError';
  }
}

export interface KcrmSegment {
  id: string;
  name: string;
  description?: string | null;
}

export interface KcrmSegmentEvaluation {
  segment: KcrmSegment;
  recipients: Array<{ person_id: string; display_name: string; email_normalized: string }>;
  suppressed_emails: string[];
  excluded_recipients: Array<{ person_id: string; display_name: string; email_normalized: string | null; exclusion_reason: string }>;
}

function baseUrl(): string {
  const raw = process.env.KCRM_API_URL?.trim();
  if (!raw) {
    throw new KcrmError('Collegamento a K-CRM non configurato (KCRM_API_URL).', 503, 'KCRM_NOT_CONFIGURED');
  }
  const url = new URL(raw);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new KcrmError('KCRM_API_URL deve usare https.', 503, 'KCRM_NOT_CONFIGURED');
  }
  return url.origin;
}

async function sessionCookieHeader(): Promise<string> {
  const store = await cookies();
  const parts = store
    .getAll()
    .filter((c) => c.name.startsWith('sb-'))
    .map((c) => `${c.name}=${c.value}`);
  if (parts.length === 0) {
    throw new KcrmError('Sessione KONTA assente.', 401, 'SESSION_REQUIRED');
  }
  return parts.join('; ');
}

async function kcrmFetch<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers: {
        Accept: 'application/json',
        Cookie: await sessionCookieHeader(),
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof KcrmError) throw err;
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new KcrmError(aborted ? 'K-CRM non ha risposto in tempo.' : 'K-CRM non raggiungibile.', 503, 'KCRM_UNAVAILABLE');
  } finally {
    clearTimeout(timer);
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const errObj = body && typeof body === 'object' && 'error' in body ? (body as { error?: { code?: string; message?: string } }).error : undefined;
    throw new KcrmError(errObj?.message || `K-CRM ha risposto ${res.status}.`, res.status, errObj?.code || 'KCRM_ERROR');
  }
  return body as T;
}

export async function listKcrmSegments(organizationId: string): Promise<KcrmSegment[]> {
  const body = await kcrmFetch<{ segments?: KcrmSegment[] }>(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/segments`,
    { method: 'GET' }
  );
  return (body.segments || []).map((s) => ({ id: s.id, name: s.name, description: s.description ?? null }));
}

export async function evaluateKcrmSegment(organizationId: string, segmentId: string): Promise<KcrmSegmentEvaluation> {
  return kcrmFetch<KcrmSegmentEvaluation>(`/api/v1/organizations/${encodeURIComponent(organizationId)}/segments`, {
    method: 'POST',
    body: { action: 'evaluate_segment', segment_id: segmentId },
  });
}
