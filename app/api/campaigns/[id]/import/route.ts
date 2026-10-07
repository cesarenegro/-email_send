import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateAndDeduplicateLeads } from '@/lib/csv/validate-lead';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  // Verify campaign exists and is not active
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('status')
    .eq('id', id)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
  }

  if (campaign.status === 'active') {
    return NextResponse.json(
      { error: 'Non è possibile importare contatti in una campagna attiva. Metti in PAUSA la campagna prima di importare.' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const rawLeads: { company_name?: string; email?: string }[] = body.leads;

  if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
    return NextResponse.json({ error: 'Nessun contatto fornito per l’importazione' }, { status: 400 });
  }

  // Fetch ALL existing emails for this campaign via pagination (avoiding 1000 row cap)
  const existingEmails = new Set<string>();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data: pageRows } = await supabase
      .from('campaign_leads')
      .select('email')
      .eq('campaign_id', id)
      .range(from, from + pageSize - 1);

    if (!pageRows || pageRows.length === 0) break;
    for (const r of pageRows) {
      existingEmails.add(r.email.toLowerCase());
    }
    if (pageRows.length < pageSize) break;
    from += pageSize;
  }

  // Validate and deduplicate
  const result = validateAndDeduplicateLeads(rawLeads, existingEmails);

  if (result.valid.length > 0) {
    // Insert in batches of 500 for database efficiency
    const batchSize = 500;
    for (let i = 0; i < result.valid.length; i += batchSize) {
      const slice = result.valid.slice(i, i + batchSize).map((item) => ({
        campaign_id: id,
        company_name: item.company_name || null,
        email: item.email,
        status: 'pending',
        attempts: 0,
      }));

      const { error: insertError } = await supabase
        .from('campaign_leads')
        .upsert(slice, { onConflict: 'campaign_id,email', ignoreDuplicates: true });

      if (insertError) {
        console.error('Batch insert error:', insertError);
        return NextResponse.json({ error: 'Errore durante il salvataggio dei contatti: ' + insertError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({
    totalRead: rawLeads.length,
    imported: result.valid.length,
    duplicates: result.duplicates,
    invalid: result.invalid,
  });
}
