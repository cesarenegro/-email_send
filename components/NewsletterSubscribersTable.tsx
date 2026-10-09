'use client';

import React, { useState, useEffect } from 'react';
import { NewsletterSubscriber } from '@/types/database';
import StatusBadge from '@/components/StatusBadge';
import { Users, Filter, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { DateTime } from 'luxon';

interface NewsletterSubscribersTableProps {
  newsletterId: string;
  refreshTrigger: number;
}

export default function NewsletterSubscribersTable({
  newsletterId,
  refreshTrigger,
}: NewsletterSubscribersTableProps) {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const url = `/api/newsletters/${newsletterId}/subscribers?page=${page}&limit=50&status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data.subscribers || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching subscribers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, [newsletterId, statusFilter, page, refreshTrigger]);

  return (
    <div className="bg-white border border-[#D8D2C8] rounded-xl shadow-sm overflow-hidden space-y-4 p-5">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#F0EBE1]">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-[#1A1A1E]" />
          <h3 className="text-sm font-bold text-[#1A1A1E]">Elenco Iscritti ({totalCount})</h3>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 bg-[#F7F5F0] p-1 rounded-lg text-xs">
          {[
            { id: 'all', label: 'Tutti' },
            { id: 'pending', label: 'In Attesa' },
            { id: 'sent', label: 'Inviati' },
            { id: 'failed', label: 'Falliti' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-white text-[#1A1A1E] font-semibold shadow-xs'
                  : 'text-[#666666] hover:text-[#1A1A1E]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 flex justify-center items-center text-[#666666] text-xs">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span>Caricamento iscritti...</span>
        </div>
      ) : subscribers.length === 0 ? (
        <div className="text-center py-10 text-xs text-[#666666]">
          Nessun iscritto trovato per questo filtro.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D8D2C8] text-[#666666] uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Nome</th>
                <th className="py-2.5 px-3">Stato</th>
                <th className="py-2.5 px-3">Data Invio / Errore</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE1]">
              {subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-[#F7F5F0]/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-[#1A1A1E]">{sub.email}</td>
                  <td className="py-2.5 px-3 text-[#666666]">{sub.name || '-'}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="py-2.5 px-3 text-[#666666]">
                    {sub.sent_at ? (
                      DateTime.fromISO(sub.sent_at).toFormat('dd/MM/yyyy HH:mm:ss')
                    ) : sub.last_error ? (
                      <span className="text-rose-600 flex items-center gap-1" title={sub.last_error}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-xs">{sub.last_error}</span>
                      </span>
                    ) : (
                      'In attesa di invio'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-[#F0EBE1] text-xs text-[#666666]">
          <span>
            Pagina <span className="font-semibold text-[#1A1A1E]">{page}</span> di{' '}
            <span className="font-semibold text-[#1A1A1E]">{totalPages}</span>
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-[#D8D2C8] hover:bg-[#F7F5F0] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-[#D8D2C8] hover:bg-[#F7F5F0] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
