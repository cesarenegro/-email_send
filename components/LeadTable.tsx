'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CampaignLead } from '@/types/database';
import StatusBadge from './StatusBadge';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface LeadTableProps {
  campaignId: string;
  timezone?: string;
  onBouncesSynced?: () => void;
}

export default function LeadTable({ campaignId, timezone = 'Europe/Rome', onBouncesSynced }: LeadTableProps) {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncingBounces, setSyncingBounces] = useState(false);
  const [bounceResult, setBounceResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const offset = page * pageSize;
      const res = await fetch(
        `/api/campaigns/${campaignId}/leads?limit=${pageSize}&offset=${offset}&status=${statusFilter}`
      );
      const data = await res.json();
      if (res.ok) {
        setLeads(data.leads || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const totalPages = Math.ceil(total / pageSize);

  const isStuck = (lead: CampaignLead) => {
    if (lead.status !== 'sending') return false;
    const updated = DateTime.fromISO(lead.updated_at);
    return DateTime.now().diff(updated, 'minutes').minutes > 30;
  };

  const handleSyncBounces = async () => {
    setSyncingBounces(true);
    setBounceResult(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/sync-bounces`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bounce sync error');
      
      setBounceResult({
        type: 'success',
        message: data.message || `Sync completed: ${data.leadsUpdated} leads updated.`,
      });
      await fetchLeads();
      if (onBouncesSynced) {
        onBouncesSynced();
      }
    } catch (err: any) {
      setBounceResult({
        type: 'error',
        message: err.message || 'Error syncing bounces',
      });
    } finally {
      setSyncingBounces(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg shadow-sm overflow-hidden">
      {/* Bounce sync feedback alert */}
      {bounceResult && (
        <div
          className={`px-4 py-2.5 text-xs border-b flex items-center justify-between ${
            bounceResult.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {bounceResult.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{bounceResult.message}</span>
          </div>
          <button
            onClick={() => setBounceResult(null)}
            className="text-xs font-semibold hover:opacity-75 ml-3"
          >
            ✕
          </button>
        </div>
      )}

      <div className="p-4 border-b border-[#D8D2C8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <h3 className="text-base font-semibold text-[#1A1A1E]">{t.campaigns.leadsTable.title}</h3>
          <span className="text-xs bg-[#F7F5F0] border border-[#D8D2C8] px-2 py-0.5 rounded text-[#666666]">
            {total}
          </span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-y-2">
          <button
            onClick={handleSyncBounces}
            disabled={syncingBounces || loading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-amber-300 rounded text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 transition-colors shadow-xs"
            title="IMAP Bounce Sync"
          >
            {syncingBounces ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            )}
            <span>{syncingBounces ? t.campaigns.leadsTable.syncingBounces : t.campaigns.leadsTable.syncBounces}</span>
          </button>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] focus:outline-none"
          >
            <option value="all">{t.campaigns.leadsTable.filterAll}</option>
            <option value="pending">{t.campaigns.leadsTable.filterPending}</option>
            <option value="sending">{t.campaigns.leadsTable.filterSending}</option>
            <option value="sent">{t.campaigns.leadsTable.filterSent}</option>
            <option value="failed">{t.campaigns.leadsTable.filterFailed}</option>
          </select>

          <button
            onClick={fetchLeads}
            disabled={loading}
            className="p-1.5 border border-[#D8D2C8] rounded text-[#666666] hover:text-[#1A1A1E] hover:bg-[#F7F5F0]"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F7F5F0] border-b border-[#D8D2C8] text-xs uppercase text-[#666666]">
            <tr>
              <th className="px-4 py-3 font-semibold">{t.campaigns.leadsTable.colCompany}</th>
              <th className="px-4 py-3 font-semibold">{t.campaigns.leadsTable.colEmail}</th>
              <th className="px-4 py-3 font-semibold">{t.campaigns.leadsTable.colStatus}</th>
              <th className="px-4 py-3 font-semibold">{t.campaigns.leadsTable.colSentAt}</th>
              <th className="px-4 py-3 font-semibold">{t.campaigns.colJitter}</th>
              <th className="px-4 py-3 font-semibold">{t.campaigns.leadsTable.colError}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D2C8]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#666666]">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  {t.campaigns.leadsTable.loading}
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#666666]">
                  {t.campaigns.leadsTable.noLeads}
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#F7F5F0]">
                  <td className="px-4 py-2.5 font-medium text-[#1A1A1E]">
                    {lead.company_name || <span className="text-[#999999] italic">-</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#1A1A1E]">{lead.email}</td>
                  <td className="px-4 py-2.5">
                    {isStuck(lead) ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {t.campaigns.leadsTable.stuckBadge}
                      </span>
                    ) : (
                      <StatusBadge status={lead.status} />
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#666666]">
                    {lead.sent_at
                      ? DateTime.fromISO(lead.sent_at).setZone(timezone).toFormat('dd/MM/yyyy HH:mm:ss')
                      : t.campaigns.leadsTable.waitingToSend}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#666666]">{lead.attempts}</td>
                  <td className="px-4 py-2.5 text-xs text-rose-600 max-w-xs truncate" title={lead.last_error || ''}>
                    {lead.last_error || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-[#D8D2C8] bg-[#F7F5F0] flex items-center justify-between text-xs text-[#666666]">
          <span>
            {t.campaigns.leadsTable.page} {page + 1} {t.campaigns.leadsTable.of} {totalPages}
          </span>
          <div className="flex space-x-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="p-1 rounded border border-[#D8D2C8] bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="p-1 rounded border border-[#D8D2C8] bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
