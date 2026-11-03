import { DateTime } from 'luxon';
import type { SupabaseClient } from '@supabase/supabase-js';
import { computeNextSendTime } from '@/lib/scheduling/next-send-time';
import { hasReachedDailyLimit } from '@/lib/scheduling/daily-limit';
import { dispatchNextEmailForCampaign } from '@/lib/email/dispatcher';
import { dispatchNextEmailForNewsletter } from '@/lib/email/newsletter-dispatcher';
import type { Campaign, Newsletter } from '@/types/database';

/**
 * Lavoro di invio di UNA organizzazione: usato dal cron (/api/cron/send)
 * e dal tasto "Invia/Ricevi" (/api/mail/send-receive).
 * Regole identiche in entrambi i casi: finestra oraria, giorni feriali,
 * limite giornaliero e intervallo tra un invio e l'altro.
 */

export type WorkUnit =
  | { kind: 'newsletter'; organization_id: string; due_at: string; newsletter: Newsletter }
  | { kind: 'campaign'; organization_id: string; due_at: string; campaign: Campaign };

export async function processCampaign(supabase: SupabaseClient, campaign: Campaign) {
  const currentSlot = computeNextSendTime(DateTime.now(), {
    timezone: campaign.timezone,
    send_window_start: campaign.send_window_start,
    send_window_end: campaign.send_window_end,
  });
  const nowLuxon = DateTime.now().setZone(campaign.timezone);

  if (currentSlot.diff(nowLuxon, 'minutes').minutes > 1) {
    const postponedUtc = currentSlot.toUTC().toISO();
    await supabase.from('mail_campaigns').update({ next_send_at: postponedUtc }).eq('id', campaign.id);
    return { status: 'postponed', reason: 'Outside sending window or weekday', next_send_at: postponedUtc };
  }

  const limitReached = await hasReachedDailyLimit(supabase, campaign.id, campaign.daily_limit, campaign.timezone);
  if (limitReached) {
    const tomorrow = nowLuxon.plus({ days: 1 }).startOf('day');
    const nextSlot = computeNextSendTime(tomorrow, {
      timezone: campaign.timezone,
      send_window_start: campaign.send_window_start,
      send_window_end: campaign.send_window_end,
    });
    const postponedUtc = nextSlot.toUTC().toISO();
    await supabase.from('mail_campaigns').update({ next_send_at: postponedUtc }).eq('id', campaign.id);
    return { status: 'daily_limit_reached', limit: campaign.daily_limit, next_send_at: postponedUtc };
  }

  return dispatchNextEmailForCampaign(supabase, campaign);
}

export async function runUnit(supabase: SupabaseClient, unit: WorkUnit): Promise<Record<string, unknown>> {
  return unit.kind === 'newsletter'
    ? { type: 'newsletter', newsletter_id: unit.newsletter.id, ...(await dispatchNextEmailForNewsletter(supabase, unit.newsletter)) }
    : { type: 'campaign', campaign_id: unit.campaign.id, ...(await processCampaign(supabase, unit.campaign)) };
}

/** Registra un'esecuzione con lavoro in mail_cron_runs (senza dati del destinatario). */
export async function logRun(
  supabase: SupabaseClient,
  unit: WorkUnit,
  outcome: Record<string, unknown>,
  startedAt: string,
  jobKind: 'send' | 'bounce_sync' = 'send'
) {
  const { lead, subscriber, ...safeOutcome } = outcome as Record<string, unknown> & { lead?: unknown; subscriber?: unknown };
  void lead;
  void subscriber;
  await supabase.from('mail_cron_runs').insert({
    organization_id: unit.organization_id,
    job_kind: jobKind,
    entity_type: unit.kind,
    entity_id: unit.kind === 'newsletter' ? unit.newsletter.id : unit.campaign.id,
    outcome: String(outcome.status || 'unknown'),
    details: safeOutcome,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  });
}

/**
 * Prossima unità di lavoro dovuta per un'organizzazione (newsletter prima della campagna),
 * oppure null con la prossima scadenza nota.
 */
export async function findDueUnitForOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ unit: WorkUnit | null; nextDueAt: string | null }> {
  const nowIso = DateTime.utc().toISO()!;

  const { data: nl } = await supabase
    .from('mail_newsletters')
    .select('*')
    .eq('organization_id', organizationId)
    .or(`and(status.eq.scheduled,scheduled_at.lte.${nowIso}),and(status.eq.sending,next_send_at.lte.${nowIso})`)
    .order('next_send_at', { ascending: true, nullsFirst: true })
    .limit(1);
  if (nl && nl.length > 0) {
    const newsletter = nl[0] as Newsletter;
    return {
      unit: { kind: 'newsletter', organization_id: organizationId, due_at: newsletter.next_send_at || nowIso, newsletter },
      nextDueAt: null,
    };
  }

  const { data: camps } = await supabase
    .from('mail_campaigns')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .lte('next_send_at', nowIso)
    .order('next_send_at', { ascending: true })
    .limit(1);
  if (camps && camps.length > 0) {
    const campaign = camps[0] as Campaign;
    return {
      unit: { kind: 'campaign', organization_id: organizationId, due_at: campaign.next_send_at || nowIso, campaign },
      nextDueAt: null,
    };
  }

  // Niente di dovuto: prossima scadenza tra campagne attive e newsletter in corso/pianificate.
  const [{ data: nextCamp }, { data: nextNl }] = await Promise.all([
    supabase
      .from('mail_campaigns')
      .select('next_send_at')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .not('next_send_at', 'is', null)
      .order('next_send_at', { ascending: true })
      .limit(1),
    supabase
      .from('mail_newsletters')
      .select('next_send_at')
      .eq('organization_id', organizationId)
      .in('status', ['scheduled', 'sending'])
      .not('next_send_at', 'is', null)
      .order('next_send_at', { ascending: true })
      .limit(1),
  ]);
  const candidates = [nextCamp?.[0]?.next_send_at, nextNl?.[0]?.next_send_at].filter(Boolean) as string[];
  candidates.sort();
  return { unit: null, nextDueAt: candidates[0] ?? null };
}
