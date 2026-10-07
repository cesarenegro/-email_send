import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CampaignTable from '@/components/CampaignTable';
import { CampaignWithStats } from '@/types/database';
import { Plus, Send, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

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
    console.error('Error loading dashboard campaigns:', err);
  }

  const totalAllLeads = campaignsWithStats.reduce((acc, c) => acc + c.total_leads, 0);
  const totalSent = campaignsWithStats.reduce((acc, c) => acc + c.sent_count, 0);
  const totalPending = campaignsWithStats.reduce((acc, c) => acc + c.pending_count, 0);
  const totalFailed = campaignsWithStats.reduce((acc, c) => acc + c.failed_count, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">Dashboard Campagne</h1>
          <p className="text-sm text-[#666666]">Monitoraggio e controllo invii scaglionati ARKITECNA</p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-[#1A1A1E] text-white text-sm font-medium rounded hover:bg-[#333333] transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuova Campagna</span>
        </Link>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Contatti Totali</span>
            <Send className="w-4 h-4 text-[#666666]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#1A1A1E]">{totalAllLeads}</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Inviati con Successo</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700">{totalSent}</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold uppercase tracking-wider mb-1">
            <span>In Coda / Attesa</span>
            <Clock className="w-4 h-4 text-[#666666]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#1A1A1E]">{totalPending}</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Errori / Falliti</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-700">{totalFailed}</p>
        </div>
      </div>

      {/* Campaign Table */}
      <CampaignTable campaigns={campaignsWithStats} />
    </div>
  );
}
