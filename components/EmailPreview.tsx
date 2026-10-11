'use client';

import React, { useState } from 'react';
import { renderTemplate } from '@/lib/email/render-template';
import { CampaignLead } from '@/types/database';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface EmailPreviewProps {
  subjectTemplate?: string;
  htmlTemplate: string;
  leads?: (CampaignLead | { email: string; company_name?: string | null; name?: string | null })[];
  sampleData?: { email: string; company_name?: string | null; name?: string | null };
  onSave?: () => Promise<void>;
  hasUnsavedChanges?: boolean;
  disabled?: boolean;
}

export default function EmailPreview({
  subjectTemplate = '',
  htmlTemplate,
  leads,
  sampleData,
  onSave,
  hasUnsavedChanges = false,
  disabled = false,
}: EmailPreviewProps) {
  const { t, locale } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
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

  const previewList = leads || [];
  const activeLead = (previewList.length > 0 ? previewList[selectedIndex] : null) || sampleData || {
    company_name: locale === 'en' ? 'Milan Architectural Studio' : 'Studio Architettura Milano',
    name: 'Arch. Marco Bellini',
    email: 'info@studiobellini.it',
  };

  const resolvedSubject = renderTemplate(subjectTemplate || '', activeLead);
  const resolvedHtml = renderTemplate(htmlTemplate || '', activeLead);

  const htmlBytes = new Blob([htmlTemplate || '']).size;
  const isLarge = htmlBytes > 150 * 1024;
  const hasBase64Images = /data:image\/|base64,/i.test(htmlTemplate || '');

  return (
    <div className="bg-[#f5f3f0] rounded-xl border border-[#e5e5e0] shadow-sm p-space-md flex flex-col gap-space-md">
      {/* Viewport & Identity Controller Bar */}
      <div className="bg-[#ffffff] p-space-md rounded-lg border border-[#e5e5e0] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex items-center flex-wrap gap-space-md">
          {/* Recipient Selector */}
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm text-[#5c5e63] uppercase tracking-wider font-semibold">
              {t.campaigns.detail.recordSelected}
            </span>
            <div className="relative inline-flex items-center">
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(Number(e.target.value))}
                className="h-10 pl-3 pr-9 rounded-lg bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] font-title-sm text-title-sm border border-[#e5e5e0] focus:outline-none cursor-pointer appearance-none"
              >
                {previewList.length > 0 ? (
                  previewList.slice(0, 30).map((l, idx) => (
                    <option key={idx} value={idx}>
                      {l.company_name ? `${l.company_name} (${l.email})` : l.email}
                    </option>
                  ))
                ) : (
                  <option value={0}>
                    {locale === 'en'
                      ? 'Example: Milan Architectural Studio (info@studiobellini.it)'
                      : 'Esempio: Studio Architettura Milano (info@studiobellini.it)'}
                  </option>
                )}
              </select>
              <span className="material-symbols-outlined text-[18px] text-[#5c5e63] absolute right-2.5 pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Viewport Mode Switcher */}
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm text-[#5c5e63] uppercase tracking-wider font-semibold">
              {t.campaigns.detail.renderingResolution}
            </span>
            <div className="bg-[#f5f3f0] p-1 rounded-lg border border-[#e5e5e0] flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`px-3 py-1.5 rounded font-label-md text-label-md flex items-center gap-1.5 transition-all ${
                  viewportMode === 'desktop'
                    ? 'bg-[#ffffff] text-[#1b1c1a] font-semibold shadow-2xs'
                    : 'text-[#5c5e63] hover:text-[#1b1c1a]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">desktop_windows</span>
                <span>{t.campaigns.detail.previewDeviceDesktop}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`px-3 py-1.5 rounded font-label-md text-label-md flex items-center gap-1.5 transition-all ${
                  viewportMode === 'mobile'
                    ? 'bg-[#ffffff] text-[#1b1c1a] font-semibold shadow-2xs'
                    : 'text-[#5c5e63] hover:text-[#1b1c1a]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">smartphone</span>
                <span>{t.campaigns.detail.previewDeviceMobile}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Save Template Action if Unsaved */}
        <div className="flex items-center gap-space-sm self-end lg:self-center">
          {savedSuccess && (
            <span className="inline-flex items-center gap-1 text-[#036e13] font-label-md text-label-md font-semibold">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{t.campaigns.detail.savedSuccess}</span>
            </span>
          )}

          {hasUnsavedChanges && onSave && (
            <button
              onClick={handleSave}
              disabled={disabled || saving}
              className="h-10 px-space-md rounded-lg bg-[#30312f] text-[#f2f0ed] hover:bg-[#5c5e63] transition-colors flex items-center gap-2 font-label-md text-label-md shadow-xs disabled:opacity-50"
              title={t.campaigns.detail.saveTemplate}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{saving ? t.campaigns.detail.savingTemplate : t.campaigns.detail.saveTemplate}</span>
            </button>
          )}
        </div>
      </div>

      {/* HTML Warnings if heavy */}
      {(isLarge || hasBase64Images) && (
        <div className="p-space-sm bg-[#fff7ed] border border-[#ffedd5] rounded-lg text-[#c2410c] text-body-md flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          <span>
            {isLarge &&
              (locale === 'en'
                ? `Warning: HTML exceeds 150 KB (${Math.round(htmlBytes / 1024)} KB). `
                : `Attenzione: L'HTML supera i 150 KB (${Math.round(htmlBytes / 1024)} KB). `)}
            {hasBase64Images &&
              (locale === 'en'
                ? 'Base64 images detected which may increase spam filter scores.'
                : 'Sono presenti immagini in formato base64 che potrebbero aumentare il rischio di spam.')}
          </span>
        </div>
      )}

      {/* Subject Ribbon */}
      <div className="bg-[#ffffff] px-space-md py-3 rounded-lg border border-[#e5e5e0] flex items-center justify-between gap-space-sm shadow-xs">
        <div className="flex items-center gap-space-sm min-w-0">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] shrink-0 font-semibold">
            {t.campaigns.detail.subjectLabel}
          </span>
          <span className="font-title-sm text-title-sm text-[#1b1c1a] truncate">
            {resolvedSubject || (locale === 'en' ? '(No subject specified)' : '(Nessun oggetto specificato)')}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-[#f5f3f0] font-label-sm text-[11px] text-[#5c5e63]">
          <span className="material-symbols-outlined text-[13px] text-[#036e13]">verified</span>
          <span>{t.campaigns.detail.personalizedBadge}</span>
        </div>
      </div>

      {/* Architectural Email Preview Frame Container */}
      <div className="w-full flex justify-center py-space-md bg-[#eae8e5]/60 rounded-xl border border-[#e5e5e0] overflow-hidden">
        <div
          className={`bg-[#ffffff] rounded-lg border border-[#e5e5e0] shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300 ${
            viewportMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-[640px]'
          }`}
        >
          {/* Mock Client Top Bar */}
          <div className="px-4 py-2.5 bg-[#f5f3f0] border-b border-[#e5e5e0] flex items-center justify-between text-[#5c5e63] font-label-sm text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e4e2df]"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#e4e2df]"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#e4e2df]"></span>
              <span className="ml-2 font-medium text-[#1b1c1a]">{t.campaigns.detail.simulatorClientTitle}</span>
            </div>
            <span className="text-[#a2a59e] uppercase tracking-wider font-semibold">{t.campaigns.detail.maxWidthIndicator}</span>
          </div>

          {/* Sandboxed Iframe */}
          <iframe
            sandbox=""
            srcDoc={
              resolvedHtml ||
              `<div style="font-family:Plus Jakarta Sans,sans-serif;color:#5c5e63;padding:40px;text-align:center;">${
                locale === 'en' ? 'No HTML template code provided.' : 'Nessun codice HTML inserito nel template.'
              }</div>`
            }
            title={locale === 'en' ? 'Live Email Preview' : 'Anteprima Email Live'}
            className="w-full h-[540px] border-none bg-white"
          />
        </div>
      </div>

      {/* Placeholders Help Footer */}
      <div className="flex flex-wrap items-center justify-between text-[#5c5e63] font-label-sm text-[11px] px-space-xs">
        <div className="flex items-center gap-2">
          <span>{t.campaigns.detail.supportedPlaceholders}</span>
          <code className="px-1.5 py-0.5 rounded bg-[#ffffff] border border-[#e5e5e0] text-[#1b1c1a] font-mono font-semibold">
            &#123;&#123;companyName&#125;&#125;
          </code>
          <code className="px-1.5 py-0.5 rounded bg-[#ffffff] border border-[#e5e5e0] text-[#1b1c1a] font-mono font-semibold">
            &#123;&#123;azienda&#125;&#125;
          </code>
          <code className="px-1.5 py-0.5 rounded bg-[#ffffff] border border-[#e5e5e0] text-[#1b1c1a] font-mono font-semibold">
            &#123;&#123;email&#125;&#125;
          </code>
        </div>
        <div>
          {t.campaigns.detail.activeLeadLabel}{' '}
          <strong className="text-[#1b1c1a]">{activeLead.company_name || 'N/D'}</strong> &lt;{activeLead.email}&gt;
        </div>
      </div>
    </div>
  );
}
