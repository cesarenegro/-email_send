import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';
import { dispatchNextEmailForCampaign } from '@/lib/email/dispatcher';
import type { Campaign } from '@/types/database';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // 1. Verify KONTA session, organization and write role
    const tenant = await requireTenant();
    requireWrite(tenant);
    const supabase = tenant.supabase;

    // 2. Fetch campaign inside the tenant (RLS + explicit organization filter)
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

    // 3. Validations before sending
    if (!campaign.name?.trim()) {
      return NextResponse.json({ error: 'Il nome della campagna è obbligatorio' }, { status: 400 });
    }

    if (!campaign.subject_template?.trim()) {
      return NextResponse.json({ error: "L'oggetto dell'email non può essere vuoto" }, { status: 400 });
    }

    if (!campaign.html_template?.trim()) {
      return NextResponse.json({ error: "Il corpo HTML dell'email non può essere vuoto" }, { status: 400 });
    }

    // 4. Check available leads
    const { count: leadCount } = await supabase
      .from('mail_campaign_leads')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('organization_id', tenant.organizationId)
      .in('status', ['pending', 'retry']);

    if (!leadCount || leadCount === 0) {
      return NextResponse.json(
        { error: 'Nessun contatto valido in attesa in questa campagna. Importa contatti prima di inviare.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // 5. Ensure status is active
    if (campaign.status !== 'active') {
      await adminSupabase
        .from('mail_campaigns')
        .update({ status: 'active' })
        .eq('id', id)
        .eq('organization_id', tenant.organizationId);
      campaign.status = 'active';
    }

    // 6. Dispatch next email immediately
    try {
      const result = await dispatchNextEmailForCampaign(adminSupabase, campaign);

      if (result.status === 'sent') {
        const minutesInterval = Math.round((campaign.send_interval_seconds || 240) / 60 * 10) / 10;
        return NextResponse.json({
          success: true,
          status: 'sent',
          lead: result.lead,
          next_send_at: result.next_send_at,
          message: `Email inviata con successo a ${result.lead?.email}! Prossimo invio programmato tra ${minutesInterval} minuti.`,
        });
      }

      if (result.status === 'error_configuration') {
        return NextResponse.json({
          success: false,
          status: 'error_configuration',
          error: result.error || result.message,
          message: result.message || 'Configurazione SMTP non valida',
        }, { status: 400 });
      }

      if (result.status === 'error_transient') {
        return NextResponse.json({
          success: false,
          status: 'error_transient',
          error: result.error || result.message,
          message: result.message || 'Errore transitorio durante l\'invio.',
        }, { status: 500 });
      }

      if (result.status === 'error_handled') {
        return NextResponse.json({
          success: false,
          status: 'error_handled',
          lead: result.lead,
          error: result.error,
          message: `Tentativo fallito per ${result.lead?.email}: ${result.error}`,
        });
      }

      return NextResponse.json({
        success: true,
        status: result.status,
        message: result.message || 'Elaborazione completata.',
        next_send_at: result.next_send_at,
      });
    } catch (err) {
      console.error('Send-now error:', err);
      const message = err instanceof Error ? err.message : '';
      return NextResponse.json({ error: message || 'Errore durante l\'invio immediato' }, { status: 500 });
    }
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
