import { SupabaseClient } from '@supabase/supabase-js';

export interface CampaignStats {
  total_leads: number;
  sent_count: number;
  pending_count: number;
  failed_count: number;
}

/**
 * Calculates exact count of leads for a single campaign without hitting the PostgREST 1000 row limit.
 */
export async function getCampaignStats(
  supabase: SupabaseClient<any, any, any>,
  campaignId: string
): Promise<CampaignStats> {
  const [totalRes, sentRes, failedRes] = await Promise.all([
    supabase
      .from('campaign_leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId),
    supabase
      .from('campaign_leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'sent'),
    supabase
      .from('campaign_leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'failed'),
  ]);

  const total = totalRes.count || 0;
  const sent = sentRes.count || 0;
  const failed = failedRes.count || 0;
  const pending = Math.max(0, total - sent - failed);

  return {
    total_leads: total,
    sent_count: sent,
    pending_count: pending,
    failed_count: failed,
  };
}

/**
 * Enriches an array of campaigns with exact lead counts in parallel.
 */
export async function enrichCampaignsWithStats<T extends { id: string }>(
  supabase: SupabaseClient<any, any, any>,
  campaigns: T[]
): Promise<(T & CampaignStats)[]> {
  return Promise.all(
    campaigns.map(async (camp) => {
      const stats = await getCampaignStats(supabase, camp.id);
      return {
        ...camp,
        ...stats,
      };
    })
  );
}
