import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID connessione mancante' }, { status: 400 });
  }

  const admin = createAdminClient();

  // STRICT TENANT ISOLATION: verify user owns this connection
  const { data: existing, error: fetchError } = await admin
    .from('smtp_connections')
    .select('id, user_id, from_email')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Connessione SMTP non trovata' }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Non autorizzato a eliminare questa configurazione SMTP' },
      { status: 403 }
    );
  }

  const { error: deleteError } = await admin
    .from('smtp_connections')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Connessione SMTP (${existing.from_email}) rimossa con successo.`,
  });
}
