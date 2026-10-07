'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CampaignTable from '@/components/CampaignTable';
import { CampaignWithStats } from '@/types/database';
import { Plus, Send, CheckCircle2, Clock, AlertTriangle, RotateCw } from 'lucide-react';

interface DashboardLiveViewProps {
  initialCampaigns: CampaignWithStats[];
}

export default function DashboardLiveView({ initialCampaigns }: DashboardLiveViewProps) {
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
      console.error('Error auto-refreshing dashboard campaigns:', err);
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

  const totalAllLeads = campaigns.reduce((acc, c) => acc + (c.total_leads || 0), 0);
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalPending = campaigns.reduce((acc, c) => acc + (c.pending_count || 0), 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">Dashboard Campagne</h1>
            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Sync</span>
            </span>
          </div>
          <p className="text-sm text-[#666666] mt-0.5">
            Monitoraggio e controllo invii scaglionati ARKITECNA in tempo reale
          </p>
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

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-4 shadow-sm transition-all">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Contatti Totali</span>
            <Send className="w-4 h-4 text-[#666666]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#1A1A1E]">{totalAllLeads}</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-4 shadow-sm transition-all">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Inviati con Successo</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700">{totalSent}</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-4 shadow-sm transition-all">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold uppercase tracking-wider mb-1">
            <span>In Coda / Attesa</span>
            <Clock className="w-4 h-4 text-[#666666]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#1A1A1E]">{totalPending}</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-4 shadow-sm transition-all">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Errori / Falliti</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-700">{totalFailed}</p>
        </div>
      </div>

      {/* Active & Recent Campaigns Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1A1A1E]">Campagne Attive & Recenti</h2>
          <span className="text-xs text-[#888888]">
            Ultimo agg: {lastUpdated.toLocaleTimeString('it-IT')}
          </span>
        </div>
        <CampaignTable campaigns={campaigns} />
      </div>
    </div>
  );
}
