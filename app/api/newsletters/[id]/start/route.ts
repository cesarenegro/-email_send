import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DateTime } from 'luxon';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { data: newsletter, error: fetchError } = await supabase
    .from('newsletters')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !newsletter) {
    return NextResponse.json({ error: 'Newsletter non trovata' }, { status: 404 });
  }

  // Check if there are pending subscribers
  const { count: pendingCount } = await supabase
    .from('newsletter_subscribers')
    .select('id', { count: 'exact', head: true })
    .eq('newsletter_id', id)
    .eq('status', 'pending');

  if (!pendingCount || pendingCount === 0) {
    return NextResponse.json(
      { error: 'Nessun destinatario in attesa. Importa una lista di iscritti prima di avviare.' },
      { status: 400 }
    );
  }

  const now = DateTime.utc();
  let newStatus: string = 'sending';
  let nextSendAt: string = now.toISO()!;

  // If newsletter has a future scheduled_at, keep as scheduled
  if (newsletter.scheduled_at) {
    const scheduledTime = DateTime.fromISO(newsletter.scheduled_at);
    if (scheduledTime > now) {
      newStatus = 'scheduled';
      nextSendAt = scheduledTime.toUTC().toISO()!;
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('newsletters')
    .update({
      status: newStatus,
      next_send_at: nextSendAt,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
