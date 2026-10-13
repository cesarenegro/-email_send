'use client';

import React from 'react';
import { Send, Rocket, Mail, Tag, Users, Calendar, Clock, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Step8SummaryLaunchProps {
  fromEmail: string;
  fromName?: string;
  campaignName: string;
  subject: string;
  html: string;
  leadCount: number;
  startMode: 'immediate' | 'scheduled';
  scheduledDate?: string;
  timezone: string;
  isSubmitting: boolean;
  onLaunch: () => void;
  error?: string | null;
}

export default function Step8SummaryLaunch({
  fromEmail,
  fromName,
  campaignName,
  subject,
  html,
  leadCount,
  startMode,
  scheduledDate,
  timezone,
  isSubmitting,
  onLaunch,
  error,
}: Step8SummaryLaunchProps) {
  // Strip html for clean preview
  const plainTextPreview = html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180) : '';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1B1C1A]">8. Riepilogo finale e avvio</h3>
        <p className="text-xs text-[#5C5E63] mt-1">
          Verifica tutti i dettagli prima di avviare. Solo premendo il pulsante in basso la campagna verrà creata e avviata.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Matrix Card */}
      <div className="bg-white p-5 rounded-xl border border-[#D8D2C8] shadow-xs space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-[#E5E5E0]">
          {/* Sender */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#5C5E63] uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#036E13]" /> Mittente
            </span>
            <div className="font-semibold text-sm text-[#1B1C1A]">{fromName || 'Mittente verificato'}</div>
            <div className="text-[#5C5E63] font-mono">{fromEmail}</div>
          </div>

          {/* Campaign & Subject */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#5C5E63] uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#036E13]" /> Campagna & Oggetto
            </span>
            <div className="font-semibold text-sm text-[#1B1C1A]">{campaignName}</div>
            <div className="text-[#3F4A3C] italic font-medium">&quot;{subject}&quot;</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-[#E5E5E0]">
          {/* Recipients */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#5C5E63] uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#036E13]" /> Destinatari Verificati
            </span>
            <div className="text-base font-bold text-[#036E13]">{leadCount} contatti validi</div>
            <div className="text-[#5C5E63]">Pronti per l'invio scaglionato senza duplicati</div>
          </div>

          {/* Scheduling */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#5C5E63] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#036E13]" /> Programmazione
            </span>
            <div className="font-semibold text-sm text-[#1B1C1A]">
              {startMode === 'immediate' ? 'Partenza Subito' : `Pianificata: ${scheduledDate || 'Data personalizzata'}`}
            </div>
            <div className="text-[#5C5E63]">Fuso orario: {timezone} (Lun-Ven, 09:00-18:00)</div>
          </div>
        </div>

        {/* Message preview snippet */}
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-[#5C5E63] uppercase tracking-wider block">
            Estratto del testo confermato:
          </span>
          <div className="p-3 bg-[#FAF9F6] rounded-lg border border-[#E5E5E0] text-[#5C5E63] italic leading-relaxed">
            {plainTextPreview ? `"${plainTextPreview}..."` : '(Nessun testo)'}
          </div>
        </div>
      </div>

      {/* Big Launch Action Button with Anti-Double-Click */}
      <div className="flex flex-col items-center justify-center p-4 bg-[#F5F3F0] rounded-xl border border-[#D8D2C8] space-y-2">
        <button
          type="button"
          disabled={isSubmitting || leadCount === 0 || !subject || !html}
          onClick={onLaunch}
          className="w-full sm:w-auto px-8 py-3.5 bg-[#036E13] hover:bg-[#02560F] text-white text-sm font-bold uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creazione e avvio in corso...</span>
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              <span>{startMode === 'immediate' ? 'Avvia Campagna' : 'Programma Campagna'}</span>
            </>
          )}
        </button>
        <span className="text-[11px] text-[#5C5E63]">
          Premendo il pulsante confermi la creazione e l'avvio della spedizione.
        </span>
      </div>
    </div>
  );
}
