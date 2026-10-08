'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CampaignLead } from '@/types/database';
import StatusBadge from './StatusBadge';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { DateTime } from 'luxon';

interface LeadTableProps {
  campaignId: string;
  timezone?: string;
}

export default function LeadTable({ campaignId, timezone = 'Europe/Rome' }: LeadTableProps) {
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#D8D2C8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <h3 className="text-base font-semibold text-[#1A1A1E]">Contatti della Campagna</h3>
          <span className="text-xs bg-[#F7F5F0] border border-[#D8D2C8] px-2 py-0.5 rounded text-[#666666]">
            {total} totali
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] focus:outline-none"
          >
            <option value="all">Tutti gli stati</option>
            <option value="pending">In attesa (pending)</option>
            <option value="sending">In invio (sending)</option>
            <option value="sent">Inviati (sent)</option>
            <option value="retry">In riprova (retry)</option>
            <option value="failed">Falliti (failed)</option>
          </select>

          <button
            onClick={fetchLeads}
            disabled={loading}
            className="p-1.5 border border-[#D8D2C8] rounded text-[#666666] hover:text-[#1A1A1E] hover:bg-[#F7F5F0]"
            title="Aggiorna lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F7F5F0] border-b border-[#D8D2C8] text-xs uppercase text-[#666666]">
            <tr>
              <th className="px-4 py-3 font-semibold">Azienda</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Stato</th>
              <th className="px-4 py-3 font-semibold">Inviato il</th>
              <th className="px-4 py-3 font-semibold">Tentativi</th>
              <th className="px-4 py-3 font-semibold">Note / Errore</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D2C8]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#666666]">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Caricamento contatti...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#666666]">
                  Nessun contatto presente in questa lista.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#F7F5F0]">
                  <td className="px-4 py-2.5 font-medium text-[#1A1A1E]">
                    {lead.company_name || <span className="text-[#999999] italic">Nessun nome</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#1A1A1E]">{lead.email}</td>
                  <td className="px-4 py-2.5">
                    {isStuck(lead) ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        STUCK
                      </span>
                    ) : (
                      <StatusBadge status={lead.status} />
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#666666]">
                    {lead.sent_at
                      ? DateTime.fromISO(lead.sent_at).setZone(timezone).toFormat('dd/MM/yyyy HH:mm:ss')
                      : '-'}
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
            Pagina {page + 1} di {totalPages}
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
