import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { dispatchNextEmailForNewsletter } from '@/lib/email/newsletter-dispatcher';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { data: newsletter, error: nlError } = await userSupabase
    .from('newsletters')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (nlError || !newsletter) {
    return NextResponse.json({ error: 'Newsletter non trovata' }, { status: 404 });
  }

  const adminSupabase = createAdminClient();

  try {
    const result = await dispatchNextEmailForNewsletter(adminSupabase, newsletter);

    if (result.status === 'sent') {
      return NextResponse.json({
        success: true,
        status: 'sent',
        subscriber: result.subscriber,
        smtp_message_id: result.smtp_message_id,
        message: `Newsletter inviata con successo a ${result.subscriber?.email}!`,
      });
    }

    if (result.status === 'error_configuration') {
      return NextResponse.json({
        success: false,
        status: 'error_configuration',
        error: result.error || result.message,
        message: result.message || 'Configurazione SMTP newsletter non valida',
      }, { status: 400 });
    }

    if (result.status === 'error_transient') {
      return NextResponse.json({
        success: false,
        status: 'error_transient',
        error: result.error || result.message,
        message: result.message || 'Errore transitorio durante l\'invio della newsletter.',
      }, { status: 500 });
    }

    if (result.status === 'error_handled') {
      return NextResponse.json({
        success: false,
        status: 'error_handled',
        subscriber: result.subscriber,
        error: result.error,
        message: `Tentativo fallito per ${result.subscriber?.email}: ${result.error}`,
      });
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      message: result.message || 'Elaborazione newsletter completata.',
    });
  } catch (err: any) {
    console.error('Error during manual newsletter send-now:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
