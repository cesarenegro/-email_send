import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
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

  // Fetch job
  const { data: job, error: jobError } = await supabase
    .from('lead_research_jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Ricerca non trovata' }, { status: 404 });
  }

  // Fetch messages
  const { data: messages } = await supabase
    .from('lead_research_messages')
    .select('*')
    .eq('job_id', id)
    .order('created_at', { ascending: true });

  // Fetch results
  const { data: results } = await supabase
    .from('lead_research_results')
    .select('*')
    .eq('job_id', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    job,
    messages: messages || [],
    results: results || [],
  });
}
