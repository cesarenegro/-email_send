import React from 'react';
import { CampaignStatus, LeadStatus } from '@/types/database';

interface StatusBadgeProps {
  status: CampaignStatus | LeadStatus | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  const getStyle = () => {
    switch (normalized) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'sent':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'paused':
      case 'retry':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'sending':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'draft':
      case 'pending':
      default:
        return 'bg-neutral-100 text-neutral-700 border-[#D8D2C8]';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${getStyle()}`}
    >
      {status}
    </span>
  );
}
