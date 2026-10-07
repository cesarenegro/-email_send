'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CampaignTable from '@/components/CampaignTable';
import { CampaignWithStats } from '@/types/database';
import { Plus, RotateCw } from 'lucide-react';

interface CampaignsLiveViewProps {
  initialCampaigns: CampaignWithStats[];
}

export default function CampaignsLiveView({ initialCampaigns }: CampaignsLiveViewProps) {
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>(initialCampaigns);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/campaigns', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error auto-refreshing campaigns list:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh every 5 seconds when tab is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        refreshData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">Tutte le Campagne</h1>
            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Sync</span>
            </span>
          </div>
          <p className="text-sm text-[#666666] mt-0.5">Gestisci le tue campagne outbound</p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => refreshData()}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-1 px-3 py-2 border border-[#D8D2C8] bg-white text-[#1A1A1E] text-xs font-medium rounded hover:bg-[#F7F5F0] transition-colors shadow-sm disabled:opacity-50"
            title="Aggiorna dati adesso"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Aggiorna</span>
          </button>

          <Link
            href="/campaigns/new"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#1A1A1E] text-white text-sm font-medium rounded hover:bg-[#333333] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuova Campagna</span>
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-end">
          <span className="text-xs text-[#888888]">
            Ultimo agg: {lastUpdated.toLocaleTimeString('it-IT')}
          </span>
        </div>
        <CampaignTable campaigns={campaigns} />
      </div>
    </div>
  );
}
