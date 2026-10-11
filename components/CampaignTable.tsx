'use client';

import React from 'react';
import Link from 'next/link';
import { CampaignWithStats } from '@/types/database';
import StatusBadge from './StatusBadge';
import { DateTime } from 'luxon';
import { estimateCampaignCompletion } from '@/lib/scheduling/estimate-completion';
import { getTimezoneConfig } from '@/lib/constants/timezones';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface CampaignTableProps {
  campaigns: CampaignWithStats[];
}

export default function CampaignTable({ campaigns }: CampaignTableProps) {
  const { t, locale } = useTranslation();

  if (campaigns.length === 0) {
    return (
      <div className="bg-[#ffffff] border border-[#e5e5e0] rounded-xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-[#f5f3f0] flex items-center justify-center mx-auto mb-3 text-[#5c5e63]">
          <span className="material-symbols-outlined text-[24px]">send</span>
        </div>
        <h3 className="font-headline-md text-headline-md text-[#1b1c1a] mb-1.5">{t.campaigns.emptyState}</h3>
        <p className="font-body-md text-body-md text-[#5c5e63] mb-6 max-w-md mx-auto">
          {t.campaigns.emptySubtitle}
        </p>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 px-space-md py-2.5 bg-[#30312f] text-[#f2f0ed] font-label-md text-label-md rounded-lg hover:bg-[#5c5e63] transition-colors shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>{t.campaigns.newButton}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl bg-[#ffffff] border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f5f3f0] font-label-sm text-label-sm text-[#5c5e63] uppercase tracking-wider border-b border-[#e5e5e0]">
              <th className="py-space-md px-space-lg font-semibold">{t.campaigns.colName}</th>
              <th className="py-space-md px-space-sm font-semibold text-right">{t.campaigns.colLeads}</th>
              <th className="py-space-md px-space-sm font-semibold text-right">{t.campaigns.colSent}</th>
              <th className="py-space-md px-space-sm font-semibold text-right">{t.campaigns.colPending}</th>
              <th className="py-space-md px-space-sm font-semibold text-center">{t.campaigns.colFailed}</th>
              <th className="py-space-md px-space-md font-semibold text-center">{t.campaigns.colStatus}</th>
              <th className="py-space-md px-space-md font-semibold">{t.campaigns.colNextSend}</th>
              <th className="py-space-md px-space-md font-semibold">{t.campaigns.colEstimatedEnd}</th>
              <th className="py-space-md px-space-lg font-semibold text-right">{t.campaigns.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e5e0] text-body-md font-body-md">
            {campaigns.map((camp) => {
              const est = estimateCampaignCompletion(camp);

              return (
                <tr key={camp.id} className="hover:bg-[#f5f3f0]/60 transition-colors group">
                  {/* Campagna & Meta */}
                  <td className="py-4 px-space-lg">
                    <div className="flex flex-col">
                      <Link
                        href={`/campaigns/${camp.id}`}
                        className="font-title-sm text-title-sm text-[#1b1c1a] hover:text-[#036e13] transition-colors"
                      >
                        {camp.name}
                      </Link>
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] mt-0.5">
                        {camp.subject_template
                          ? camp.subject_template.slice(0, 36) + '...'
                          : locale === 'en'
                          ? 'B2B Outbound Segment'
                          : 'Segmento Outbound B2B'}
                      </span>
                    </div>
                  </td>

                  {/* Lead Total */}
                  <td className="py-4 px-space-sm text-right font-metric-num text-title-sm font-semibold text-[#1b1c1a]">
                    {camp.total_leads}
                  </td>

                  {/* Inviati */}
                  <td className="py-4 px-space-sm text-right font-metric-num text-title-sm font-semibold text-[#036e13]">
                    {camp.sent_count}
                  </td>

                  {/* In Attesa */}
                  <td className="py-4 px-space-sm text-right font-metric-num text-title-sm text-[#5c5e63]">
                    {camp.pending_count}
                  </td>

                  {/* Falliti */}
                  <td
                    className={`py-4 px-space-sm text-center font-metric-num text-title-sm ${
                      camp.failed_count > 0 ? 'text-[#ba1a1a] font-bold' : 'text-[#5c5e63]'
                    }`}
                  >
                    {camp.failed_count > 0 ? camp.failed_count : 0}
                  </td>

                  {/* Stato */}
                  <td className="py-4 px-space-md text-center">
                    <StatusBadge status={camp.status} />
                  </td>

                  {/* Prossimo Invio */}
                  <td className="py-4 px-space-md text-secondary">
                    {camp.status === 'active' && camp.next_send_at ? (
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-[#1b1c1a] font-medium font-body-md text-[13px]">
                          <span className="material-symbols-outlined text-[15px] text-[#5c5e63]">schedule</span>
                          <span>
                            {DateTime.fromISO(camp.next_send_at).setZone(camp.timezone).toFormat('dd/MM HH:mm')}
                          </span>
                        </span>
                        <span className="font-label-sm text-[10px] text-[#5c5e63]">
                          {getTimezoneConfig(camp.timezone).shortLabel}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#a2a59e] font-label-sm text-label-sm">
                        {camp.status === 'completed' ? t.common.completed : t.common.pending}
                      </span>
                    )}
                  </td>

                  {/* Fine Stimata */}
                  <td className="py-4 px-space-md text-secondary">
                    {est.isCompleted ? (
                      <span className="font-label-sm text-label-sm text-[#036e13] font-semibold uppercase">
                        {t.common.completed}
                      </span>
                    ) : (
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-[#1b1c1a] font-body-md text-[13px]">
                          <span className="material-symbols-outlined text-[15px] text-[#5c5e63]">event</span>
                          <span>{est.label}</span>
                        </span>
                        {est.subLabel && (
                          <span className="font-label-sm text-[10px] text-[#5c5e63]">{est.subLabel}</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Azione */}
                  <td className="py-4 px-space-lg text-right">
                    <Link
                      href={`/campaigns/${camp.id}`}
                      className="inline-flex items-center gap-1 font-label-md text-label-md text-[#1b1c1a] hover:text-[#036e13] transition-colors py-1 px-2.5 rounded hover:bg-[#f5f3f0]"
                    >
                      <span>{t.campaigns.openAction}</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
