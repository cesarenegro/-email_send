import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CampaignSchema } from '@/lib/validations/campaign';
import { getCampaignStats } from '@/lib/campaigns/stats';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
  }

  // Count stats without 1000 row limitation
  const stats = await getCampaignStats(supabase, id);

  return NextResponse.json({
    ...campaign,
    ...stats,
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const body = await request.json();

  // Check current status and campaign ownership
  const { data: existing, error: fetchError } = await supabase
    .from('campaigns')
    .select('status, user_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
  }

  if (existing.user_id && existing.user_id !== user.id && user.email !== 'cesare@arkitecna.com') {
    return NextResponse.json({ error: 'Non autorizzato a modificare questa campagna' }, { status: 403 });
  }

  if (existing.status === 'active') {
    return NextResponse.json(
      { error: 'Impossibile modificare una campagna attiva. Metti in PAUSA la campagna prima di apportare modifiche.' },
      { status: 400 }
    );
  }

  const parsed = CampaignSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Dati non validi' },
      { status: 400 }
    );
  }

  // STRICT VALIDATION OF smtp_connection_id IF BEING UPDATED
  if (parsed.data.smtp_connection_id) {
    const admin = createAdminClient();
    const { data: conn, error: connErr } = await admin
      .from('smtp_connections')
      .select('id, user_id, is_verified')
      .eq('id', parsed.data.smtp_connection_id)
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

  const updatePayload = {
    ...parsed.data,
    ...(parsed.data.start_at !== undefined ? { start_at: parsed.data.start_at || null } : {}),
  };

  const { data, error } = await supabase
    .from('campaigns')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('campaigns')
    .select('status, user_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
  }

  if (existing.user_id && existing.user_id !== user.id && user.email !== 'cesare@arkitecna.com') {
    return NextResponse.json({ error: 'Non autorizzato a eliminare questa campagna' }, { status: 403 });
  }

  if (existing.status === 'active') {
    return NextResponse.json(
      { error: 'Non è possibile eliminare una campagna ATTIVA. Mettila prima in pausa o attendi il completamento.' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Campagna eliminata con successo' });
}
