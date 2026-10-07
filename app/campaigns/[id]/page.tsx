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
import {
  ChevronLeft,
  Play,
  Pause,
  RotateCw,
  Trash2,
  UploadCloud,
  Eye,
  Settings,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Send,
} from 'lucide-react';
import { DateTime } from 'luxon';
import { estimateCampaignCompletion } from '@/lib/scheduling/estimate-completion';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<CampaignWithStats | null>(null);
  const [sampleLeads, setSampleLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'leads' | 'preview'>('details');
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
      const leadsRes = await fetch(`/api/campaigns/${id}/leads?limit=10`);
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

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchCampaignData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchCampaignData]);

  const handleStart = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impossibile avviare la campagna');
      setMessage({ type: 'success', text: 'Campagna avviata! Il cron invierà le email secondo gli intervalli.' });
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
      if (!res.ok) throw new Error(data.error || "Errore durante l'invio immediato");
      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message || 'Invio eseguito con successo!',
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
      if (!res.ok) throw new Error(data.error || 'Impossibile mettere in pausa la campagna');
      setMessage({ type: 'success', text: 'Campagna messa in pausa. Nessun invio verrà effettuato.' });
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
      if (!res.ok) throw new Error(data.error || 'Impossibile riprendere la campagna');
      setMessage({ type: 'success', text: 'Campagna ripresa! Gli invii ripartono regolarmente da adesso.' });
      fetchCampaignData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare questa campagna e tutti i contatti associati?')) {
      return;
    }

    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impossibile eliminare la campagna');
      router.push('/');
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
    if (!res.ok) throw new Error(data.error || 'Errore salvataggio modifiche');
    setMessage({ type: 'success', text: 'Modifiche salvate con successo' });
    fetchCampaignData();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-[#666666]">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Caricamento campagna...</span>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold text-[#1A1A1E]">Campagna non trovata</h2>
        <Link href="/" className="text-xs text-[#666666] hover:underline mt-2 inline-block">
          Torna alla dashboard
        </Link>
      </div>
    );
  }

  const isActive = campaign.status === 'active';
  const isPaused = campaign.status === 'paused';
  const isDraft = campaign.status === 'draft';
  const isCompleted = campaign.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center text-xs text-[#666666] hover:text-[#1A1A1E] transition-colors mb-1"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" />
            Dashboard
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
        </div>

        {/* Action Buttons (Section 33, 34, 35, 50) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Send Now Button (Immediate Send) */}
          {campaign.pending_count > 0 && campaign.status !== 'completed' && (
            <button
              onClick={handleSendNow}
              disabled={actionLoading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#1A1A1E] text-white text-xs font-semibold rounded hover:bg-[#333333] transition-colors shadow-sm disabled:opacity-50"
              title="Avvia e/o invia subito la prima o prossima email adesso"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>INVIA ORA</span>
            </button>
          )}

          {isDraft && (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 text-white text-xs font-medium rounded hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
              title="Avvia la campagna rispettando la pianificazione oraria"
            >
              <Play className="w-4 h-4" />
              <span>AVVIA PIANIFICATO</span>
            </button>
          )}

          {isActive && (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Pause className="w-4 h-4" />
              <span>METTI IN PAUSA</span>
            </button>
          )}

          {isPaused && (
            <button
              onClick={handleResume}
              disabled={actionLoading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 text-white text-xs font-medium rounded hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
            >
              <RotateCw className="w-4 h-4" />
              <span>RIPRENDI (RESUME)</span>
            </button>
          )}

          {!isActive && (
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="inline-flex items-center space-x-1.5 px-3 py-2 border border-[#D8D2C8] text-rose-700 text-xs font-medium rounded hover:bg-rose-50 transition-colors disabled:opacity-50"
              title="Elimina campagna"
            >
              <Trash2 className="w-4 h-4" />
              <span>Elimina</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {message && (
        <div
          className={`p-3 text-sm rounded flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Progress Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-4">
          <span className="text-xs uppercase text-[#666666] font-semibold">Contatti Totali</span>
          <p className="text-2xl font-bold font-mono text-[#1A1A1E] mt-1">{campaign.total_leads}</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-4">
          <span className="text-xs uppercase text-emerald-700 font-semibold">Inviati</span>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">{campaign.sent_count}</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-4">
          <span className="text-xs uppercase text-[#666666] font-semibold">In Attesa</span>
          <p className="text-2xl font-bold font-mono text-[#1A1A1E] mt-1">{campaign.pending_count}</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-4">
          <span className="text-xs uppercase text-rose-700 font-semibold">Falliti</span>
          <p className="text-2xl font-bold font-mono text-rose-700 mt-1">{campaign.failed_count}</p>
        </div>
      </div>

      {/* Schedule and estimated completion banner */}
      {(() => {
        const est = estimateCampaignCompletion(campaign);
        return (
          <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-[#1A1A1E]">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#666666] shrink-0" />
              <span>
                {isActive && campaign.next_send_at ? (
                  <>
                    Prossimo invio programmato:{' '}
                    <strong>
                      {DateTime.fromISO(campaign.next_send_at).setZone(campaign.timezone).toFormat('dd/MM/yyyy HH:mm:ss')}
                    </strong>
                  </>
                ) : isPaused ? (
                  <span className="text-[#666666] font-medium">Campagna in pausa</span>
                ) : isCompleted ? (
                  <span className="text-emerald-700 font-medium">Campagna completata</span>
                ) : (
                  <span className="text-[#666666] font-medium">Bozza (non ancora avviata)</span>
                )}
                <span className="text-[#666666]">
                  {' '}• Intervallo: <strong>{campaign.send_interval_seconds}s</strong> • Limite giornaliero:{' '}
                  <strong>{campaign.daily_limit} email/gg</strong> (lun-ven 09:00-18:00)
                </span>
              </span>
            </div>

            <div className="flex items-center space-x-2 bg-[#F7F5F0] border border-[#D8D2C8] px-3 py-1.5 rounded shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#666666] shrink-0" />
              <span>
                Fine Stimata:{' '}
                <strong className={est.isCompleted ? 'text-emerald-700' : 'text-[#1A1A1E]'}>
                  {est.label}
                </strong>
                {est.subLabel && <span className="text-[#666666] ml-1">({est.subLabel})</span>}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Tab Navigation */}
      <div className="border-b border-[#D8D2C8]">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'details'
                ? 'border-[#1A1A1E] text-[#1A1A1E]'
                : 'border-transparent text-[#666666] hover:text-[#1A1A1E]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurazione & Template</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'preview'
                ? 'border-[#1A1A1E] text-[#1A1A1E]'
                : 'border-transparent text-[#666666] hover:text-[#1A1A1E]'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Anteprima Email</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'leads'
                ? 'border-[#1A1A1E] text-[#1A1A1E]'
                : 'border-transparent text-[#666666] hover:text-[#1A1A1E]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Contatti & CSV ({campaign.total_leads})</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: DETAILS */}
      <div className={activeTab === 'details' ? 'block' : 'hidden'}>
        <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-6 shadow-sm">
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
                ((liveFormData.html_template !== undefined && liveFormData.html_template !== campaign.html_template) ||
                  (liveFormData.subject_template !== undefined && liveFormData.subject_template !== campaign.subject_template))
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
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[#1A1A1E]">Gestione Destinatari</h3>
            {!isActive && (
              <button
                onClick={() => setShowImporter(!showImporter)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#1A1A1E] text-white text-xs font-medium rounded hover:bg-[#333333] transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{showImporter ? 'Chiudi Caricatore' : 'Importa CSV'}</span>
              </button>
            )}
          </div>

          {showImporter && !isActive && (
            <CsvImporter
              campaignId={id}
              onClose={() => setShowImporter(false)}
              onImportCompleted={() => {
                fetchCampaignData();
              }}
            />
          )}

          <LeadTable campaignId={id} />
        </div>
      </div>
    </div>
  );
}
