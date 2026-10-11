'use client';

import React from 'react';
import { CampaignStatus, LeadStatus } from '@/types/database';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface StatusBadgeProps {
  status: CampaignStatus | LeadStatus | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const normalized = status.toLowerCase();

  switch (normalized) {
    case 'active':
    case 'sending':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ecf8eb] text-[#036e13] font-label-sm text-[10px] font-bold tracking-wider uppercase border border-[#5cb855]/30 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855] animate-pulse"></span>
          <span>{normalized === 'sending' ? t.common.sending : t.common.active}</span>
        </span>
      );

    case 'completed':
    case 'sent':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dedfe5]/70 text-[#1b1c1a] font-label-sm text-[10px] font-semibold tracking-wider uppercase border border-[#bfcab8]">
          <span className="material-symbols-outlined text-[13px] text-[#036e13]">check</span>
          <span>{normalized === 'sent' ? t.common.sent : t.common.completed}</span>
        </span>
      );

    case 'paused':
    case 'retry':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#fff7ed] text-[#c2410c] font-label-sm text-[10px] font-semibold tracking-wider uppercase border border-[#ffedd5]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c2410c]"></span>
          <span>{normalized === 'retry' ? t.common.retry : t.common.paused}</span>
        </span>
      );

    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] font-label-sm text-[10px] font-bold tracking-wider uppercase border border-[#ffb4ab]">
          <span className="material-symbols-outlined text-[13px] text-[#ba1a1a]">error</span>
          <span>{t.common.failed}</span>
        </span>
      );

    case 'scheduled':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dedfe5] text-[#1b1c1a] font-label-sm text-[10px] font-semibold tracking-wider uppercase border border-[#bfcab8]">
          <span className="material-symbols-outlined text-[13px] text-[#5c5e63]">schedule</span>
          <span>{t.common.scheduled}</span>
        </span>
      );

    case 'draft':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f5f3f0] text-[#5c5e63] font-label-sm text-[10px] font-semibold tracking-wider uppercase border border-[#e5e5e0]">
          <span>{t.common.draft}</span>
        </span>
      );

    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f5f3f0] text-[#5c5e63] font-label-sm text-[10px] font-semibold tracking-wider uppercase border border-[#e5e5e0]">
          <span>{t.common.pending}</span>
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f5f3f0] text-[#5c5e63] font-label-sm text-[10px] font-semibold tracking-wider uppercase border border-[#e5e5e0]">
          <span>{status}</span>
        </span>
      );
  }
}
