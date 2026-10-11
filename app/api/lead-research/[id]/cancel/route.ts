import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { data: job, error: jobError } = await supabase
    .from('lead_research_jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Ricerca non trovata' }, { status: 404 });
  }

  if (['completed', 'delivered', 'cancelled'].includes(job.status)) {
    return NextResponse.json(
      { error: `Impossibile annullare una ricerca in stato '${job.status}'` },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { data: updated, error: updateError } = await adminClient
    .from('lead_research_jobs')
    .update({
      status: 'cancelled',
      stop_reason: 'user_cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message || 'Errore durante l’annullamento' }, { status: 500 });
  }

  return NextResponse.json(updated);
}
