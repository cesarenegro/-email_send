import { getTenantOrNull } from '@/lib/konta/session';
import CampaignsLiveView from '@/components/CampaignsLiveView';
import { Campaign, CampaignWithStats } from '@/types/database';
import { enrichCampaignsWithStats } from '@/lib/campaigns/stats';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  let campaignsWithStats: CampaignWithStats[] = [];

  try {
    const tenant = await getTenantOrNull();

    if (tenant) {
      const supabase = tenant.supabase;
      const { data: campaigns } = await supabase
        .from('mail_campaigns')
        .select('*')
        .eq('organization_id', tenant.organizationId)
        .order('created_at', { ascending: false });

      if (campaigns && campaigns.length > 0) {
        campaignsWithStats = await enrichCampaignsWithStats(supabase, campaigns as Campaign[]);
      }
    }
  } catch (err) {
    console.error('Error fetching campaigns list:', err);
  }

  return <CampaignsLiveView initialCampaigns={campaignsWithStats} />;
}
