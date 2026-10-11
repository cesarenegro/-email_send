import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { reserveBudget, reconcileBudget } from '@/lib/lead-research/budget';
import { planSearchQueries, extractStructuredLeads } from '@/lib/lead-research/providers/openai';
import { searchTavily, extractTavily } from '@/lib/lead-research/providers/tavily';
import { estimateMaxOpenAiCostMicro, estimateTavilySearchCostMicro, estimateTavilyExtractCostMicro } from '@/lib/lead-research/pricing';

export const maxDuration = 60; // Max allowed serverless duration

export async function POST(request: NextRequest) {
  // 1. Machine Authentication via Bearer token
  const authHeader = request.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET || '';

  // In production, require strict Bearer auth. In local dev, allow matching secret or local requests
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized machine invocation' }, { status: 401 });
  }

  const supabase = createAdminClient();
  let requestedJobId: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.jobId) {
      requestedJobId = body.jobId;
    }
  } catch {
    // optional body
  }

  // 2. Select next active job in_progress
  let query = supabase
    .from('lead_research_jobs')
    .select('*')
    .in('sku', ['M', 'XL'])
    .eq('status', 'in_progress')
    .order('created_at', { ascending: true })
    .limit(1);

  if (requestedJobId) {
    query = query.eq('id', requestedJobId);
  }

  const { data: jobs, error: jobErr } = await query;

  if (jobErr || !jobs || jobs.length === 0) {
    return NextResponse.json({ message: 'No active lead research jobs to process' });
  }

  const job = jobs[0];
  const budget = job.api_budget_micro_usd || 5_000_000;
  const spent = job.api_spent_micro_usd || 0;
  const reserved = job.api_reserved_micro_usd || 0;

  // Minimum buffer needed to attempt a meaningful search & extraction step (~35,000 µUSD = $0.035)
  const MIN_STEP_BUFFER_MICRO = 35_000;
  if (spent + reserved + MIN_STEP_BUFFER_MICRO > budget) {
    await supabase
      .from('lead_research_jobs')
      .update({
        status: 'completed',
        stop_reason: 'budget_exhausted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return NextResponse.json({
      message: 'Job completed: budget limit reached',
      jobId: job.id,
      spent_micro_usd: spent,
    });
  }

  try {
    // -------------------------------------------------------------
    // Step 1: Query Planning via OpenAI
    // -------------------------------------------------------------
    const planReserveCost = estimateMaxOpenAiCostMicro(500, 300); // ~4,000 µUSD
    const planRes = await reserveBudget(job.id, 'openai', 'query_planner', planReserveCost);

    if (!planRes.success || !planRes.usage_id) {
      await supabase
        .from('lead_research_jobs')
        .update({ status: 'completed', stop_reason: 'budget_exhausted' })
        .eq('id', job.id);
      return NextResponse.json({ message: 'Budget ceiling reached at planning phase' });
    }

    let searchQueries: string[] = [];
    try {
      const planOutput = await planSearchQueries(job.initial_brief, job.confirmed_scope || undefined);
      searchQueries = planOutput.queries;
      await reconcileBudget(planRes.usage_id, planOutput.usage.cost_micro_usd, planOutput.usage);
    } catch (err: any) {
      // Reconcile with 0 cost if call failed before execution
      await reconcileBudget(planRes.usage_id, 0);
      throw err;
    }

    if (searchQueries.length === 0) {
      searchQueries = [job.initial_brief.slice(0, 80)];
    }

    // -------------------------------------------------------------
    // Step 2: Search via Tavily
    // -------------------------------------------------------------
    const searchReserveCost = estimateTavilySearchCostMicro(); // 16,000 µUSD
    const searchRes = await reserveBudget(job.id, 'tavily', 'search', searchReserveCost);

    let candidateUrls: string[] = [];
    if (searchRes.success && searchRes.usage_id) {
      try {
        const searchOutput = await searchTavily(searchQueries[0], { max_results: 6 });
        candidateUrls = searchOutput.results.map((r) => r.url).filter((u) => u.startsWith('http'));
        await reconcileBudget(searchRes.usage_id, searchOutput.cost_micro_usd, { results: candidateUrls.length });
      } catch (err) {
        await reconcileBudget(searchRes.usage_id, 0);
        console.warn('Tavily search step error:', err);
      }
    }

    // -------------------------------------------------------------
    // Step 3: Extract Web Pages via Tavily Extract
    // -------------------------------------------------------------
    const targetExtractUrls = candidateUrls.slice(0, 3);
    let extractedPages: Array<{ url: string; content: string }> = [];

    if (targetExtractUrls.length > 0) {
      const extractReserveCost = estimateTavilyExtractCostMicro(targetExtractUrls.length);
      const extractRes = await reserveBudget(job.id, 'tavily', 'extract', extractReserveCost);

      if (extractRes.success && extractRes.usage_id) {
        try {
          const extractOutput = await extractTavily(targetExtractUrls);
          extractedPages = extractOutput.results.map((r) => ({
            url: r.url,
            content: r.raw_content,
          }));
          await reconcileBudget(extractRes.usage_id, extractOutput.cost_micro_usd, { extracted: extractedPages.length });
        } catch (err) {
          await reconcileBudget(extractRes.usage_id, 0);
          console.warn('Tavily extract step error:', err);
        }
      }
    }

    // -------------------------------------------------------------
    // Step 4: Structured Data Extraction via OpenAI
    // -------------------------------------------------------------
    if (extractedPages.length > 0) {
      const extractAiCost = estimateMaxOpenAiCostMicro(3000, 1500); // ~21,000 µUSD
      const aiRes = await reserveBudget(job.id, 'openai', 'structured_extractor', extractAiCost);

      if (aiRes.success && aiRes.usage_id) {
        try {
          const extraction = await extractStructuredLeads(extractedPages, job.initial_brief);

          // Save extracted leads into lead_research_results
          for (const lead of extraction.leads) {
            // Deduplication by domain or name
            const normalizedDomain = lead.website
              ? new URL(lead.website).hostname.replace(/^www\./, '').toLowerCase()
              : null;

            await supabase.from('lead_research_results').insert({
              job_id: job.id,
              company_name: lead.company_name,
              category: lead.category || null,
              country: lead.country || null,
              region: lead.region || null,
              city: lead.city || null,
              address: lead.address || null,
              email: lead.email || null,
              phone: lead.phone || null,
              website: lead.website || null,
              contact_person: lead.contact_person || null,
              contact_role: lead.contact_role || null,
              source_evidence: lead.source_evidence || {},
              data_status: 'web_found',
              human_verified: false,
              deliverability_status: 'unverified',
              normalized_domain: normalizedDomain,
              normalized_email: lead.email?.toLowerCase().trim() || null,
            });
          }

          await reconcileBudget(aiRes.usage_id, extraction.usage.cost_micro_usd, extraction.usage);
        } catch (err) {
          await reconcileBudget(aiRes.usage_id, 0);
          console.warn('Structured extraction step error:', err);
        }
      }
    }

    // -------------------------------------------------------------
    // Step 5: Check cycle completion or progress
    // -------------------------------------------------------------
    // For M ($5) searches, 1-2 robust batches complete the single automated exploration.
    // For XL ($15), multiple passes can be executed until budget ceiling.
    const { data: updatedJob } = await supabase
      .from('lead_research_jobs')
      .select('api_spent_micro_usd, api_budget_micro_usd')
      .eq('id', job.id)
      .single();

    const currentSpent = updatedJob?.api_spent_micro_usd || spent;
    const isMJob = job.sku === 'M';

    if (isMJob || currentSpent + MIN_STEP_BUFFER_MICRO > budget) {
      await supabase
        .from('lead_research_jobs')
        .update({
          status: 'completed',
          stop_reason: currentSpent + MIN_STEP_BUFFER_MICRO > budget ? 'budget_exhausted' : 'goal_reached',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      pagesExplored: extractedPages.length,
      currentSpentMicroUsd: currentSpent,
    });
  } catch (executionErr: any) {
    console.error('Error during lead research step:', executionErr);
    await supabase
      .from('lead_research_jobs')
      .update({
        status: 'failed',
        stop_reason: executionErr.message || 'error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return NextResponse.json({ error: executionErr.message }, { status: 500 });
  }
}
