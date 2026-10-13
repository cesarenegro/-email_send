import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NewsletterSchema } from '@/lib/validations/newsletter';
import { enrichNewslettersWithStats } from '@/lib/newsletters/stats';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { data: newsletters, error } = await supabase
    .from('newsletters')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const newslettersWithStats = await enrichNewslettersWithStats(supabase, newsletters || []);

  return NextResponse.json(newslettersWithStats);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = NewsletterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
  }

  const { smtp_connection_id, ...newsletterFields } = parsed.data;

  // STRICT VALIDATION FOR smtp_connection_id
  if (smtp_connection_id) {
    const admin = createAdminClient();
    const { data: conn, error: connErr } = await admin
      .from('smtp_connections')
      .select('id, user_id, is_verified')
      .eq('id', smtp_connection_id)
      .maybeSingle();

    if (connErr) {
      return NextResponse.json({ error: `Errore verifica connessione SMTP: ${connErr.message}` }, { status: 500 });
    }

    if (!conn) {
      return NextResponse.json({ error: 'La connessione SMTP specificata non esiste.' }, { status: 400 });
    }

    if (conn.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Violazione di sicurezza: tentativo di utilizzare una connessione SMTP appartenente a un altro utente.' },
        { status: 403 }
      );
    }

    if (!conn.is_verified) {
      return NextResponse.json({ error: 'La connessione SMTP specificata non risulta verificata.' }, { status: 400 });
    }
  }

  const isScheduled = !!newsletterFields.scheduled_at;

  const insertPayload: Record<string, any> = {
    ...newsletterFields,
    user_id: user.id,
    status: isScheduled ? 'scheduled' : 'draft',
    next_send_at: isScheduled ? newsletterFields.scheduled_at : null,
  };

  if (smtp_connection_id) {
    insertPayload.smtp_connection_id = smtp_connection_id;
  }

  const { data, error } = await supabase
    .from('newsletters')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
