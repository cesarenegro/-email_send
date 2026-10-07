import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchNextEmailForCampaign } from '@/lib/email/dispatcher';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  // 1. Verify user authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  // 2. Fetch campaign
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
  }

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
    .from('campaign_leads')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .in('status', ['pending', 'retry']);

  if (!leadCount || leadCount === 0) {
    return NextResponse.json(
      { error: 'Nessun contatto valido in attesa in questa campagna. Importa contatti prima di inviare.' },
      { status: 400 }
    );
  }

  // 5. Check SMTP credentials
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json(
      { error: 'Credenziali SMTP non configurate sul server (SMTP_USER / SMTP_PASS).' },
      { status: 400 }
    );
  }

  const adminSupabase = createAdminClient();

  // 6. Ensure status is active
  if (campaign.status !== 'active') {
    await adminSupabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', id);
    campaign.status = 'active';
  }

  // 7. Dispatch next email immediately
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
  } catch (err: any) {
    console.error('Send-now error:', err);
    return NextResponse.json({ error: err.message || 'Errore durante l\'invio immediato' }, { status: 500 });
  }
}
