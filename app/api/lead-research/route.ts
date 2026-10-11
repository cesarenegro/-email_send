import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateLeadResearchJobSchema } from '@/types/lead-research';
import { SKU_CATALOG, CURRENT_PRICING_VERSION } from '@/lib/lead-research/pricing';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { data: jobs, error } = await supabase
    .from('lead_research_jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count results per job
  const jobIds = (jobs || []).map((j) => j.id);
  let countsMap: Record<string, number> = {};

  if (jobIds.length > 0) {
    const { data: resultsCount } = await supabase
      .from('lead_research_results')
      .select('job_id');

    if (resultsCount) {
      for (const row of resultsCount) {
        countsMap[row.job_id] = (countsMap[row.job_id] || 0) + 1;
      }
    }
  }

  const enriched = (jobs || []).map((j) => ({
    ...j,
    results_count: countsMap[j.id] || 0,
  }));

  return NextResponse.json(enriched);
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
  const parsed = CreateLeadResearchJobSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Dati non validi' },
      { status: 400 }
    );
  }

  const { sku, initial_brief, title, sector, territory, requested_fields, exclusions, target_goal } =
    parsed.data;

  const skuConfig = SKU_CATALOG[sku];
  if (!skuConfig) {
    return NextResponse.json({ error: 'SKU non valido' }, { status: 400 });
  }

  const autoTitle = title || `${skuConfig.label} - ${initial_brief.slice(0, 35)}...`;

  const newJob = {
    user_id: user.id,
    sku,
    status: 'draft',
    title: autoTitle,
    initial_brief,
    confirmed_scope: {
      sector,
      territory,
      requested_fields,
      exclusions,
      target_goal,
    },
    price_cents: skuConfig.price_cents,
    currency: skuConfig.currency,
    api_budget_micro_usd: skuConfig.api_budget_micro_usd,
    api_spent_micro_usd: 0,
    api_reserved_micro_usd: 0,
    pricing_version: CURRENT_PRICING_VERSION,
  };

  const { data: created, error } = await supabase
    .from('lead_research_jobs')
    .insert(newJob)
    .select('*')
    .single();

  if (error || !created) {
    return NextResponse.json({ error: error?.message || 'Errore nella creazione della ricerca' }, { status: 500 });
  }

  // Create initial user message in chat history
  await supabase.from('lead_research_messages').insert({
    job_id: created.id,
    sender_role: 'user',
    content: initial_brief,
  });

  return NextResponse.json(created, { status: 201 });
}
