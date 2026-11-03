import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';
import { findDueUnitForOrganization, runUnit, logRun } from '@/lib/email/org-runner';
import { loadSenderSettings } from '@/lib/email/transporter';
import { syncBouncesFromImap } from '@/lib/email/imap-bounce-client';
import { checkRateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Tasto "Invia/Ricevi" dell'organizzazione attiva.
 * Invia: UNA email del lavoro dovuto (stesse regole del cron: finestra, limite giornaliero, intervallo).
 * Ricevi: legge i rimbalzi dalla casella IMAP dell'organizzazione, se configurata.
 * Funziona anche senza cron pianificato.
 */
export async function POST() {
  try {
    const tenant = await requireTenant();
    requireWrite(tenant);

    const rate = checkRateLimit(`send_receive_${tenant.organizationId}`, 6, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: `Attendi ${rate.retryAfterSeconds} secondi.` }, { status: 429 });
    }

    const admin = createAdminClient();

    // Invia
    let send: Record<string, unknown>;
    const { unit, nextDueAt } = await findDueUnitForOrganization(admin, tenant.organizationId);
    if (unit) {
      const startedAt = new Date().toISOString();
      try {
        const outcome = await runUnit(admin, unit);
        await logRun(admin, unit, outcome, startedAt);
        const { lead, subscriber, ...safe } = outcome as Record<string, unknown> & {
          lead?: { email?: string };
          subscriber?: { email?: string };
        };
        send = { ...safe, to: lead?.email || subscriber?.email || null };
      } catch (err) {
        send = { status: 'error', error: err instanceof Error ? err.message : String(err) };
      }
    } else {
      send = { status: 'idle', next_send_at: nextDueAt };
    }

    // Ricevi
    let receive: Record<string, unknown>;
    const settings = await loadSenderSettings(tenant.organizationId, admin);
    if (!settings?.imap_host) {
      receive = { status: 'not_configured' };
    } else {
      try {
        const result = await syncBouncesFromImap(admin, tenant.organizationId, { limitMessages: 100 });
        receive = {
          status: result.success ? 'ok' : 'error',
          bounces: result.bouncesDetected,
          updated: result.leadsUpdated,
          errors: result.errors.slice(0, 3),
        };
      } catch (err) {
        receive = { status: 'error', error: err instanceof Error ? err.message : String(err) };
      }
    }

    return NextResponse.json({ send, receive });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
