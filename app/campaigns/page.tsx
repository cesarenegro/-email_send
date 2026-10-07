import { createClient } from '@/lib/supabase/server';
import CampaignsLiveView from '@/components/CampaignsLiveView';
import { CampaignWithStats } from '@/types/database';

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
      campaignsWithStats = await Promise.all(
        campaigns.map(async (camp) => {
          const { data: leads } = await supabase
            .from('campaign_leads')
            .select('status')
            .eq('campaign_id', camp.id);

          const total = leads?.length || 0;
          const sent = leads?.filter((l) => l.status === 'sent').length || 0;
          const failed = leads?.filter((l) => l.status === 'failed').length || 0;
          const pending = total - sent - failed;

          return {
            ...camp,
            total_leads: total,
            sent_count: sent,
            pending_count: pending,
            failed_count: failed,
          };
        })
      );
    }
  } catch (err) {
    console.error('Error fetching campaigns list:', err);
  }

  return <CampaignsLiveView initialCampaigns={campaignsWithStats} />;
}
