import { createClient } from '@/lib/supabase/server';
import CampaignsLiveView from '@/components/CampaignsLiveView';
import { CampaignWithStats } from '@/types/database';
import { enrichCampaignsWithStats } from '@/lib/campaigns/stats';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
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
    console.error('Error fetching campaigns list:', err);
  }

  return <CampaignsLiveView initialCampaigns={campaignsWithStats} />;
}
