'use client';

import React from 'react';
import Link from 'next/link';
import { CampaignWithStats } from '@/types/database';
import StatusBadge from './StatusBadge';
import { ArrowRight, Calendar, Clock } from 'lucide-react';
import { DateTime } from 'luxon';
import { estimateCampaignCompletion } from '@/lib/scheduling/estimate-completion';
import { getTimezoneConfig } from '@/lib/constants/timezones';


interface CampaignTableProps {
  campaigns: CampaignWithStats[];
}

export default function CampaignTable({ campaigns }: CampaignTableProps) {
  if (campaigns.length === 0) {
    return (
      <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-12 text-center">
        <h3 className="text-base font-medium text-[#1A1A1E] mb-2">Nessuna campagna creata</h3>
        <p className="text-sm text-[#666666] mb-6">
          Inizia creando la tua prima campagna email per importare i lead da CSV.
        </p>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center px-4 py-2 bg-[#1A1A1E] text-white text-sm font-medium rounded hover:bg-[#333333] transition-colors"
        >
          Crea Nuova Campagna
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F7F5F0] border-b border-[#D8D2C8] text-xs uppercase text-[#666666]">
            <tr>
              <th className="px-5 py-3 font-semibold">Campagna</th>
              <th className="px-5 py-3 font-semibold text-right">Lead</th>
              <th className="px-5 py-3 font-semibold text-right">Inviati</th>
              <th className="px-5 py-3 font-semibold text-right">In Attesa</th>
              <th className="px-5 py-3 font-semibold text-right">Falliti</th>
              <th className="px-5 py-3 font-semibold text-center">Stato</th>
              <th className="px-5 py-3 font-semibold">Prossimo Invio</th>
              <th className="px-5 py-3 font-semibold">Fine Stimata</th>
              <th className="px-5 py-3 font-semibold text-right">Azione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D2C8]">
            {campaigns.map((camp) => {
              const est = estimateCampaignCompletion(camp);

              return (
                <tr key={camp.id} className="hover:bg-[#F7F5F0] transition-colors">
                  <td className="px-5 py-3 font-medium text-[#1A1A1E]">
                    <Link href={`/campaigns/${camp.id}`} className="hover:underline">
                      {camp.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-[#1A1A1E]">{camp.total_leads}</td>
                  <td className="px-5 py-3 text-right font-mono text-emerald-700 font-medium">
                    {camp.sent_count}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-[#666666]">{camp.pending_count}</td>
                  <td className="px-5 py-3 text-right font-mono text-rose-600">
                    {camp.failed_count > 0 ? camp.failed_count : 0}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <StatusBadge status={camp.status} />
                  </td>
                  <td className="px-5 py-3 text-xs text-[#666666]">
                    {camp.status === 'active' && camp.next_send_at ? (
                      <div className="space-y-0.5">
                        <span className="flex items-center space-x-1 text-[#1A1A1E] font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#666666]" />
                          <span>
                            {DateTime.fromISO(camp.next_send_at).setZone(camp.timezone).toFormat('dd/MM HH:mm')}
                          </span>
                        </span>
                        <span className="text-[10px] text-[#888888] font-medium block">
                          {getTimezoneConfig(camp.timezone).shortLabel}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#999999]">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {est.isCompleted ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Completata
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5 font-medium text-[#1A1A1E]">
                          <Calendar className="w-3.5 h-3.5 text-[#666666] shrink-0" />
                          <span>{est.label}</span>
                        </div>
                        {est.subLabel && (
                          <span className="text-[11px] text-[#666666] block">
                            {est.subLabel}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/campaigns/${camp.id}`}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-[#1A1A1E] text-white text-xs font-medium rounded hover:bg-[#333333] transition-colors"
                    >
                      <span>Apri</span>
                      <ArrowRight className="w-3 h-3" />
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
