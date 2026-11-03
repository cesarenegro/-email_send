import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { createAdminClient } from '@/lib/supabase/admin';
import { runUnit, logRun, type WorkUnit } from '@/lib/email/org-runner';
import type { Campaign, Newsletter } from '@/types/database';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron di invio multi-tenant (Vercel: ogni minuto, Bearer CRON_SECRET).
 *
 * Scelta documentata: UNA email per organizzazione per esecuzione.
 * Ogni esecuzione raccoglie il lavoro dovuto (newsletter prima, poi campagne), lo
 * raggruppa per organization_id e serve al massimo MAX_ORGS_PER_RUN organizzazioni
 * in ordine di scadenza, una email ciascuna, entro un budget di tempo. Così il ritmo
 * per organizzazione resta quello di oggi (al più una email al minuto) e nessun tenant
 * può monopolizzare il minuto di cron. Le esecuzioni che producono lavoro sono
 * registrate in mail_cron_runs.
 */
const MAX_ORGS_PER_RUN = 10;
const TIME_BUDGET_MS = 45_000;

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization')?.trim();
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Supabase admin client error: ' + message }, { status: 500 });
  }

  const startedAt = Date.now();
  const nowIso = DateTime.utc().toISO()!;

  const [{ data: dueNewsletters, error: nlError }, { data: dueCampaigns, error: cError }] = await Promise.all([
    supabase
      .from('mail_newsletters')
      .select('*')
      .or(`and(status.eq.scheduled,scheduled_at.lte.${nowIso}),and(status.eq.sending,next_send_at.lte.${nowIso})`)
      .order('next_send_at', { ascending: true, nullsFirst: true })
      .limit(200),
    supabase
      .from('mail_campaigns')
      .select('*')
      .eq('status', 'active')
      .lte('next_send_at', nowIso)
      .order('next_send_at', { ascending: true })
      .limit(200),
  ]);

  if (nlError) console.warn('[cron/send] lettura newsletter dovute:', nlError.message);
  if (cError) {
    console.error('[cron/send] lettura campagne dovute:', cError.message);
    return NextResponse.json({ error: cError.message }, { status: 500 });
  }

  // Una unità di lavoro per organizzazione: newsletter dovuta ha precedenza sulla campagna.
  const perOrg = new Map<string, WorkUnit>();
  for (const nl of (dueNewsletters || []) as Newsletter[]) {
    if (!perOrg.has(nl.organization_id)) {
      perOrg.set(nl.organization_id, {
        kind: 'newsletter',
        organization_id: nl.organization_id,
        due_at: nl.next_send_at || nl.scheduled_at || nowIso,
        newsletter: nl,
      });
    }
  }
  for (const c of (dueCampaigns || []) as Campaign[]) {
    if (!perOrg.has(c.organization_id)) {
      perOrg.set(c.organization_id, {
        kind: 'campaign',
        organization_id: c.organization_id,
        due_at: c.next_send_at || nowIso,
        campaign: c,
      });
    }
  }

  if (perOrg.size === 0) {
    return NextResponse.json({ status: 'idle', message: 'No work currently due', organizations: 0 });
  }

  const units = [...perOrg.values()].sort((a, b) => a.due_at.localeCompare(b.due_at)).slice(0, MAX_ORGS_PER_RUN);
  const results: Array<Record<string, unknown>> = [];

  for (const unit of units) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      results.push({ organization_id: unit.organization_id, status: 'skipped_time_budget' });
      continue;
    }
    const runStarted = new Date().toISOString();
    let outcome: Record<string, unknown>;
    try {
      outcome = await runUnit(supabase, unit);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron/send] org ${unit.organization_id}:`, message);
      outcome = { type: unit.kind, status: 'error', error: message };
    }

    await logRun(supabase, unit, outcome, runStarted);

    results.push({ organization_id: unit.organization_id, ...outcome });
  }

  return NextResponse.json({
    status: 'processed',
    organizations: units.length,
    pending_organizations: Math.max(0, perOrg.size - units.length),
    results,
  });
}

