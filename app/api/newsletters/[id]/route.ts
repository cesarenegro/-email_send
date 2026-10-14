import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getNewsletterStats } from '@/lib/newsletters/stats';

export async function GET(
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

  const { data: newsletter, error } = await supabase
    .from('newsletters')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !newsletter) {
    return NextResponse.json({ error: 'Newsletter non trovata' }, { status: 404 });
  }

  const stats = await getNewsletterStats(supabase, id);

  return NextResponse.json({
    ...newsletter,
    ...stats,
  });
}

export async function PATCH(
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

  const body = await request.json();

  if (body.html_content && typeof body.html_content === 'string' && /data:image\/[a-zA-Z+]+;base64,/i.test(body.html_content)) {
    return NextResponse.json(
      { error: 'Non è consentito salvare immagini Base64. Convertile in immagini caricate su storage prima del salvataggio.' },
      { status: 400 }
    );
  }

  // Validate smtp_connection_id if being updated
  if (body.smtp_connection_id) {
    const admin = createAdminClient();
    const { data: conn, error: connErr } = await admin
      .from('smtp_connections')
      .select('id, user_id, is_verified')
      .eq('id', body.smtp_connection_id)
      .maybeSingle();

    if (connErr) {
      return NextResponse.json({ error: `Errore verifica connessione: ${connErr.message}` }, { status: 500 });
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

  const { data, error } = await supabase
    .from('newsletters')
    .update(body)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
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

  const { error } = await supabase
    .from('newsletters')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
