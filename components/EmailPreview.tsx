'use client';

import React, { useState } from 'react';
import { renderTemplate } from '@/lib/email/render-template';
import { CampaignLead } from '@/types/database';
import { AlertTriangle, Eye, Save, Loader2, CheckCircle2 } from 'lucide-react';

interface EmailPreviewProps {
  subjectTemplate: string;
  htmlTemplate: string;
  leads: CampaignLead[];
  onSave?: () => Promise<void>;
  hasUnsavedChanges?: boolean;
  disabled?: boolean;
}

export default function EmailPreview({
  subjectTemplate,
  htmlTemplate,
  leads,
  onSave,
  hasUnsavedChanges = false,
  disabled = false,
}: EmailPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving template from preview:', err);
    } finally {
      setSaving(false);
    }
  };

  const activeLead = leads[selectedIndex] || {
    company_name: 'Rossi Arredi',
    email: 'info@rossiarredi.it',
  };

  const resolvedSubject = renderTemplate(subjectTemplate || '', activeLead);
  const resolvedHtml = renderTemplate(htmlTemplate || '', activeLead);

  // HTML size warning check (Section 62)
  const htmlBytes = new Blob([htmlTemplate || '']).size;
  const isLarge = htmlBytes > 150 * 1024;
  const hasBase64Images = /data:image\/|base64,/i.test(htmlTemplate || '');

  return (
    <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#D8D2C8] gap-3">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-[#1A1A1E]" />
          <h3 className="text-base font-semibold text-[#1A1A1E]">Anteprima Email Personalizzata</h3>
          {hasUnsavedChanges && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
              Modifiche non salvate
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-700 font-medium flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Salvato!</span>
            </span>
          )}

          {hasUnsavedChanges && onSave && (
            <button
              onClick={handleSave}
              disabled={disabled || saving}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#1A1A1E] text-white text-xs font-semibold rounded hover:bg-[#333333] transition-colors disabled:opacity-50 shadow-sm"
              title="Salva le modifiche al template"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salva Template</span>
                </>
              )}
            </button>
          )}

          {leads.length > 0 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#666666]">Contatto di prova:</span>
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(Number(e.target.value))}
                className="px-2 py-1 border border-[#D8D2C8] rounded bg-white text-xs text-[#1A1A1E] focus:outline-none"
              >
                {leads.slice(0, 20).map((l, idx) => (
                  <option key={idx} value={idx}>
                    {l.company_name ? `${l.company_name} (${l.email})` : l.email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {(isLarge || hasBase64Images) && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {isLarge && `Attenzione: L'HTML supera i 150 KB (${Math.round(htmlBytes / 1024)} KB). `}
            {hasBase64Images &&
              'Attenzione: Sono presenti immagini in formato base64 che potrebbero appesantire il recapito.'}
          </span>
        </div>
      )}

      {/* Resolved Subject */}
      <div className="bg-[#F7F5F0] border border-[#D8D2C8] rounded p-3 text-sm">
        <span className="text-[#666666] font-medium mr-2">Oggetto:</span>
        <span className="text-[#1A1A1E] font-medium">{resolvedSubject || '(Nessun oggetto specificato)'}</span>
      </div>

      {/* Rendered HTML Sandbox Iframe */}
      <div className="border border-[#D8D2C8] rounded overflow-hidden bg-white">
        <iframe
          sandbox=""
          srcDoc={resolvedHtml || '<p style="font-family:sans-serif;color:#888;padding:20px;">Nessun contenuto HTML inserito.</p>'}
          title="Anteprima Email"
          className="w-full h-96 border-none"
        />
      </div>

      <div className="text-xs text-[#666666] flex justify-between">
        <span>Segnaposto supportati: <code>&#123;&#123;companyName&#125;&#125;</code>, <code>&#123;&#123;azienda&#125;&#125;</code>, <code>&#123;&#123;email&#125;&#125;</code></span>
        <span>Lead attivo: <strong>{activeLead.company_name || 'N/D'}</strong> &lt;{activeLead.email}&gt;</span>
      </div>
    </div>
  );
}
