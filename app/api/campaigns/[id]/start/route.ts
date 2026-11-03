import { NextRequest, NextResponse } from 'next/server';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';
import { computeNextSendTime } from '@/lib/scheduling/next-send-time';
import { resolveOrganizationTransport, SmtpConfigurationError } from '@/lib/email/transporter';
import type { Campaign } from '@/types/database';
import { DateTime } from 'luxon';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tenant = await requireTenant();
    requireWrite(tenant);
    const supabase = tenant.supabase;

    const { data: campaignRow, error: campError } = await supabase
      .from('mail_campaigns')
      .select('*')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();

    if (campError || !campaignRow) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }
    const campaign = campaignRow as Campaign;

    // 1. Validations before starting
    if (!campaign.name?.trim()) {
      return NextResponse.json({ error: 'Il nome della campagna è obbligatorio' }, { status: 400 });
    }

    if (!campaign.subject_template?.trim()) {
      return NextResponse.json({ error: "L'oggetto dell'email non può essere vuoto" }, { status: 400 });
    }

    if (!campaign.html_template?.trim()) {
      return NextResponse.json({ error: "Il corpo HTML dell'email non può essere vuoto" }, { status: 400 });
    }

    // 2. Check if at least one pending or retry lead exists
    const { count: leadCount } = await supabase
      .from('mail_campaign_leads')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('organization_id', tenant.organizationId)
      .in('status', ['pending', 'retry']);

    if (!leadCount || leadCount === 0) {
      return NextResponse.json(
        { error: 'Nessun contatto valido in attesa di invio in questa campagna. Importa contatti prima di avviare.' },
        { status: 400 }
      );
    }

    // 3. Verify that a verified SMTP mailbox exists for the organization (same policy as the dispatcher)
    try {
      await resolveOrganizationTransport(tenant.organizationId);
    } catch (err) {
      const isConfigErr = err instanceof SmtpConfigurationError;
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        {
          error: isConfigErr
            ? `Impossibile avviare la campagna: ${message}`
            : `Errore verifica database configurazione SMTP: ${message}`,
        },
        { status: isConfigErr ? 400 : 500 }
      );
    }

    // 4. Compute first valid slot
    const baseTime = campaign.start_at
      ? DateTime.fromISO(campaign.start_at) > DateTime.now()
        ? campaign.start_at
        : DateTime.now()
      : DateTime.now();

    const nextSend = computeNextSendTime(baseTime, {
      timezone: campaign.timezone,
      send_window_start: campaign.send_window_start,
      send_window_end: campaign.send_window_end,
    });

    const { data: updated, error: updateError } = await supabase
      .from('mail_campaigns')
      .update({
        status: 'active',
        next_send_at: nextSend.toUTC().toISO(),
        daily_limit: campaign.daily_limit || 80,
      })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaign: updated,
      message: `Campagna avviata con successo! Prossimo invio programmato per ${nextSend.toFormat('dd/MM/yyyy HH:mm')} (${campaign.timezone})`,
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
