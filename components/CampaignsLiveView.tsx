'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import CampaignTable from '@/components/CampaignTable';
import { CampaignWithStats } from '@/types/database';
import { useTranslation } from '@/lib/i18n/useTranslation';
import SetupDummiesModal from '@/components/dummies/SetupDummiesModal';

interface CampaignsLiveViewProps {
  initialCampaigns: CampaignWithStats[];
}

export default function CampaignsLiveView({ initialCampaigns }: CampaignsLiveViewProps) {
  const { t, locale } = useTranslation();
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>(initialCampaigns);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDummiesModal, setShowDummiesModal] = useState<boolean>(false);

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

  // Derived metrics
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const totalPendingLeads = campaigns.reduce((acc, c) => acc + (c.pending_count || 0), 0);
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalLeads = campaigns.reduce((acc, c) => {
    const sum = (c.sent_count || 0) + (c.pending_count || 0) + (c.failed_count || 0);
    return acc + (c.total_leads && c.total_leads > sum ? c.total_leads : sum);
  }, 0);
  const deliveryRatePercent = totalLeads > 0 ? Math.round((totalSent / totalLeads) * 100) : (totalSent > 0 ? 100 : 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const thisMonthCampaigns = campaigns.filter((c) => {
    if (!c.created_at) return false;
    const d = new Date(c.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.subject_template && c.subject_template.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        c.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  return (
    <div className="relative w-full overflow-hidden px-gutter pb-space-xl pt-space-md flex flex-col gap-space-lg">
      {/* Decorative ambient glow */}
      <div className="absolute top-0 right-1/4 -z-10 w-96 h-96 rounded-full bg-[#5cb855]/10 blur-3xl pointer-events-none"></div>

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
        <div className="flex flex-col max-w-2xl">
          <div className="flex items-center gap-space-xs mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855]"></span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-[#5c5e63] font-semibold">
              {t.campaigns.atelierConsole}
            </span>
            <span className="text-[#a2a59e] text-xs">•</span>
            <span className="font-label-sm text-label-sm text-[#5c5f59] font-medium">{t.common.appName}</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-[#1b1c1a] tracking-tight">{t.campaigns.title}</h1>
          <p className="font-body-lg text-body-lg text-[#3f4a3c] mt-1">
            {t.campaigns.subtitle}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-space-sm">
          {/* SETUP-DUMMIES Lime Green Button */}
          <button
            type="button"
            onClick={() => setShowDummiesModal(true)}
            className="h-10 px-space-md rounded-lg bg-[#84cc16] hover:bg-[#65a30d] text-[#1b1c1a] font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Procedura guidata per creare una campagna in modo semplice e veloce"
          >
            <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
            <span>SETUP-DUMMIES</span>
          </button>

          <Link
            href="/campaigns/new"
            className="h-10 px-space-md rounded-lg bg-[#30312f] text-[#f2f0ed] hover:bg-[#5c5e63] transition-colors flex items-center gap-2 font-label-md text-label-md shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>{t.campaigns.newButton}</span>
          </Link>
          <button
            onClick={() => refreshData()}
            disabled={isRefreshing}
            className="h-10 px-space-md rounded-lg bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] transition-colors flex items-center gap-1.5 font-label-md text-label-md border border-[#e5e5e0] disabled:opacity-50"
            title={t.campaigns.refresh}
            type="button"
          >
            <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{t.campaigns.refresh}</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Metric 1: Campagne Totali */}
        <div className="p-space-lg rounded-xl bg-[#ffffff] border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-space-md relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] font-semibold">
              {t.campaigns.totalCampaignsCard}
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#1b1c1a]">
              <span className="material-symbols-outlined text-[18px]">layers</span>
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="font-metric-num text-metric-num text-[#1b1c1a]">{totalCampaigns}</span>
              <span className="font-label-sm text-label-sm text-[#036e13] font-semibold">
                {locale === 'en' ? `+${thisMonthCampaigns} this month` : `+${thisMonthCampaigns} questo mese`}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[#5c5e63] font-label-sm text-label-sm pt-1">
              <span>{activeCampaigns} {t.campaigns.activeInDispatch}</span>
            </div>
          </div>
        </div>

        {/* Metric 2: In Esecuzione */}
        <div className="p-space-lg rounded-xl bg-[#ffffff] border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-space-md relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] font-semibold">
              {t.campaigns.runningCard}
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#036e13]">
              <span className="material-symbols-outlined text-[18px]">sync</span>
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="font-metric-num text-metric-num text-[#1b1c1a]">{activeCampaigns}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ecf8eb] text-[#036e13] font-label-sm text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855] animate-pulse"></span>
                {t.campaigns.liveCadence}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[#5c5e63] font-label-sm text-label-sm pt-1">
              <span>{t.campaigns.intervalCadence}</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Email Inviate */}
        <div className="p-space-lg rounded-xl bg-[#ffffff] border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-space-md relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] font-semibold">
              {t.campaigns.sentTotalCard}
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#036e13]">
              <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="font-metric-num text-metric-num text-[#1b1c1a]">{totalSent}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#ecf8eb] text-[#036e13] font-label-sm text-label-sm font-semibold">
                {deliveryRatePercent}% {locale === 'en' ? 'delivered' : 'recapito'}
              </span>
            </div>
            <div className="w-full bg-[#f5f3f0] h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-[#5cb855] h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(0, deliveryRatePercent))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Metric 4: In Coda / Attesa */}
        <div className="p-space-lg rounded-xl bg-[#ffffff] border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-space-md relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] font-semibold">
              {t.campaigns.queuedCard}
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#5c5e63]">
              <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="font-metric-num text-metric-num text-[#1b1c1a]">{totalPendingLeads}</span>
              <span className="font-label-sm text-label-sm text-[#5c5e63]">{t.campaigns.recipientUnit}</span>
            </div>
            <div className="flex items-center gap-1 text-[#5c5e63] font-label-sm text-label-sm pt-1">
              <span className="material-symbols-outlined text-[14px] text-[#5c5f59]">shield_lock</span>
              <span>{locale === 'en' ? 'Daily safe dispatch limit: 80/day' : 'Dilazione protetta: 80/gg'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter, Search and Real-Time Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md p-space-sm rounded-xl bg-[#ffffff] border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
        <div className="flex flex-1 items-center gap-space-sm px-space-sm">
          <span className="material-symbols-outlined text-[#5c5e63] text-[20px]">search</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-[#1b1c1a] font-body-md text-body-md placeholder:text-[#a2a59e] focus:outline-none"
            placeholder={t.campaigns.searchPlaceholder}
            type="text"
          />
        </div>

        <div className="flex flex-wrap items-center gap-space-sm px-space-xs">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 pl-3 pr-8 rounded-lg bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] font-label-md text-label-md border border-[#e5e5e0] appearance-none cursor-pointer focus:outline-none"
            >
              <option value="all">{t.campaigns.filterAll} ({campaigns.length})</option>
              <option value="active">{t.campaigns.filterActive} ({campaigns.filter((c) => c.status === 'active').length})</option>
              <option value="completed">{t.campaigns.filterCompleted} ({campaigns.filter((c) => c.status === 'completed').length})</option>
              <option value="paused">{t.campaigns.filterPaused} ({campaigns.filter((c) => c.status === 'paused').length})</option>
              <option value="draft">{t.campaigns.filterDraft} ({campaigns.filter((c) => c.status === 'draft').length})</option>
            </select>
            <span className="material-symbols-outlined text-[16px] text-[#5c5e63] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              expand_more
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5f3f0] text-[#5c5e63] font-label-sm text-label-sm border border-[#e5e5e0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855]"></span>
            <span>
              {t.campaigns.lastUpdate}{' '}
              <span className="font-semibold text-[#1b1c1a]">
                {lastUpdated.toLocaleTimeString(locale === 'en' ? 'en-US' : 'it-IT')}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Campaign Data Table */}
      <CampaignTable campaigns={filteredCampaigns} />

      {/* SETUP-DUMMIES Modal */}
      <SetupDummiesModal
        isOpen={showDummiesModal}
        onClose={() => setShowDummiesModal(false)}
      />
    </div>
  );
}
