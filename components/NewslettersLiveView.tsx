'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { NewsletterWithStats } from '@/types/database';
import StatusBadge from '@/components/StatusBadge';
import { DateTime } from 'luxon';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function NewslettersLiveView({
  initialNewsletters,
}: {
  initialNewsletters: NewsletterWithStats[];
}) {
  const { t } = useTranslation();
  const [newsletters, setNewsletters] = useState<NewsletterWithStats[]>(initialNewsletters);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchNewsletters = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/newsletters');
      if (res.ok) {
        const data = await res.json();
        setNewsletters(data);
      }
    } catch (err) {
      console.error('Error refreshing newsletters:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const totalNewsletters = newsletters.length;
  const scheduledCount = newsletters.filter((n) => n.status === 'scheduled').length;
  const sendingCount = newsletters.filter((n) => n.status === 'sending').length;
  const completedCount = newsletters.filter((n) => n.status === 'sent').length;

  const filteredNewsletters = useMemo(() => {
    return newsletters.filter((n) => {
      const matchesSearch =
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.subject.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || n.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [newsletters, searchQuery, statusFilter]);

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
              {t.newsletters.studioPublications}
            </span>
            <span className="text-[#a2a59e] text-xs">•</span>
            <span className="font-label-sm text-label-sm text-[#5c5f59] font-medium">{t.common.appName}</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-[#1b1c1a] tracking-tight">{t.newsletters.title}</h1>
          <p className="font-body-lg text-body-lg text-[#3f4a3c] mt-1">
            {t.newsletters.subtitle}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <Link
            href="/newsletters/new"
            className="h-10 px-space-md rounded-lg bg-[#30312f] text-[#f2f0ed] hover:bg-[#5c5e63] transition-colors flex items-center gap-2 font-label-md text-label-md shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span>{t.newsletters.newButton}</span>
          </Link>
          <button
            onClick={fetchNewsletters}
            disabled={refreshing}
            className="h-10 px-space-md rounded-lg bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] transition-colors flex items-center gap-1.5 font-label-md text-label-md border border-[#e5e5e0] disabled:opacity-50"
            title={t.newsletters.refresh}
            type="button"
          >
            <span className={`material-symbols-outlined text-[16px] ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{t.newsletters.refresh}</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="p-space-lg rounded-xl bg-[#ffffff] border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-space-md">
          <div className="flex items-center justify-between text-[#5c5e63]">
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">{t.newsletters.totalEditionsCard}</span>
            <span className="material-symbols-outlined text-[18px]">inventory_2</span>
          </div>
          <div>
            <div className="font-metric-num text-metric-num text-[#1b1c1a]">{totalNewsletters}</div>
            <div className="font-label-sm text-label-sm text-[#5c5e63] mt-0.5">{t.newsletters.createdInAtelier}</div>
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-[#ffffff] border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-space-md">
          <div className="flex items-center justify-between text-[#5c5e63]">
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">{t.newsletters.scheduledCard}</span>
            <span className="material-symbols-outlined text-[18px] text-[#036e13]">schedule</span>
          </div>
          <div>
            <div className="font-metric-num text-metric-num text-[#1b1c1a]">{scheduledCount}</div>
            <div className="font-label-sm text-label-sm text-[#036e13] font-medium mt-0.5">{t.newsletters.cronScheduled}</div>
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-[#ffffff] border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-space-md">
          <div className="flex items-center justify-between text-[#5c5e63]">
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">{t.newsletters.dispatchingCard}</span>
            <span className="material-symbols-outlined text-[18px] text-[#036e13]">sync</span>
          </div>
          <div>
            <div className="font-metric-num text-metric-num text-[#036e13]">{sendingCount}</div>
            <div className="font-label-sm text-label-sm text-[#5c5e63] mt-0.5">{t.newsletters.activeCadence}</div>
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-[#ffffff] border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-space-md">
          <div className="flex items-center justify-between text-[#5c5e63]">
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">{t.newsletters.completedCard}</span>
            <span className="material-symbols-outlined text-[18px] text-[#036e13]">done_all</span>
          </div>
          <div>
            <div className="font-metric-num text-metric-num text-[#1b1c1a]">{completedCount}</div>
            <div className="font-label-sm text-label-sm text-[#5c5e63] mt-0.5">{t.newsletters.historyArchive}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md p-space-sm rounded-xl bg-[#ffffff] border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
        <div className="flex flex-1 items-center gap-space-sm px-space-sm">
          <span className="material-symbols-outlined text-[#5c5e63] text-[20px]">search</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-[#1b1c1a] font-body-md text-body-md placeholder:text-[#a2a59e] focus:outline-none"
            placeholder={t.newsletters.searchPlaceholder}
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
              <option value="all">{t.newsletters.filterAll} ({newsletters.length})</option>
              <option value="scheduled">{t.newsletters.filterScheduled} ({newsletters.filter((n) => n.status === 'scheduled').length})</option>
              <option value="sending">{t.newsletters.filterSending} ({newsletters.filter((n) => n.status === 'sending').length})</option>
              <option value="sent">{t.newsletters.filterSent} ({newsletters.filter((n) => n.status === 'sent').length})</option>
              <option value="draft">{t.newsletters.filterDraft} ({newsletters.filter((n) => n.status === 'draft').length})</option>
            </select>
            <span className="material-symbols-outlined text-[16px] text-[#5c5e63] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* Architectural Data Table */}
      {filteredNewsletters.length === 0 ? (
        <div className="bg-[#ffffff] border border-[#e5e5e0] rounded-xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-[#f5f3f0] flex items-center justify-center mx-auto mb-3 text-[#5c5e63]">
            <span className="material-symbols-outlined text-[24px]">article</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-[#1b1c1a] mb-1.5">{t.newsletters.emptyState}</h3>
          <p className="font-body-md text-body-md text-[#5c5e63] mb-6 max-w-md mx-auto">
            {t.newsletters.emptySubtitle}
          </p>
          <Link
            href="/newsletters/new"
            className="inline-flex items-center gap-2 px-space-md py-2.5 bg-[#30312f] text-[#f2f0ed] font-label-md text-label-md rounded-lg hover:bg-[#5c5e63] transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span>{t.newsletters.newButton}</span>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col rounded-xl bg-[#ffffff] border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f5f3f0] font-label-sm text-label-sm text-[#5c5e63] uppercase tracking-wider border-b border-[#e5e5e0]">
                  <th className="py-space-md px-space-lg font-semibold">{t.newsletters.colTitle}</th>
                  <th className="py-space-md px-space-md font-semibold text-center">{t.newsletters.colStatus}</th>
                  <th className="py-space-md px-space-sm font-semibold text-right">{t.newsletters.colSubscribers}</th>
                  <th className="py-space-md px-space-sm font-semibold text-right">{t.newsletters.colSent}</th>
                  <th className="py-space-md px-space-md font-semibold">{t.newsletters.colScheduledAt}</th>
                  <th className="py-space-md px-space-lg font-semibold text-right">{t.newsletters.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e0] text-body-md font-body-md">
                {filteredNewsletters.map((nl) => (
                  <tr key={nl.id} className="hover:bg-[#f5f3f0]/60 transition-colors group">
                    <td className="py-4 px-space-lg">
                      <div className="flex flex-col">
                        <Link
                          href={`/newsletters/${nl.id}`}
                          className="font-title-sm text-title-sm text-[#1b1c1a] hover:text-[#036e13] transition-colors"
                        >
                          {nl.title}
                        </Link>
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] mt-0.5">
                          {nl.subject}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-space-md text-center">
                      <StatusBadge status={nl.status} />
                    </td>
                    <td className="py-4 px-space-sm text-right font-metric-num text-title-sm font-semibold text-[#1b1c1a]">
                      {nl.total_subscribers}
                    </td>
                    <td className="py-4 px-space-sm text-right font-metric-num text-title-sm font-semibold text-[#036e13]">
                      {nl.sent_count}
                    </td>
                    <td className="py-4 px-space-md text-[#5c5e63]">
                      {nl.scheduled_at ? (
                        <div className="flex items-center gap-1.5 text-[13px] text-[#1b1c1a]">
                          <span className="material-symbols-outlined text-[15px] text-[#5c5e63]">schedule</span>
                          <span>{DateTime.fromISO(nl.scheduled_at).toFormat('dd/MM/yyyy HH:mm')}</span>
                        </div>
                      ) : (
                        <span className="text-[#a2a59e] font-label-sm text-label-sm">{t.newsletters.immediateOrDraft}</span>
                      )}
                    </td>
                    <td className="py-4 px-space-lg text-right">
                      <Link
                        href={`/newsletters/${nl.id}`}
                        className="inline-flex items-center gap-1 font-label-md text-label-md text-[#1b1c1a] hover:text-[#036e13] transition-colors py-1 px-2.5 rounded hover:bg-[#f5f3f0]"
                      >
                        <span>{t.newsletters.openAction}</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
