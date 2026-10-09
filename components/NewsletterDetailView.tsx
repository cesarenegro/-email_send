'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NewsletterWithStats } from '@/types/database';
import StatusBadge from '@/components/StatusBadge';
import NewsletterCsvImporter from '@/components/NewsletterCsvImporter';
import NewsletterSubscribersTable from '@/components/NewsletterSubscribersTable';
import EmailPreview from '@/components/EmailPreview';
import {
  Newspaper,
  Calendar,
  Clock,
  Play,
  Pause,
  Send,
  Trash2,
  UploadCloud,
  Eye,
  Users,
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { DateTime } from 'luxon';

export default function NewsletterDetailView({
  initialNewsletter,
}: {
  initialNewsletter: NewsletterWithStats;
}) {
  const router = useRouter();
  const [newsletter, setNewsletter] = useState<NewsletterWithStats>(initialNewsletter);
  const [activeTab, setActiveTab] = useState<'subscribers' | 'preview'>('subscribers');
  const [showImporter, setShowImporter] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchNewsletter = async () => {
    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}`);
      if (res.ok) {
        const data = await res.json();
        setNewsletter(data);
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Error refreshing newsletter detail:', err);
    }
  };

  const handleStart = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impossibile avviare la newsletter');
      setActionMessage({ type: 'success', text: 'Stato aggiornato con successo!' });
      await fetchNewsletter();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}/pause`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impossibile mettere in pausa');
      setActionMessage({ type: 'success', text: 'Newsletter messa in pausa.' });
      await fetchNewsletter();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (!confirm('Vuoi inviare immediatamente 1 email al prossimo iscritto in lista?')) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}/send-now`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante l’invio manuale');
      setActionMessage({
        type: 'success',
        text: `Inviata 1 email con successo a: ${data.subscriber?.email || 'iscritto'}!`,
      });
      await fetchNewsletter();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questa newsletter e tutti i suoi iscritti? L’operazione è irreversibile.'))
      return;

    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore durante l’eliminazione');
      router.push('/newsletters');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const scheduledFormatted = newsletter.scheduled_at
    ? DateTime.fromISO(newsletter.scheduled_at)
        .setZone(newsletter.timezone || 'Europe/Rome')
        .toFormat('dd/MM/yyyy HH:mm')
    : 'Non programmata (invio manuale)';

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/newsletters')}
            className="p-2 rounded-lg border border-[#D8D2C8] bg-white text-[#666666] hover:text-[#1A1A1E] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">{newsletter.title}</h1>
              <StatusBadge status={newsletter.status} />
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Oggetto: <span className="font-medium text-[#1A1A1E]">{newsletter.subject}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchNewsletter}
            className="p-2 rounded-lg border border-[#D8D2C8] bg-white text-[#666666] hover:text-[#1A1A1E] transition-colors"
            title="Aggiorna dati"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Start / Schedule or Pause */}
          {newsletter.status === 'draft' || newsletter.status === 'paused' ? (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{newsletter.scheduled_at ? 'Attiva Programmazione' : 'Avvia Invio'}</span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
              <span>Metti in Pausa</span>
            </button>
          )}

          {/* Immediate Send 1 */}
          <button
            onClick={handleSendNow}
            disabled={actionLoading || newsletter.pending_count === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#1A1A1E] text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-40 transition-colors shadow-sm"
            title="Invia subito 1 email di prova al prossimo iscritto in lista"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Invia 1 Ora</span>
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
            title="Elimina Newsletter"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center space-x-2 border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Schedule Info Banner */}
      <div className="bg-stone-100/70 border border-[#D8D2C8] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-[#666666] gap-2">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-[#1A1A1E]" />
          <span>
            Programmazione: <strong className="text-[#1A1A1E]">{scheduledFormatted}</strong> ({newsletter.timezone || 'Europe/Rome'})
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[#1A1A1E]" />
          <span>
            Intervallo: <strong className="text-[#1A1A1E]">{newsletter.send_interval_seconds}s</strong> tra ciascun iscritto
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D8D2C8] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Iscritti Totali</div>
          <div className="text-2xl font-bold text-[#1A1A1E] mt-1">{newsletter.total_subscribers}</div>
        </div>
        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm bg-emerald-50/20">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Inviati</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{newsletter.sent_count}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm bg-stone-50/40">
          <div className="text-xs font-semibold text-stone-600 uppercase tracking-wider">In Attesa</div>
          <div className="text-2xl font-bold text-stone-800 mt-1">{newsletter.pending_count}</div>
        </div>
        <div className="bg-white border border-rose-200 rounded-xl p-4 shadow-sm bg-rose-50/20">
          <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Falliti</div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{newsletter.failed_count}</div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="border-b border-[#D8D2C8] flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'subscribers'
                ? 'border-[#1A1A1E] text-[#1A1A1E]'
                : 'border-transparent text-[#666666] hover:text-[#1A1A1E]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Iscritti ({newsletter.total_subscribers})</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-[#1A1A1E] text-[#1A1A1E]'
                : 'border-transparent text-[#666666] hover:text-[#1A1A1E]'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Anteprima Email</span>
          </button>
        </div>

        {activeTab === 'subscribers' && (
          <button
            onClick={() => setShowImporter(!showImporter)}
            className="mb-2 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#D8D2C8] bg-white text-xs font-semibold text-[#1A1A1E] hover:bg-[#F7F5F0] transition-colors shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{showImporter ? 'Nascondi Import CSV' : 'Importa CSV Iscritti'}</span>
          </button>
        )}
      </div>

      {/* Tab 1: Subscribers & CSV Import */}
      {activeTab === 'subscribers' && (
        <div className="space-y-6">
          {showImporter && (
            <NewsletterCsvImporter
              newsletterId={newsletter.id}
              onImportCompleted={() => {
                fetchNewsletter();
                setShowImporter(false);
              }}
              onClose={() => setShowImporter(false)}
            />
          )}

          <NewsletterSubscribersTable
            newsletterId={newsletter.id}
            refreshTrigger={refreshTrigger}
          />
        </div>
      )}

      {/* Tab 2: HTML Email Preview */}
      {activeTab === 'preview' && (
        <div className="bg-white border border-[#D8D2C8] rounded-xl p-5 shadow-sm space-y-4">
          <div className="text-xs text-[#666666] pb-2 border-b border-[#F0EBE1]">
            Anteprima renderizzata del messaggio con dati di esempio:
          </div>
          <div className="border border-[#D8D2C8] rounded-lg overflow-hidden bg-white p-2">
            <EmailPreview
              htmlTemplate={newsletter.html_content}
              sampleData={{
                email: 'mario.rossi@example.com',
                company_name: 'Mario Rossi',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
