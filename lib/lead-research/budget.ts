import { createAdminClient } from '@/lib/supabase/admin';

export interface BudgetReservationResult {
  success: boolean;
  usage_id?: string;
  error?: string;
  spent_micro_usd?: number;
  reserved_micro_usd?: number;
  budget_micro_usd?: number | null;
}

/**
 * Atomically reserves a maximum estimated budget before executing an external API call.
 */
export async function reserveBudget(
  jobId: string,
  provider: 'openai' | 'tavily',
  endpointOrModel: string,
  amountMicroUsd: number
): Promise<BudgetReservationResult> {
  const supabase = createAdminClient();

  try {
    // 1. First attempt to call the atomic RPC function
    const { data: usageId, error } = await supabase.rpc('reserve_lead_research_budget', {
      p_job_id: jobId,
      p_provider: provider,
      p_endpoint_or_model: endpointOrModel,
      p_amount_micro_usd: amountMicroUsd,
    });

    if (error) {
      // If RPC is missing or budget exceeded
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      usage_id: usageId,
    };
  } catch (err: any) {
    // Fallback: direct atomic-like transaction check in PostgreSQL via Supabase client
    try {
      const { data: job, error: jobErr } = await supabase
        .from('lead_research_jobs')
        .select('api_budget_micro_usd, api_spent_micro_usd, api_reserved_micro_usd')
        .eq('id', jobId)
        .single();

      if (jobErr || !job) {
        return { success: false, error: 'Job not found' };
      }

      const budget = job.api_budget_micro_usd;
      const spent = job.api_spent_micro_usd || 0;
      const reserved = job.api_reserved_micro_usd || 0;

      if (budget !== null && spent + reserved + amountMicroUsd > budget) {
        return {
          success: false,
          error: `Budget limit reached: spent=${spent}, reserved=${reserved}, requested=${amountMicroUsd}, limit=${budget}`,
          spent_micro_usd: spent,
          reserved_micro_usd: reserved,
          budget_micro_usd: budget,
        };
      }

      // Record reservation in usage table
      const { data: usage, error: usageErr } = await supabase
        .from('lead_research_usage')
        .insert({
          job_id: jobId,
          provider,
          endpoint_or_model: endpointOrModel,
          reserved_micro_usd: amountMicroUsd,
          status: 'reserved',
        })
        .select('id')
        .single();

      if (usageErr || !usage) {
        return { success: false, error: usageErr?.message || 'Failed to create usage record' };
      }

      // Update reserved count on job
      await supabase
        .from('lead_research_jobs')
        .update({
          api_reserved_micro_usd: reserved + amountMicroUsd,
        })
        .eq('id', jobId);

      return {
        success: true,
        usage_id: usage.id,
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        error: fallbackErr.message || 'Unknown budget reservation error',
      };
    }
  }
}

/**
 * Reconciles the reserved budget with the exact actual cost returned by the provider.
 */
export async function reconcileBudget(
  usageId: string,
  actualCostMicroUsd: number,
  rawUsage?: Record<string, any>,
  requestId?: string
): Promise<boolean> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase.rpc('reconcile_lead_research_budget', {
      p_usage_id: usageId,
      p_actual_cost_micro_usd: actualCostMicroUsd,
      p_raw_usage: rawUsage || null,
      p_request_id: requestId || null,
    });

    if (!error && data !== undefined) {
      return Boolean(data);
    }
  } catch (err) {
    // Continue to fallback
  }

  // Fallback direct reconciliation
  try {
    const { data: usage } = await supabase
      .from('lead_research_usage')
      .select('job_id, reserved_micro_usd, status')
      .eq('id', usageId)
      .single();

    if (!usage || usage.status !== 'reserved') {
      return false;
    }

    const { data: job } = await supabase
      .from('lead_research_jobs')
      .select('api_spent_micro_usd, api_reserved_micro_usd')
      .eq('id', usage.job_id)
      .single();

    if (job) {
      const newReserved = Math.max(0, (job.api_reserved_micro_usd || 0) - (usage.reserved_micro_usd || 0));
      const newSpent = (job.api_spent_micro_usd || 0) + actualCostMicroUsd;

      await supabase
        .from('lead_research_jobs')
        .update({
          api_reserved_micro_usd: newReserved,
          api_spent_micro_usd: newSpent,
        })
        .eq('id', usage.job_id);
    }

    await supabase
      .from('lead_research_usage')
      .update({
        status: 'reconciled',
        actual_cost_micro_usd: actualCostMicroUsd,
        raw_usage: rawUsage || null,
        request_id: requestId || null,
      })
      .eq('id', usageId);

    return true;
  } catch (fallbackErr) {
    console.error('Error during fallback budget reconciliation:', fallbackErr);
    return false;
  }
}
