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

  if (job.status !== 'draft') {
    return NextResponse.json(
      { error: `Impossibile avviare una ricerca in stato '${job.status}'` },
      { status: 400 }
    );
  }

  const nextStatus = job.sku === 'AD_HOC' ? 'submitted' : 'in_progress';

  const adminClient = createAdminClient();
  const { data: updated, error: updateError } = await adminClient
    .from('lead_research_jobs')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message || 'Errore durante l’avvio' }, { status: 500 });
  }

  // If automated M or XL, trigger one background execution cycle asynchronously
  if (job.sku !== 'AD_HOC') {
    const cronSecret = process.env.CRON_SECRET || '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    fetch(`${appUrl}/api/cron/lead-research`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId: id }),
    }).catch((err) => {
      console.warn('Asynchronous trigger of lead-research worker dispatched:', err.message);
    });
  }

  return NextResponse.json(updated);
}
