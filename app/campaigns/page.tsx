import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CampaignTable from '@/components/CampaignTable';
import { CampaignWithStats } from '@/types/database';
import { Plus } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">Tutte le Campagne</h1>
          <p className="text-sm text-[#666666]">Gestisci le tue campagne outbound</p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-[#1A1A1E] text-white text-sm font-medium rounded hover:bg-[#333333] transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuova Campagna</span>
        </Link>
      </div>

      <CampaignTable campaigns={campaignsWithStats} />
    </div>
  );
}
