'use client';

import React, { useState } from 'react';
import { CampaignInput } from '@/lib/validations/campaign';
import { Loader2, Save, CheckCircle2 } from 'lucide-react';

interface CampaignFormProps {
  initialData?: Partial<CampaignInput>;
  isEditing?: boolean;
  disabled?: boolean;
  onSubmit: (data: CampaignInput) => Promise<void>;
  onChangeValues?: (data: CampaignInput) => void;
}

export default function CampaignForm({
  initialData,
  isEditing = false,
  disabled = false,
  onSubmit,
  onChangeValues,
}: CampaignFormProps) {
  const [formData, setFormData] = useState<CampaignInput>({
    name: initialData?.name || '',
    subject_template: initialData?.subject_template || '',
    html_template: initialData?.html_template || '',
    timezone: initialData?.timezone || 'Europe/Rome',
    start_at: initialData?.start_at || '',
    send_window_start: initialData?.send_window_start || '09:00',
    send_window_end: initialData?.send_window_end || '18:00',
    send_interval_seconds: initialData?.send_interval_seconds || 240,
    daily_limit: initialData?.daily_limit || 80,
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [initialData]);

  const updateFormData = (updater: (prev: CampaignInput) => CampaignInput) => {
    setFormData((prev) => {
      const next = updater(prev);
      onChangeValues?.(next);
      return next;
    });
  };

  const [loading, setLoading] = useState(false);
  const [htmlSaving, setHtmlSaving] = useState(false);
  const [htmlSavedMsg, setHtmlSavedMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickSaveHtml = async (e: React.MouseEvent) => {
    e.preventDefault();
    setHtmlSaving(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        start_at: formData.start_at && typeof formData.start_at === 'string' && formData.start_at.trim() !== ''
          ? formData.start_at
          : null,
      };
      await onSubmit(payload);
      setHtmlSavedMsg(true);
      setTimeout(() => setHtmlSavedMsg(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setHtmlSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        start_at: formData.start_at && typeof formData.start_at === 'string' && formData.start_at.trim() !== ''
          ? formData.start_at
          : null,
      };
      await onSubmit(payload);
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded">
          {error}
        </div>
      )}

      {disabled && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded">
          I campi sono bloccati perché la campagna è ATTIVA. Metti in PAUSA la campagna per modificarli.
        </div>
      )}

      {/* Campaign Name */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A1E] mb-1">
          Nome Campagna <span className="text-rose-600">*</span>
        </label>
        <input
          type="text"
          required
          disabled={disabled}
          placeholder="es. Mobili Italia"
          value={formData.name}
          onChange={(e) => updateFormData((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] disabled:bg-[#F7F5F0]"
        />
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A1E] mb-1">
          Oggetto Email <span className="text-rose-600">*</span>
        </label>
        <input
          type="text"
          required
          disabled={disabled}
          placeholder="es. Render per {{azienda}}"
          value={formData.subject_template}
          onChange={(e) => updateFormData((prev) => ({ ...prev, subject_template: e.target.value }))}
          className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] disabled:bg-[#F7F5F0]"
        />
        <p className="text-xs text-[#666666] mt-1">
          Supporta i segnaposto: <code>&#123;&#123;azienda&#125;&#125;</code>, <code>&#123;&#123;companyName&#125;&#125;</code>, <code>&#123;&#123;email&#125;&#125;</code>
        </p>
      </div>

      {/* HTML Template */}
      <div className="space-y-2 bg-[#FAF9F6] p-4 border border-[#D8D2C8] rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E6E2DC]">
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1E]">
              Email HTML (Codice Sorgente) <span className="text-rose-600">*</span>
            </label>
            <p className="text-xs text-[#666666]">
              Incolla o modifica qui il codice HTML. Clicca &quot;Salva Codice HTML&quot; per salvare subito.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {htmlSavedMsg && (
              <span className="text-xs text-emerald-700 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Salvato!</span>
              </span>
            )}
            <button
              type="button"
              disabled={disabled || htmlSaving || loading}
              onClick={handleQuickSaveHtml}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#1A1A1E] text-white text-xs font-semibold rounded hover:bg-[#333333] transition-colors disabled:opacity-50 shadow-sm"
              title="Salva immediatamente le modifiche al codice HTML"
            >
              {htmlSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salva Codice HTML</span>
                </>
              )}
            </button>
          </div>
        </div>

        <textarea
          rows={12}
          required
          disabled={disabled}
          placeholder="<!DOCTYPE html><html><body><p>Buongiorno {{azienda}}, ...</p></body></html>"
          value={formData.html_template}
          onChange={(e) => updateFormData((prev) => ({ ...prev, html_template: e.target.value }))}
          className="w-full px-3 py-2.5 font-mono text-xs border border-[#D8D2C8] rounded text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] disabled:bg-[#F7F5F0] leading-relaxed"
          spellCheck={false}
        />

        <div className="flex justify-between items-center text-xs text-[#666666] pt-1">
          <span>
            Dimensione stimata: <strong>{Math.round(new Blob([formData.html_template || '']).size / 1024)} KB</strong>
          </span>
          {formData.html_template !== initialData?.html_template && (
            <span className="text-amber-700 font-medium">● Modifiche HTML non ancora salvate</span>
          )}
        </div>
      </div>

      {/* Scheduling Card */}
      <div className="bg-[#F7F5F0] border border-[#D8D2C8] rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-semibold text-[#1A1A1E]">Pianificazione e Invio Scaglionato</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#1A1A1E] mb-1">Fuso Orario</label>
            <input
              type="text"
              disabled={disabled}
              value={formData.timezone}
              onChange={(e) => updateFormData((prev) => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] disabled:bg-[#F7F5F0]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1E] mb-1">Finestra Inizio (HH:mm)</label>
            <input
              type="time"
              disabled={disabled}
              value={formData.send_window_start}
              onChange={(e) => updateFormData((prev) => ({ ...prev, send_window_start: e.target.value }))}
              className="w-full px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] disabled:bg-[#F7F5F0]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1E] mb-1">Finestra Fine (HH:mm)</label>
            <input
              type="time"
              disabled={disabled}
              value={formData.send_window_end}
              onChange={(e) => updateFormData((prev) => ({ ...prev, send_window_end: e.target.value }))}
              className="w-full px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] disabled:bg-[#F7F5F0]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1E] mb-1">
              Ritardo tra email (secondi) <span className="text-[#666666]">(min 60s)</span>
            </label>
            <input
              type="number"
              min={60}
              step={10}
              disabled={disabled}
              value={formData.send_interval_seconds}
              onChange={(e) => updateFormData((prev) => ({ ...prev, send_interval_seconds: Number(e.target.value) }))}
              className="w-full px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] disabled:bg-[#F7F5F0]"
            />
            <span className="text-[11px] text-[#666666]">
              {Math.round((formData.send_interval_seconds / 60) * 10) / 10} minuti tra ogni invio
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1E] mb-1">Limite Giornaliero Invii</label>
            <input
              type="number"
              min={1}
              disabled={disabled}
              value={formData.daily_limit}
              onChange={(e) => updateFormData((prev) => ({ ...prev, daily_limit: Number(e.target.value) }))}
              className="w-full px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] disabled:bg-[#F7F5F0]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1E] mb-1">Giorni consentiti</label>
            <div className="px-3 py-1.5 text-xs text-[#666666] bg-[#FFFFFF] border border-[#D8D2C8] rounded">
              Lunedì — Venerdì
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={disabled || loading}
          className="flex items-center space-x-2 px-5 py-2.5 bg-[#1A1A1E] text-white text-sm font-medium rounded hover:bg-[#333333] transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Salvataggio...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Aggiorna Campagna' : 'Crea Campagna'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
