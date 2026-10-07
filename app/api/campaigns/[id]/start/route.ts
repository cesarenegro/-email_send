import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeNextSendTime } from '@/lib/scheduling/next-send-time';
import { DateTime } from 'luxon';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
  }

  // Validations before starting
  if (!campaign.name?.trim()) {
    return NextResponse.json({ error: 'Il nome della campagna è obbligatorio' }, { status: 400 });
  }

  if (!campaign.subject_template?.trim()) {
    return NextResponse.json({ error: "L'oggetto dell'email non può essere vuoto" }, { status: 400 });
  }

  if (!campaign.html_template?.trim()) {
    return NextResponse.json({ error: "Il corpo HTML dell'email non può essere vuoto" }, { status: 400 });
  }

  // Check if at least one pending or retry lead exists
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

  // Check SMTP config in env
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json(
      { error: 'Credenziali SMTP non configurate sul server. Configura SMTP_USER e SMTP_PASS.' },
      { status: 400 }
    );
  }

  // Compute first valid slot
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

  const nextSendIso = nextSend.toUTC().toISO();

  const { data: updated, error: updateError } = await supabase
    .from('campaigns')
    .update({
      status: 'active',
      next_send_at: nextSendIso,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
