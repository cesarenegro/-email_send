'use client';

import React, { useState } from 'react';
import { Smartphone, Monitor, CheckCircle, ShieldAlert, AlertTriangle } from 'lucide-react';
import { renderTemplate } from '@/lib/email/render-template';

interface Step5PreviewConfirmProps {
  fromEmail: string;
  fromName?: string;
  subject: string;
  html: string;
  isConfirmed: boolean;
  onConfirmChange: (confirmed: boolean) => void;
}

export default function Step5PreviewConfirm({
  fromEmail,
  fromName = 'Il tuo nome',
  subject,
  html,
  isConfirmed,
  onConfirmChange,
}: Step5PreviewConfirmProps) {
  const [viewport, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');

  // Sample lead for real variable substitution
  const sampleLead = {
    company_name: 'Studio Architettura Bellini',
    email: 'info@studiobellini.it',
  };

  const resolvedSubject = renderTemplate(subject || '', sampleLead);
  const resolvedHtml = renderTemplate(html || '', sampleLead);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-[#1B1C1A]">5. Anteprima e conferma del messaggio</h3>
          <p className="text-xs text-[#5C5E63] mt-1">
            Verifica come apparirà l'email nella casella del destinatario prima di selezionare i contatti.
          </p>
        </div>

        {/* Viewport switch */}
        <div className="flex items-center gap-1 bg-[#F5F3F0] p-1 rounded-lg border border-[#D8D2C8] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewportMode('desktop')}
            className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
              viewport === 'desktop' ? 'bg-white text-[#1B1C1A] shadow-xs' : 'text-[#5C5E63] hover:text-[#1B1C1A]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Computer</span>
          </button>
          <button
            type="button"
            onClick={() => setViewportMode('mobile')}
            className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
              viewport === 'mobile' ? 'bg-white text-[#1B1C1A] shadow-xs' : 'text-[#5C5E63] hover:text-[#1B1C1A]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Smartphone</span>
          </button>
        </div>
      </div>

      {/* Preview Card */}
      <div className="bg-[#FAF9F6] border border-[#D8D2C8] rounded-xl p-4 space-y-3">
        {/* Email Header Metadata */}
        <div className="bg-white p-3.5 rounded-lg border border-[#E5E5E0] space-y-1.5 text-xs">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-[#5C5E63] w-14 shrink-0">Da:</span>
            <span className="text-[#1B1C1A] font-medium">{fromName} &lt;{fromEmail || 'latuacasella@dominio.it'}&gt;</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-[#5C5E63] w-14 shrink-0">A:</span>
            <span className="text-[#1B1C1A]">{sampleLead.company_name} &lt;{sampleLead.email}&gt;</span>
          </div>
          <div className="flex items-baseline gap-2 pt-1 border-t border-[#F0EFEA]">
            <span className="font-semibold text-[#5C5E63] w-14 shrink-0">Oggetto:</span>
            <span className="text-[#1B1C1A] font-bold text-sm">{resolvedSubject || '(Nessun oggetto specificato)'}</span>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="flex justify-center bg-[#EFEEEB] p-4 rounded-lg border border-[#D8D2C8] min-h-[300px]">
          <div
            className={`bg-white rounded-lg shadow-sm border border-[#E5E5E0] overflow-hidden transition-all duration-300 ${
              viewport === 'mobile' ? 'w-[360px] p-4' : 'w-full max-w-[650px] p-6'
            }`}
          >
            <div
              className="prose prose-sm max-w-none text-[#1B1C1A] font-sans leading-relaxed"
              dangerouslySetInnerHTML={{ __html: resolvedHtml || '<p class="text-neutral-400 italic">Nessun testo presente.</p>' }}
            />
          </div>
        </div>
      </div>

      {/* Mandatory Confirmation Gate */}
      <div className={`p-4 rounded-xl border transition-all ${
        isConfirmed
          ? 'bg-emerald-50 border-emerald-300'
          : 'bg-amber-50 border-amber-300'
      }`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isConfirmed}
            onChange={(e) => onConfirmChange(e.target.checked)}
            className="mt-1 w-4 h-4 text-[#036E13] rounded border-[#D8D2C8] focus:ring-[#036E13]"
          />
          <div>
            <span className="text-sm font-bold text-[#1B1C1A]">
              Confermo che il messaggio e l'oggetto sono corretti e pronti per l'invio
            </span>
            <p className="text-xs text-[#5C5E63] mt-0.5">
              La conferma è necessaria per procedere con l'importazione dei destinatari. Se torni a modificare il testo, ti chiederemo di confermare nuovamente.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
