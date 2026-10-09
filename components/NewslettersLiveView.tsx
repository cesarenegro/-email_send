'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { NewsletterWithStats } from '@/types/database';
import StatusBadge from '@/components/StatusBadge';
import { Newspaper, Plus, Calendar, Clock, Users, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { DateTime } from 'luxon';

export default function NewslettersLiveView({
  initialNewsletters,
}: {
  initialNewsletters: NewsletterWithStats[];
}) {
  const [newsletters, setNewsletters] = useState<NewsletterWithStats[]>(initialNewsletters);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Newspaper className="w-6 h-6 text-[#1A1A1E]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">Newsletter Programmate</h1>
          </div>
          <p className="text-xs text-[#666666] mt-1">
            Componi e pianifica l&apos;invio di newsletter via email a liste di iscritti con monitoraggio in tempo reale.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchNewsletters}
            disabled={refreshing}
            className="p-2 rounded-lg border border-[#D8D2C8] bg-white text-[#666666] hover:text-[#1A1A1E] hover:bg-[#F7F5F0] transition-colors"
            title="Aggiorna lista"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/newsletters/new"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#1A1A1E] text-white text-sm font-semibold hover:bg-stone-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuova Newsletter</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D8D2C8] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Totale</div>
          <div className="text-2xl font-bold text-[#1A1A1E] mt-1">{totalNewsletters}</div>
        </div>
        <div className="bg-white border border-purple-200 rounded-xl p-4 shadow-sm bg-purple-50/20">
          <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Programmate</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">{scheduledCount}</div>
        </div>
        <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm bg-indigo-50/20">
          <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">In Invio</div>
          <div className="text-2xl font-bold text-indigo-900 mt-1">{sendingCount}</div>
        </div>
        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm bg-emerald-50/20">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Inviate</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{completedCount}</div>
        </div>
      </div>

      {/* Newsletters Table */}
      <div className="bg-white border border-[#D8D2C8] rounded-xl shadow-sm overflow-hidden">
        {newsletters.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Newspaper className="w-12 h-12 text-[#D8D2C8] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#1A1A1E]">Nessuna newsletter creata</h3>
            <p className="text-xs text-[#666666] max-w-sm mx-auto mt-1 mb-6">
              Inizia componendo la tua prima newsletter e programmando la data di invio.
            </p>
            <Link
              href="/newsletters/new"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#1A1A1E] text-white text-xs font-semibold hover:bg-stone-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Crea la prima Newsletter</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#D8D2C8] bg-[#F7F5F0]/60 text-xs font-semibold text-[#666666] uppercase tracking-wider">
                  <th className="py-3 px-4">Titolo & Oggetto</th>
                  <th className="py-3 px-4">Stato</th>
                  <th className="py-3 px-4">Programmazione</th>
                  <th className="py-3 px-4">Progresso Iscritti</th>
                  <th className="py-3 px-4 text-right">Azione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE1] text-sm">
                {newsletters.map((nl) => {
                  const scheduledFormatted = nl.scheduled_at
                    ? DateTime.fromISO(nl.scheduled_at).setZone(nl.timezone || 'Europe/Rome').toFormat('dd/MM/yyyy HH:mm')
                    : 'Non programmata';

                  const progressPercent = nl.total_subscribers > 0
                    ? Math.round((nl.sent_count / nl.total_subscribers) * 100)
                    : 0;

                  return (
                    <tr key={nl.id} className="hover:bg-[#F7F5F0]/30 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/newsletters/${nl.id}`} className="font-semibold text-[#1A1A1E] hover:underline block">
                          {nl.title}
                        </Link>
                        <span className="text-xs text-[#666666] block truncate max-w-xs">
                          {nl.subject || '(Nessun oggetto)'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={nl.status} />
                      </td>
                      <td className="py-3 px-4 text-xs text-[#1A1A1E]">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#666666]" />
                          <span>{scheduledFormatted}</span>
                        </div>
                        <div className="text-[11px] text-[#666666] mt-0.5">
                          Fuso: {nl.timezone || 'Europe/Rome'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-[#1A1A1E]">
                            {nl.sent_count} / {nl.total_subscribers}
                          </span>
                          <span className="text-[11px] text-[#666666]">{progressPercent}%</span>
                        </div>
                        <div className="w-32 bg-stone-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#1A1A1E] h-1.5 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/newsletters/${nl.id}`}
                          className="inline-flex items-center space-x-1 text-xs font-semibold text-[#1A1A1E] hover:underline px-2.5 py-1 rounded bg-[#F7F5F0] hover:bg-stone-200 transition-colors"
                        >
                          <span>Gestisci</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
