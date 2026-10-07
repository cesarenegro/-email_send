import { createClient } from '@/lib/supabase/server';
import DashboardLiveView from '@/components/DashboardLiveView';
import { CampaignWithStats } from '@/types/database';
import { enrichCampaignsWithStats } from '@/lib/campaigns/stats';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let campaignsWithStats: CampaignWithStats[] = [];

  try {
    const supabase = await createClient();
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (campaigns && campaigns.length > 0) {
      campaignsWithStats = await enrichCampaignsWithStats(supabase, campaigns);
    }
  } catch (err) {
    console.error('Error loading dashboard campaigns:', err);
  }

  return <DashboardLiveView initialCampaigns={campaignsWithStats} />;
}
