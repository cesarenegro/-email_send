'use client';

import React, { useState } from 'react';
import { CampaignInput } from '@/lib/validations/campaign';
import { Loader2, Save } from 'lucide-react';

interface CampaignFormProps {
  initialData?: Partial<CampaignInput>;
  isEditing?: boolean;
  disabled?: boolean;
  onSubmit: (data: CampaignInput) => Promise<void>;
}

export default function CampaignForm({
  initialData,
  isEditing = false,
  disabled = false,
  onSubmit,
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
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
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
          onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
          className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] disabled:bg-[#F7F5F0]"
        />
        <p className="text-xs text-[#666666] mt-1">
          Supporta i segnaposto: <code>&#123;&#123;azienda&#125;&#125;</code>, <code>&#123;&#123;companyName&#125;&#125;</code>, <code>&#123;&#123;email&#125;&#125;</code>
        </p>
      </div>

      {/* HTML Template */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A1E] mb-1">
          Email HTML (Incolla codice sorgente preparato esternamente) <span className="text-rose-600">*</span>
        </label>
        <textarea
          rows={10}
          required
          disabled={disabled}
          placeholder="<!DOCTYPE html><html><body><p>Buongiorno {{azienda}}, ...</p></body></html>"
          value={formData.html_template}
          onChange={(e) => setFormData({ ...formData, html_template: e.target.value })}
          className="w-full px-3 py-2 font-mono text-xs border border-[#D8D2C8] rounded text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] disabled:bg-[#F7F5F0]"
        />
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
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] disabled:bg-[#F7F5F0]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1E] mb-1">Finestra Inizio (HH:mm)</label>
            <input
              type="time"
              disabled={disabled}
              value={formData.send_window_start}
              onChange={(e) => setFormData({ ...formData, send_window_start: e.target.value })}
              className="w-full px-3 py-1.5 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] disabled:bg-[#F7F5F0]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1E] mb-1">Finestra Fine (HH:mm)</label>
            <input
              type="time"
              disabled={disabled}
              value={formData.send_window_end}
              onChange={(e) => setFormData({ ...formData, send_window_end: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, send_interval_seconds: Number(e.target.value) })}
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
              onChange={(e) => setFormData({ ...formData, daily_limit: Number(e.target.value) })}
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
