import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateXlsxBuffer, generateCsvString } from '@/lib/lead-research/export';
import { LeadResearchResult } from '@/types/lead-research';

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

  // 1. Fetch job with ownership check
  const { data: job, error: jobError } = await supabase
    .from('lead_research_jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Ricerca non trovata' }, { status: 404 });
  }

  // 2. Fetch results
  const { data: results, error: resError } = await supabase
    .from('lead_research_results')
    .select('*')
    .eq('job_id', id)
    .order('created_at', { ascending: true });

  if (resError) {
    return NextResponse.json({ error: 'Errore nel recupero dei risultati' }, { status: 500 });
  }

  const typedResults: LeadResearchResult[] = (results || []) as LeadResearchResult[];
  const searchParams = request.nextUrl.searchParams;
  const format = (searchParams.get('format') || 'xlsx').toLowerCase();

  const timestamp = new Date().toISOString().split('T')[0];
  const safeFilename = `MAIL-K_Leads_${job.sku}_${timestamp}_${id.slice(0, 8)}`;

  if (format === 'csv') {
    const csvContent = generateCsvString(typedResults);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}.csv"`,
        'Cache-Control': 'no-store, private',
      },
    });
  }

  // Default XLSX
  const xlsxBuffer = await generateXlsxBuffer(job, typedResults);
  return new NextResponse(new Uint8Array(xlsxBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeFilename}.xlsx"`,
      'Cache-Control': 'no-store, private',
    },
  });
}
