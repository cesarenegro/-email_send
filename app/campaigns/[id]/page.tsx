'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CampaignWithStats, CampaignLead } from '@/types/database';
import { CampaignInput } from '@/lib/validations/campaign';
import StatusBadge from '@/components/StatusBadge';
import CampaignForm from '@/components/CampaignForm';
import CsvImporter from '@/components/CsvImporter';
import EmailPreview from '@/components/EmailPreview';
import LeadTable from '@/components/LeadTable';
import { DateTime } from 'luxon';
import { estimateCampaignCompletion } from '@/lib/scheduling/estimate-completion';
import { getTimezoneConfig } from '@/lib/constants/timezones';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function CampaignDetailPage() {
  const { t, locale } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<CampaignWithStats | null>(null);
  const [sampleLeads, setSampleLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'leads' | 'preview'>('preview');
  const [showImporter, setShowImporter] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [liveFormData, setLiveFormData] = useState<Partial<CampaignInput> | null>(null);

  const fetchCampaignData = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (res.ok) {
        setCampaign(data);
      }

      // Fetch sample leads for preview
      const leadsRes = await fetch(`/api/campaigns/${id}/leads?limit=30`);
      const leadsData = await leadsRes.json();
      if (leadsRes.ok) {
        setSampleLeads(leadsData.leads || []);
      }
    } catch (err: any) {
      console.error('Error fetching campaign details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

  // Only auto-poll if the campaign is currently ACTIVE (running and dispatching emails)
  useEffect(() => {
    if (campaign?.status !== 'active') return;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchCampaignData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchCampaignData, campaign?.status]);

  const handleStart = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (locale === 'en' ? 'Unable to start campaign' : 'Impossibile avviare la campagna'));
      setMessage({
        type: 'success',
        text: locale === 'en' ? 'Campaign started! Cron will dispatch emails according to the scheduled intervals.' : 'Campagna avviata! Il cron invierà le email secondo gli intervalli.',
      });
      fetchCampaignData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNow = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/send-now`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (locale === 'en' ? 'Error during immediate send' : "Errore durante l'invio immediato"));
      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message || (locale === 'en' ? 'Email sent successfully!' : 'Invio eseguito con successo!'),
      });
      fetchCampaignData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/pause`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (locale === 'en' ? 'Unable to pause campaign' : 'Impossibile mettere in pausa la campagna'));
      setMessage({
        type: 'success',
        text: locale === 'en' ? 'Campaign paused. No emails will be dispatched.' : 'Campagna messa in pausa. Nessun invio verrà effettuato.',
      });
      fetchCampaignData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/resume`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (locale === 'en' ? 'Unable to resume campaign' : 'Impossibile riprendere la campagna'));
      setMessage({
        type: 'success',
        text: locale === 'en' ? 'Campaign resumed! Dispatch cycles restart regularly from now.' : 'Campagna ripresa! Gli invii ripartono regolarmente da adesso.',
      });
      fetchCampaignData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t.campaigns.detail.deleteConfirm)) {
      return;
    }

    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (locale === 'en' ? 'Unable to delete campaign' : 'Impossibile eliminare la campagna'));
      router.push('/campaigns');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setActionLoading(false);
    }
  };

  const handleUpdate = async (formData: any) => {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || (locale === 'en' ? 'Error saving changes' : 'Errore salvataggio modifiche'));
    setMessage({
      type: 'success',
      text: locale === 'en' ? 'Changes saved successfully' : 'Modifiche salvate con successo',
    });
    fetchCampaignData();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-[#5c5e63]">
        <span className="material-symbols-outlined text-[24px] animate-spin mr-2 text-[#036e13]">sync</span>
        <span>{t.campaigns.detail.loadingCampaign}</span>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <h2 className="font-headline-md text-headline-md text-[#1b1c1a]">{t.campaigns.detail.campaignNotFound}</h2>
        <Link href="/campaigns" className="text-body-md text-[#5c5e63] hover:underline mt-2 inline-block">
          {t.campaigns.detail.backToCampaigns}
        </Link>
      </div>
    );
  }

  const isActive = campaign.status === 'active';
  const isPaused = campaign.status === 'paused';
  const isDraft = campaign.status === 'draft';
  const est = estimateCampaignCompletion(campaign);
  const sentPercent =
    campaign.total_leads > 0 ? Math.round((campaign.sent_count / campaign.total_leads) * 100) : 0;

  return (
    <div className="relative w-full overflow-hidden px-gutter pb-space-xl pt-space-md flex flex-col gap-space-lg">
      {/* Decorative glow */}
      <div className="absolute top-0 right-1/4 -z-10 w-96 h-96 rounded-full bg-[#5cb855]/10 blur-3xl pointer-events-none"></div>

      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-md">
        <div className="flex flex-col">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1 font-label-sm text-label-sm text-[#5c5e63] hover:text-[#1b1c1a] transition-colors mb-1.5"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            <span>{t.campaigns.detail.backButton}</span>
          </Link>
          <div className="flex items-center gap-space-sm flex-wrap">
            <h1 className="font-headline-xl text-headline-xl text-[#1b1c1a] tracking-tight">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-space-sm">
          {/* Send Now Button (Immediate Send) */}
          {campaign.pending_count > 0 && campaign.status !== 'completed' && (
            <button
              onClick={handleSendNow}
              disabled={actionLoading}
              className="h-10 px-space-md bg-[#5cb855] hover:bg-[#4ea547] text-[#ffffff] font-label-md text-label-md font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
              title={t.campaigns.detail.sendNowButton}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              <span>{actionLoading ? t.campaigns.detail.sendingNow : t.campaigns.detail.sendNowButton}</span>
            </button>
          )}

          {isDraft && (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="h-10 px-space-md bg-[#30312f] text-[#f2f0ed] hover:bg-[#5c5e63] font-label-md text-label-md font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
              title={t.campaigns.detail.startCycle}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              <span>{t.campaigns.detail.startCycle}</span>
            </button>
          )}

          {isActive && (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="h-10 px-space-md bg-[#fff7ed] hover:bg-[#ffedd5] text-[#c2410c] border border-[#ffedd5] font-label-md text-label-md font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">pause</span>
              <span>{t.campaigns.detail.pauseCycle}</span>
            </button>
          )}

          {isPaused && (
            <button
              onClick={handleResume}
              disabled={actionLoading}
              className="h-10 px-space-md bg-[#036e13] hover:bg-[#02520e] text-[#ffffff] font-label-md text-label-md font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">replay</span>
              <span>{t.campaigns.detail.resumeCycle}</span>
            </button>
          )}

          {!isActive && (
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="h-10 px-space-sm border border-[#e5e5e0] text-[#ba1a1a] hover:bg-[#ffdad6]/40 font-label-md text-label-md rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title={t.campaigns.detail.deleteButton}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span>{t.campaigns.detail.deleteButton}</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Alert if any */}
      {message && (
        <div
          className={`p-space-sm rounded-lg flex items-center gap-space-sm font-body-md text-body-md border ${
            message.type === 'success'
              ? 'bg-[#ecf8eb] border-[#5cb855]/30 text-[#036e13]'
              : 'bg-[#ffdad6] border-[#ffb4ab] text-[#ba1a1a]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {message.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{message.text}</span>
        </div>
      )}

      {/* 4 Key KPI Metrics Cards (with bottom accent lines) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
        {/* Card 1: Contatti Totali */}
        <div className="bg-[#ffffff] p-5 rounded-lg border border-[#e5e5e0] shadow-xs flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="flex items-center justify-between text-[#5c5e63]">
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">{t.campaigns.detail.leadsTotal}</span>
            <span className="material-symbols-outlined text-[18px]">group</span>
          </div>
          <div>
            <div className="font-metric-num text-metric-num text-[#1b1c1a]">{campaign.total_leads}</div>
            <div className="font-label-sm text-label-sm text-[#5c5e63] mt-0.5">
              {locale === 'en' ? 'Imported recipients' : 'Destinatari importati'}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#efeeeb]">
            <div className="h-full bg-[#30312f]" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Card 2: Inviati */}
        <div className="bg-[#ffffff] p-5 rounded-lg border border-[#e5e5e0] shadow-xs flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="flex items-center justify-between text-[#5c5e63]">
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">{t.campaigns.detail.leadsSent}</span>
            <span className="material-symbols-outlined text-[18px] text-[#036e13]">mark_email_read</span>
          </div>
          <div>
            <div className="font-metric-num text-metric-num text-[#036e13]">{campaign.sent_count}</div>
            <div className="font-label-sm text-label-sm text-[#5c5e63] mt-0.5">
              {sentPercent}% {locale === 'en' ? 'delivered via TLS' : 'recapitati via TLS'}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#efeeeb]">
            <div className="h-full bg-[#5cb855]" style={{ width: `${Math.max(5, sentPercent)}%` }}></div>
          </div>
        </div>

        {/* Card 3: In Attesa */}
        <div className="bg-[#ffffff] p-5 rounded-lg border border-[#e5e5e0] shadow-xs flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="flex items-center justify-between text-[#5c5e63]">
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">{t.campaigns.detail.leadsPending}</span>
            <span className="material-symbols-outlined text-[18px] text-[#5c5e63]">hourglass_empty</span>
          </div>
          <div>
            <div className="font-metric-num text-metric-num text-[#1b1c1a]">{campaign.pending_count}</div>
            <div className="font-label-sm text-label-sm text-[#5c5e63] mt-0.5">
              {campaign.pending_count === 0
                ? (locale === 'en' ? 'Buffer queue cleared' : 'Coda buffer svuotata')
                : (locale === 'en' ? 'Waiting for cron beat' : 'In attesa del cron beat')}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#efeeeb]">
            <div
              className="h-full bg-[#eae8e5]"
              style={{
                width: `${campaign.total_leads > 0 ? (campaign.pending_count / campaign.total_leads) * 100 : 0}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Card 4: Falliti / Bounce */}
        <div className="bg-[#ffffff] p-5 rounded-lg border border-[#e5e5e0] shadow-xs flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="flex items-center justify-between text-[#5c5e63]">
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              {t.campaigns.detail.leadsFailed}
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">warning</span>
          </div>
          <div>
            <div
              className={`font-metric-num text-metric-num ${
                campaign.failed_count > 0 ? 'text-[#ba1a1a]' : 'text-[#1b1c1a]'
              }`}
            >
              {campaign.failed_count}
            </div>
            <div className="font-label-sm text-label-sm text-[#5c5e63] mt-0.5">
              {campaign.failed_count === 0
                ? (locale === 'en' ? '0.0% error rate' : '0.0% tasso di errore')
                : (locale === 'en' ? 'Check bounce logs' : 'Controllare i log di rimbalzo')}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#efeeeb]">
            <div
              className="h-full bg-[#ba1a1a]"
              style={{
                width: `${campaign.total_leads > 0 ? (campaign.failed_count / campaign.total_leads) * 100 : 0}%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Schedule & Dispatch Window Ribbon */}
      <div className="bg-[#f5f3f0] px-space-md py-3 rounded-lg border border-[#e5e5e0] flex flex-wrap items-center justify-between gap-space-sm shadow-xs">
        <div className="flex items-center flex-wrap gap-x-space-md gap-y-1 font-body-md text-body-md text-[#1b1c1a]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#036e13] text-[18px]">schedule</span>
            <span className="text-[#5c5e63] font-label-md text-label-md">
              {locale === 'en' ? 'Next scheduled send:' : 'Prossimo invio programmato:'}
            </span>
            <span className="font-semibold">
              {isActive && campaign.next_send_at
                ? DateTime.fromISO(campaign.next_send_at)
                    .setZone(campaign.timezone)
                    .toFormat('dd/MM/yyyy HH:mm:ss')
                : t.common.pending}
              {' '}({getTimezoneConfig(campaign.timezone).shortLabel})
            </span>
          </div>
          <div className="hidden sm:inline-block text-[#dedfe5]">•</div>
          <div className="text-[#5c5e63] font-label-md text-label-md">
            {locale === 'en' ? 'Active window:' : 'Finestra attiva:'}{' '}
            <span className="text-[#1b1c1a] font-semibold">
              {campaign.send_window_start.slice(0, 5)} — {campaign.send_window_end.slice(0, 5)}
            </span>
          </div>
          <div className="hidden sm:inline-block text-[#dedfe5]">•</div>
          <div className="text-[#5c5e63] font-label-md text-label-md">
            {locale === 'en' ? 'Interval:' : 'Intervallo:'}{' '}
            <span className="text-[#1b1c1a] font-semibold">{campaign.send_interval_seconds}s</span>
          </div>
          <div className="hidden sm:inline-block text-[#dedfe5]">•</div>
          <div className="text-[#5c5e63] font-label-md text-label-md">
            {locale === 'en' ? 'Limit:' : 'Limite:'}{' '}
            <span className="text-[#1b1c1a] font-semibold">
              {campaign.daily_limit} {locale === 'en' ? 'emails/day' : 'email/gg'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-label-sm text-label-sm text-[#5c5e63] uppercase tracking-wider font-semibold">
            {locale === 'en' ? 'Cycle Status:' : 'Stato Ciclo:'}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] text-[#036e13] font-label-sm text-label-sm font-semibold shadow-2xs flex items-center gap-1.5 border border-[#e5e5e0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855]"></span>
            <span>{est.isCompleted ? t.common.completed : est.label}</span>
          </span>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="bg-[#f5f3f0] p-1 rounded-xl border border-[#e5e5e0] flex items-center gap-1 w-fit shadow-2xs">
        <button
          onClick={() => setActiveTab('details')}
          type="button"
          className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1.5 ${
            activeTab === 'details'
              ? 'bg-[#ffffff] text-[#1b1c1a] font-semibold shadow-xs'
              : 'text-[#5c5e63] hover:text-[#1b1c1a]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span>{t.campaigns.detail.tabConfig}</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          type="button"
          className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all flex items-center gap-2 ${
            activeTab === 'preview'
              ? 'bg-[#ffffff] text-[#1b1c1a] font-semibold shadow-xs'
              : 'text-[#5c5e63] hover:text-[#1b1c1a]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#036e13]"></span>
          <span>{t.campaigns.detail.tabPreview}</span>
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          type="button"
          className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all flex items-center gap-2 ${
            activeTab === 'leads'
              ? 'bg-[#ffffff] text-[#1b1c1a] font-semibold shadow-xs'
              : 'text-[#5c5e63] hover:text-[#1b1c1a]'
          }`}
        >
          <span>{t.campaigns.detail.tabLeads}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-[#e4e2df] font-label-sm text-label-sm text-[#1b1c1a]">
            {campaign.total_leads}
          </span>
        </button>
      </div>

      {/* TAB 1: DETAILS */}
      <div className={activeTab === 'details' ? 'block' : 'hidden'}>
        <div className="bg-[#ffffff] border border-[#e5e5e0] rounded-xl p-space-lg shadow-xs">
          <CampaignForm
            initialData={campaign}
            isEditing={true}
            disabled={isActive}
            onSubmit={handleUpdate}
            onChangeValues={(data) => setLiveFormData(data)}
          />
        </div>
      </div>

      {/* TAB 2: PREVIEW */}
      <div className={activeTab === 'preview' ? 'block' : 'hidden'}>
        <EmailPreview
          subjectTemplate={liveFormData?.subject_template ?? campaign.subject_template}
          htmlTemplate={liveFormData?.html_template ?? campaign.html_template}
          leads={sampleLeads}
          hasUnsavedChanges={
            Boolean(
              liveFormData &&
                ((liveFormData.html_template !== undefined &&
                  liveFormData.html_template !== campaign.html_template) ||
                  (liveFormData.subject_template !== undefined &&
                    liveFormData.subject_template !== campaign.subject_template))
            )
          }
          onSave={async () => {
            if (liveFormData) {
              await handleUpdate({
                ...campaign,
                ...liveFormData,
              });
            }
          }}
          disabled={isActive}
        />
      </div>

      {/* TAB 3: LEADS */}
      <div className={activeTab === 'leads' ? 'block' : 'hidden'}>
        <div className="space-y-space-md">
          <div className="flex justify-between items-center bg-[#ffffff] p-space-md rounded-xl border border-[#e5e5e0] shadow-xs">
            <div>
              <h3 className="font-headline-md text-headline-md text-[#1b1c1a]">
                {locale === 'en' ? 'Recipient Management' : 'Gestione Destinatari'}
              </h3>
              <p className="font-body-md text-body-md text-[#5c5e63]">
                {locale === 'en'
                  ? 'View delivery telemetry for each lead or import a new CSV file.'
                  : 'Visualizza lo stato di recapito per singolo contatto o importa un nuovo file CSV.'}
              </p>
            </div>
            {!isActive && (
              <button
                onClick={() => setShowImporter(!showImporter)}
                className="h-10 px-space-md bg-[#30312f] text-[#f2f0ed] hover:bg-[#5c5e63] font-label-md text-label-md rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                <span>
                  {showImporter
                    ? (locale === 'en' ? 'Close Importer' : 'Chiudi Caricatore')
                    : (locale === 'en' ? 'Import CSV' : 'Importa CSV')}
                </span>
              </button>
            )}
          </div>

          {showImporter && !isActive && (
            <div className="bg-[#ffffff] p-space-md rounded-xl border border-[#e5e5e0] shadow-xs">
              <CsvImporter
                campaignId={id}
                onClose={() => setShowImporter(false)}
                onImportCompleted={() => {
                  fetchCampaignData();
                }}
              />
            </div>
          )}

          <LeadTable
            campaignId={id}
            timezone={campaign.timezone}
            onBouncesSynced={fetchCampaignData}
          />
        </div>
      </div>
    </div>
  );
}
