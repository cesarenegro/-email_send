import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeNextSendTime } from '@/lib/scheduling/next-send-time';
import { resolveAuthorizedTransportContext, SmtpConfigurationError } from '@/lib/email/transporter';
import { DateTime } from 'luxon';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
  }

  // 1. Verify campaign ownership
  if (campaign.user_id && campaign.user_id !== user.id && user.email !== 'cesare@arkitecna.com') {
    return NextResponse.json({ error: 'Non autorizzato ad avviare questa campagna' }, { status: 403 });
  }

  // 2. Validations before starting
  if (!campaign.name?.trim()) {
    return NextResponse.json({ error: 'Il nome della campagna è obbligatorio' }, { status: 400 });
  }

  if (!campaign.subject_template?.trim()) {
    return NextResponse.json({ error: "L'oggetto dell'email non può essere vuoto" }, { status: 400 });
  }

  if (!campaign.html_template?.trim()) {
    return NextResponse.json({ error: "Il corpo HTML dell'email non può essere vuoto" }, { status: 400 });
  }

  // 3. Check if at least one pending or retry lead exists
  const { count: leadCount } = await supabase
    .from('campaign_leads')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .in('status', ['pending', 'retry']);

  if (!leadCount || leadCount === 0) {
    return NextResponse.json(
      { error: 'Nessun contatto valido in attesa di invio in questa campagna. Importa contatti prima di avviare.' },
      { status: 400 }
    );
  }

  // 4. Verify that an authentic, verified SMTP connection exists for this campaign / user
  // Strictly unified with dispatcher policy (allowAdminFallback = false)
  try {
    await resolveAuthorizedTransportContext({
      userId: campaign.user_id || user.id,
      smtpConnectionId: campaign.smtp_connection_id,
      allowAdminFallback: false,
    });
  } catch (err: any) {
    const isConfigErr = err instanceof SmtpConfigurationError;
    return NextResponse.json(
      {
        error: isConfigErr
          ? `Impossibile avviare la campagna: ${err.message}`
          : `Errore verifica database configurazione SMTP: ${err.message}`,
      },
      { status: isConfigErr ? 400 : 500 }
    );
  }

  // 5. Compute first valid slot
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
    .from('campaigns')
    .update({
      status: 'active',
      next_send_at: nextSend.toUTC().toISO(),
      daily_limit: campaign.daily_limit || 80,
    })
    .eq('id', id)
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
}
