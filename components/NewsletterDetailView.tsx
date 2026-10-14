'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NewsletterWithStats } from '@/types/database';
import StatusBadge from '@/components/StatusBadge';
import NewsletterCsvImporter from '@/components/NewsletterCsvImporter';
import NewsletterSubscribersTable from '@/components/NewsletterSubscribersTable';
import EmailPreview from '@/components/EmailPreview';
import {
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
  Edit3,
} from 'lucide-react';
import { DateTime } from 'luxon';
import { useTranslation } from '@/lib/i18n/useTranslation';
import NewsletterForm from '@/components/NewsletterForm';

export default function NewsletterDetailView({
  initialNewsletter,
}: {
  initialNewsletter: NewsletterWithStats;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [newsletter, setNewsletter] = useState<NewsletterWithStats>(initialNewsletter);
  const [activeTab, setActiveTab] = useState<'subscribers' | 'preview'>('subscribers');
  const [showImporter, setShowImporter] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
      if (!res.ok) throw new Error(data.error || 'Failed to start');
      setActionMessage({ type: 'success', text: t.newsletters.detail.statusUpdatedSuccess });
      await fetchNewsletter();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({ type: 'error', text: msg });
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
      if (!res.ok) throw new Error(data.error || 'Failed to pause');
      setActionMessage({ type: 'success', text: t.newsletters.detail.pauseSuccess });
      await fetchNewsletter();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (!confirm(t.newsletters.detail.sendOneNowConfirm)) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}/send-now`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setActionMessage({
        type: 'success',
        text: `${t.newsletters.detail.sendOneNowSuccess} (${data.subscriber?.email || 'subscriber'})`,
      });
      await fetchNewsletter();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t.newsletters.detail.deleteConfirm))
      return;

    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error deleting newsletter');
      router.push('/newsletters');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    }
  };

  const scheduledFormatted = newsletter.scheduled_at
    ? DateTime.fromISO(newsletter.scheduled_at)
        .setZone(newsletter.timezone || 'Europe/Rome')
        .toFormat('dd/MM/yyyy HH:mm')
    : t.newsletters.detail.notScheduledManual;

  if (isEditing) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            fetchNewsletter();
          }}
          className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg border border-[#D8D2C8] bg-white text-xs font-semibold text-[#1A1A1E] hover:bg-[#F7F5F0] transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna al Dettaglio Newsletter</span>
        </button>
        <NewsletterForm initialNewsletter={newsletter} />
      </div>
    );
  }

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
              {t.newsletters.detail.subjectPrefix} <span className="font-medium text-[#1A1A1E]">{newsletter.subject}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchNewsletter}
            className="p-2 rounded-lg border border-[#D8D2C8] bg-white text-[#666666] hover:text-[#1A1A1E] transition-colors"
            title={t.newsletters.detail.refreshTitle}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsEditing(true)}
            className="p-2 rounded-lg border border-[#D8D2C8] bg-white text-[#666666] hover:text-[#1A1A1E] transition-colors"
            title="Modifica Newsletter & HTML"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* Start / Schedule or Pause */}
          {newsletter.status === 'draft' || newsletter.status === 'paused' ? (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{newsletter.scheduled_at ? t.newsletters.detail.activateSchedule : t.newsletters.detail.startDispatch}</span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
              <span>{t.newsletters.detail.pause}</span>
            </button>
          )}

          {/* Immediate Send 1 */}
          <button
            onClick={handleSendNow}
            disabled={actionLoading || newsletter.pending_count === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#1A1A1E] text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-40 transition-colors shadow-sm"
            title={t.newsletters.detail.sendOneNowTitle}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t.newsletters.detail.sendOneNow}</span>
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
            title={t.newsletters.detail.deleteButton}
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
            {t.newsletters.detail.scheduleBanner} <strong className="text-[#1A1A1E]">{scheduledFormatted}</strong> ({newsletter.timezone || 'Europe/Rome'})
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[#1A1A1E]" />
          <span>
            {t.newsletters.detail.intervalBanner} <strong className="text-[#1A1A1E]">{newsletter.send_interval_seconds}s</strong>
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D8D2C8] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-[#666666] uppercase tracking-wider">{t.newsletters.detail.totalSubscribers}</div>
          <div className="text-2xl font-bold text-[#1A1A1E] mt-1">{newsletter.total_subscribers}</div>
        </div>
        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm bg-emerald-50/20">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">{t.newsletters.detail.sent}</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{newsletter.sent_count}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm bg-stone-50/40">
          <div className="text-xs font-semibold text-stone-600 uppercase tracking-wider">{t.newsletters.detail.pending}</div>
          <div className="text-2xl font-bold text-stone-800 mt-1">{newsletter.pending_count}</div>
        </div>
        <div className="bg-white border border-rose-200 rounded-xl p-4 shadow-sm bg-rose-50/20">
          <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">{t.newsletters.detail.failed}</div>
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
            <span>{t.newsletters.detail.subscribersTab} ({newsletter.total_subscribers})</span>
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
            <span>{t.newsletters.detail.previewTab}</span>
          </button>
        </div>

        {activeTab === 'subscribers' && (
          <button
            onClick={() => setShowImporter(!showImporter)}
            className="mb-2 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#D8D2C8] bg-white text-xs font-semibold text-[#1A1A1E] hover:bg-[#F7F5F0] transition-colors shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{showImporter ? t.newsletters.detail.hideCsvBtn : t.newsletters.detail.importCsvBtn}</span>
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
            {t.newsletters.detail.previewNotice}
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
