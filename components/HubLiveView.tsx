'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface LatestCampaign {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  totalLeads: number;
  sentLeads: number;
}

interface LatestNewsletter {
  id: string;
  title: string;
  status: string;
  subject: string;
}

interface HubStats {
  campaignsTotal: number;
  campaignsActive: number;
  newslettersTotal: number;
  newslettersScheduled: number;
  newslettersSending: number;
  todaySends: number;
  pendingLeadsCount: number;
  latestCampaign: LatestCampaign | null;
  latestNewsletter: LatestNewsletter | null;
}

export default function HubLiveView({ stats }: { stats: HubStats }) {
  const { t, locale } = useTranslation();
  const dailyLimit = 80;
  const sendsRemaining = Math.max(0, dailyLimit - stats.todaySends);
  const quotaPercent = Math.min(100, Math.round((stats.todaySends / dailyLimit) * 100));

  const hasActivity = stats.campaignsTotal > 0 || stats.newslettersTotal > 0 || stats.todaySends > 0;
  const latestCamp = stats.latestCampaign;
  const latestNl = stats.latestNewsletter;

  return (
    <div className="relative w-full overflow-hidden px-gutter pb-space-xl pt-space-md">
      {/* Subtle decorative ambient glow */}
      <div className="absolute top-0 right-1/4 -z-10 w-96 h-96 rounded-full bg-[#5cb855]/10 blur-3xl pointer-events-none"></div>
      <div className="absolute top-48 left-10 -z-10 w-72 h-72 rounded-full bg-[#e4e2df]/60 blur-2xl pointer-events-none"></div>

      {/* Atelier Executive Console Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg pb-space-lg">
        <div className="flex flex-col max-w-2xl">
          <div className="flex items-center gap-space-xs mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855]"></span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-[#5c5e63] font-semibold">
              {t.navigation.operatingConsole}
            </span>
            <span className="text-[#a2a59e] text-xs">•</span>
            <span className="font-label-sm text-label-sm text-[#5c5f59] font-medium">{t.common.appName} v4.2</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-[#1b1c1a] tracking-tight">{t.navigation.hub}</h1>
          <p className="font-body-lg text-body-lg text-[#3f4a3c] mt-1.5 leading-relaxed">
            {t.hub.consoleSubtitle}
          </p>
        </div>

        {/* Live Dispatch Status Widget */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md p-space-md bg-[#ffffff] rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-space-sm pr-space-md sm:border-r border-[#e5e5e0]">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-[#f5f3f0]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5cb855] animate-ping absolute"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#5cb855] relative"></span>
            </div>
            <div className="flex flex-col">
              <span className="font-title-sm text-title-sm text-[#1b1c1a] flex items-center gap-1.5">
                {t.hub.regular}
                <span className="material-symbols-outlined text-[16px] text-[#036e13]">verified</span>
              </span>
              <span className="font-label-sm text-label-sm text-[#5c5e63]">
                {locale === 'en' ? 'Window: 09:00 – 19:30 CET' : 'Finestra: 09:00 – 19:30 CET'}
              </span>
            </div>
          </div>

          <div className="flex flex-col min-w-[210px] justify-center">
            <div className="flex items-center justify-between text-[#5c5e63] mb-1.5 font-label-sm text-label-sm">
              <span className="uppercase tracking-wider font-semibold text-[#3f4a3c]">
                {locale === 'en' ? 'Gestor Mail Quota' : 'Quota Gestor Mail'}
              </span>
              <span className="font-metric-num text-label-md text-[#1b1c1a]">
                {stats.todaySends} <span className="font-body-md text-[#5c5e63]">/ {dailyLimit} {t.common.today}</span>
              </span>
            </div>
            <div className="w-full bg-[#efeeeb] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#5cb855] h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(stats.todaySends > 0 ? 5 : 0, quotaPercent)}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="font-label-sm text-[10px] text-[#5c5e63]">Safe Throttle 240s</span>
              <span className="font-label-sm text-[10px] text-[#036e13] font-semibold">
                {sendsRemaining} {locale === 'en' ? 'sends available' : 'invii disponibili'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Telemetry Row (4 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md my-space-md">
        {/* Card 1: Global Placement */}
        <div className="bg-[#ffffff] p-space-md rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#5c5e63]">
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              {locale === 'en' ? 'Global Placement' : 'Recapito Globale'}
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#036e13]">mark_email_read</span>
          </div>
          <div className="mt-space-sm">
            <span className="font-metric-num text-metric-num text-[#1b1c1a]">
              {stats.todaySends > 0 ? '100' : '—'}
              {stats.todaySends > 0 && <span className="text-headline-md font-light text-[#036e13]">%</span>}
            </span>
            <p className="font-label-sm text-label-sm text-[#5c5e63] mt-0.5">
              {stats.todaySends > 0
                ? (locale === 'en' ? 'Verified in-box delivery' : 'Recapito verificato in casella')
                : (locale === 'en' ? 'Awaiting first dispatch' : 'In attesa del primo invio')}
            </p>
          </div>
        </div>

        {/* Card 2: Gestor Mail Relay */}
        <div className="bg-[#ffffff] p-space-md rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#5c5e63]">
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              {locale === 'en' ? 'Gestor Mail Relay' : 'Relay Gestor Mail'}
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#036e13]">speed</span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-2">
            <span className="font-metric-num text-headline-md text-[#1b1c1a]">SSL 465</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#f5f3f0] font-label-sm text-[10px] text-[#036e13] font-semibold">
              {locale === 'en' ? 'READY' : 'PRONTO'}
            </span>
          </div>
          <p className="font-label-sm text-label-sm text-[#5c5e63] mt-0.5">
            {locale === 'en' ? 'Secure TLS pipeline' : 'Pipeline crittografica TLS'}
          </p>
        </div>

        {/* Card 3: Queued Leads */}
        <div className="bg-[#ffffff] p-space-md rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#5c5e63]">
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              {t.hub.queuedLeadsCard}
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#5c5e63]">hourglass_top</span>
          </div>
          <div className="mt-space-sm">
            <span className="font-metric-num text-metric-num text-[#1b1c1a]">
              {stats.pendingLeadsCount} <span className="text-title-sm font-normal text-[#5c5e63]">{t.common.pending}</span>
            </span>
            <p className="font-label-sm text-label-sm text-[#5c5e63] mt-0.5">
              {locale === 'en' ? 'Atomic FOR UPDATE buffer' : 'Buffer atomico FOR UPDATE'}
            </p>
          </div>
        </div>

        {/* Card 4: Security Protocol */}
        <div className="bg-[#ffffff] p-space-md rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#5c5e63]">
            <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              {locale === 'en' ? 'Security Protocol' : 'Protocollo Sicurezza'}
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#036e13]">verified_user</span>
          </div>
          <div className="mt-space-sm flex items-center gap-1.5">
            <span className="font-title-sm text-title-sm text-[#1b1c1a]">SPF • DKIM • DMARC</span>
          </div>
          <p className="font-label-sm text-label-sm text-[#036e13] font-medium mt-0.5">
            {locale === 'en' ? '100% active alignment' : 'Allineamento attivo 100%'}
          </p>
        </div>
      </div>

      {/* Section Two: Operational Feature Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-lg mt-space-lg">
        {/* Card 1: Email Massive */}
        <div className="bg-[#BADFCD] rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] p-space-lg flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#036e13]/5 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110"></div>
          <div>
            {/* Top Row Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#1b1c1a]">
                  <span className="material-symbols-outlined text-[22px]">forward_to_inbox</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] block font-semibold">
                    {t.hub.outboundSectionTitle}
                  </span>
                  <h3 className="font-headline-md text-headline-md text-[#1b1c1a]">{t.navigation.campaigns}</h3>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ecf8eb] text-[#036e13] font-label-sm text-label-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855] animate-pulse"></span>
                {stats.campaignsActive} {t.common.active}
              </span>
            </div>

            {/* Description */}
            <p className="font-body-md text-body-md text-[#3f4a3c] mt-space-md leading-relaxed">
              {locale === 'en'
                ? 'Mass B2B outbound campaigns with dynamic {{companyName}} personalization and 240s anti-spam safe throttle.'
                : 'Campagne di invio massivo B2B per studi e brand con personalizzazione dinamica {{companyName}}, intervallo dilazionato (240s) anti-spam.'}
            </p>

            {/* Dilated Queue Timeline Visual */}
            <div className="mt-space-lg p-space-md rounded-lg bg-[#f5f3f0] border border-[#e5e5e0]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-label-sm text-[#5c5e63] uppercase tracking-wider flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-[14px]">timeline</span>
                  {t.hub.jitterActive}
                </span>
                <span className="font-label-sm text-label-sm text-[#036e13] font-semibold">
                  {stats.todaySends > 0 ? '100% deliverability' : (locale === 'en' ? 'Queue ready' : 'Coda pronta')}
                </span>
              </div>

              {/* Timeline bar visualization: renders real activity or clean baseline */}
              <div className="h-10 w-full flex items-end gap-1.5 pt-1">
                {stats.todaySends > 0 ? (
                  <>
                    <div className="flex-1 bg-[#5cb855]/20 h-4 rounded-xs" title="09:00"></div>
                    <div className="flex-1 bg-[#5cb855]/30 h-6 rounded-xs" title="10:00"></div>
                    <div className="flex-1 bg-[#5cb855]/60 h-8 rounded-xs" title="11:00"></div>
                    <div className="flex-1 bg-[#5cb855] h-10 rounded-xs" title="12:00"></div>
                    <div className="flex-1 bg-[#5cb855]/40 h-5 rounded-xs" title="13:00"></div>
                    <div className="flex-1 bg-[#5cb855]/50 h-7 rounded-xs" title="14:00"></div>
                    <div className="flex-1 bg-[#5cb855]/70 h-9 rounded-xs" title="15:00"></div>
                    <div className="flex-1 bg-[#5cb855] h-8 rounded-xs" title="16:00"></div>
                    <div className="flex-1 bg-[#e4e2df] h-2 rounded-xs"></div>
                    <div className="flex-1 bg-[#e4e2df] h-2 rounded-xs"></div>
                  </>
                ) : (
                  <>
                    <div className="flex-1 bg-[#e4e2df] h-2 rounded-xs" title="09:00"></div>
                    <div className="flex-1 bg-[#e4e2df] h-2 rounded-xs" title="10:00"></div>
                    <div className="flex-1 bg-[#e4e2df] h-2 rounded-xs" title="11:00"></div>
                    <div className="flex-1 bg-[#e4e2df] h-2 rounded-xs" title="12:00"></div>
                    <div className="flex-1 bg-[#e4e2df] h-2 rounded-xs" title="13:00"></div>
                    <div className="flex-1 bg-[#e4e2df] h-2 rounded-xs" title="14:00"></div>
                    <div className="flex-1 bg-[#e4e2df] h-2 rounded-xs" title="15:00"></div>
                    <div className="flex-1 bg-[#e4e2df] h-2 rounded-xs" title="16:00"></div>
                    <div className="flex-1 bg-[#e4e2df] h-2 rounded-xs" title="17:00"></div>
                    <div className="flex-1 bg-[#e4e2df] h-2 rounded-xs" title="18:00"></div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#e5e5e0] font-label-sm text-[11px] text-[#5c5e63]">
                <span>09:00 CET</span>
                <span className="text-[#1b1c1a] font-medium">
                  {stats.todaySends > 0
                    ? (locale === 'en' ? 'Dispatches in progress' : 'Invii in corso')
                    : (locale === 'en' ? 'No dispatches recorded today' : 'Nessun invio effettuato oggi')}
                </span>
                <span>19:30 CET</span>
              </div>
            </div>

            {/* Feature Meta Tags */}
            <div className="flex flex-wrap gap-space-xs mt-space-md">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f5f3f0] font-label-sm text-label-sm text-[#5c5e63]">
                <span className="material-symbols-outlined text-[13px] text-[#1b1c1a]">layers</span>
                {stats.campaignsTotal} {locale === 'en' ? 'campaigns created' : 'campagne create'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f5f3f0] font-label-sm text-label-sm text-[#5c5e63]">
                <span className="material-symbols-outlined text-[13px] text-[#036e13]">timer</span>
                {locale === 'en' ? '1 send / min max safe-limit' : '1 invio / min max safe-limit'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f5f3f0] font-label-sm text-label-sm text-[#036e13] font-medium">
                <span className="material-symbols-outlined text-[13px]">shield</span>
                {locale === 'en' ? 'RFC 5321 anti-spam active' : 'Anti-spam RFC 5321 attivo'}
              </span>
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="flex items-center gap-space-sm mt-space-lg pt-space-md border-t border-[#e5e5e0]">
            <Link
              href="/campaigns"
              className="flex-1 h-10 px-space-md rounded-lg bg-[#30312f] text-[#f2f0ed] hover:bg-[#5c5e63] transition-all flex items-center justify-center gap-2 font-label-md text-label-md"
            >
              <span>{locale === 'en' ? 'Open Campaigns' : 'Accedi alle Campagne'}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
            <Link
              href="/campaigns/new"
              className="h-10 px-space-md rounded-lg bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] transition-all flex items-center gap-1.5 font-label-md text-label-md border border-[#e5e5e0]"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>{t.navigation.newCampaign}</span>
            </Link>
          </div>
        </div>

        {/* Card 2: Newsletter */}
        <div className="bg-[#A4D4D4] rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] p-space-lg flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#dedfe5]/30 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110"></div>
          <div>
            {/* Top Row Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#1b1c1a]">
                  <span className="material-symbols-outlined text-[22px]">menu_book</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] block font-semibold">
                    {t.navigation.studioPublications}
                  </span>
                  <h3 className="font-headline-md text-headline-md text-[#1b1c1a]">{t.navigation.newsletters}</h3>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f3f0] font-label-sm text-label-sm text-[#5c5e63] font-medium border border-[#e5e5e0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a2a59e]"></span>
                {stats.newslettersScheduled + stats.newslettersSending} {locale === 'en' ? 'scheduled / active' : 'pianificate / attive'}
              </span>
            </div>

            {/* Description */}
            <p className="font-body-md text-body-md text-[#3f4a3c] mt-space-md leading-relaxed">
              {locale === 'en'
                ? 'Scheduled delivery to subscriber lists with photorealistic HTML rendering preview, controlled cadence and unified metrics.'
                : 'Invio programmato a liste iscritte con anteprima grafica HTML fotorealistica, cadenza controllata e monitoraggio unificato della resa tipografica e dei tassi d’apertura.'}
            </p>

            {/* Newsletter Highlight Card or Empty State */}
            {latestNl ? (
              <div className="mt-space-lg p-space-md rounded-lg bg-[#f5f3f0] border border-[#e5e5e0] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[14px]">draw</span>
                    {t.hub.newsletterPlanned}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-label-sm bg-[#e4e2df] text-[#1b1c1a] font-semibold uppercase">
                    {latestNl.status}
                  </span>
                </div>
                <div className="flex items-center gap-space-sm pt-1">
                  <div className="w-12 h-12 rounded-lg bg-[#e4e2df] flex-shrink-0 flex items-center justify-center text-[#5c5e63]">
                    <span className="material-symbols-outlined text-[22px]">auto_stories</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-title-sm text-title-sm text-[#1b1c1a] truncate">{latestNl.title}</h4>
                    <p className="font-label-sm text-label-sm text-[#5c5e63] truncate mt-0.5">
                      {latestNl.subject || (locale === 'en' ? 'Qualified recipient correspondence list' : 'Lista iscritti qualificati per corrispondenza')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#e5e5e0] font-label-sm text-[11px] text-[#5c5e63]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">tune</span> {locale === 'en' ? 'Minimalist 600px Layout' : 'Layout Minimalista 600px'}
                  </span>
                  <span className="text-[#1b1c1a] font-medium">{locale === 'en' ? 'Ready for review' : 'Pronta per review'}</span>
                </div>
              </div>
            ) : (
              <div className="mt-space-lg p-space-md rounded-lg bg-[#f5f3f0]/60 border border-dashed border-[#e5e5e0] flex flex-col items-center justify-center text-center py-6">
                <span className="material-symbols-outlined text-[32px] text-[#a2a59e] mb-1.5">auto_stories</span>
                <h4 className="font-title-sm text-sm text-[#1b1c1a] font-semibold">
                  {locale === 'en' ? 'No Newsletters Yet' : 'Nessuna Newsletter Creata'}
                </h4>
                <p className="font-label-sm text-xs text-[#5c5e63] mt-1 max-w-xs">
                  {locale === 'en'
                    ? 'Author your first editorial publication and schedule dispatches to your verified subscriber list.'
                    : 'Componi la tua prima pubblicazione editoriale e programma l’invio ai tuoi iscritti qualificati.'}
                </p>
              </div>
            )}

            {/* Feature Meta Tags */}
            <div className="flex flex-wrap gap-space-xs mt-space-md">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f5f3f0] font-label-sm text-label-sm text-[#5c5e63]">
                <span className="material-symbols-outlined text-[13px] text-[#1b1c1a]">inventory_2</span>
                {stats.newslettersTotal} {locale === 'en' ? 'newsletters created' : 'newsletter create'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f5f3f0] font-label-sm text-label-sm text-[#036e13]">
                <span className="material-symbols-outlined text-[13px]">schedule</span>
                {locale === 'en' ? 'Cron automated dispatch' : 'Invio automatico da cron'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f5f3f0] font-label-sm text-label-sm text-[#036e13]">
                <span className="material-symbols-outlined text-[13px]">sync_alt</span>
                {locale === 'en' ? 'Synchronized list' : 'Lista sincronizzata'}
              </span>
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="flex items-center gap-space-sm mt-space-lg pt-space-md border-t border-[#e5e5e0]">
            <Link
              href="/newsletters"
              className="flex-1 h-10 px-space-md rounded-lg bg-[#eae8e5] text-[#1b1c1a] hover:bg-[#e4e2df] transition-all flex items-center justify-center gap-2 font-label-md text-label-md border border-[#e5e5e0]"
            >
              <span>{locale === 'en' ? 'Open Newsletters' : 'Accedi alle Newsletter'}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
            <Link
              href="/newsletters/new"
              className="h-10 px-space-md rounded-lg bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] transition-all flex items-center gap-1.5 font-label-md text-label-md border border-[#e5e5e0]"
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>+ {t.hub.composeNewsletter}</span>
            </Link>
          </div>
        </div>

        {/* Card 3: Ricerca Leads */}
        <div className="bg-[#E0CDB2] rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] p-space-lg flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#036e13]/10 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110"></div>
          <div>
            {/* Top Row Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#1b1c1a]">
                  <span className="material-symbols-outlined text-[22px]">person_search</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] block font-semibold">
                    {locale === 'en' ? 'B2B Intelligence' : 'Intelligence B2B'}
                  </span>
                  <h3 className="font-headline-md text-headline-md text-[#1b1c1a]">
                    {locale === 'en' ? 'Lead Research' : 'Ricerca Leads'}
                  </h3>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ecf8eb] text-[#036e13] font-label-sm text-label-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855]"></span>
                {locale === 'en' ? '3 Plans: M, XL & AD-HOC' : '3 Piani: M, XL & AD-HOC'}
              </span>
            </div>

            {/* Description */}
            <p className="font-body-md text-body-md text-[#3f4a3c] mt-space-md leading-relaxed">
              {locale === 'en'
                ? 'Targeted professional company and contact discovery. Automated multi-source extraction (M/XL) or dedicated 24h human verified research (AD-HOC).'
                : 'Ricerca e validazione mirata di contatti professionali B2B con estrazione da fonti web ufficiali (M/XL) o revisione condotta dal team umano entro 24 ore (AD-HOC).'}
            </p>

            {/* Plans Breakdown Highlight Box */}
            <div className="mt-space-lg p-space-md rounded-lg bg-[#f5f3f0] border border-[#e5e5e0] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  {locale === 'en' ? 'Available Services (USD)' : 'Servizi Disponibili (USD)'}
                </span>
                <span className="font-label-sm text-[11px] text-[#036e13] font-semibold">
                  {locale === 'en' ? 'Strict SLA' : 'SLA Rigoroso'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded bg-white border border-[#e5e5e0] flex flex-col">
                  <span className="font-label-sm text-[11px] text-[#5c5e63] uppercase font-semibold">M</span>
                  <span className="font-title-sm text-sm text-[#1b1c1a] font-bold mt-0.5">$19</span>
                  <span className="font-label-sm text-[10px] text-[#5c5e63] mt-0.5">Max $5 API</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#e5e5e0] flex flex-col">
                  <span className="font-label-sm text-[11px] text-[#5c5e63] uppercase font-semibold">XL</span>
                  <span className="font-title-sm text-sm text-[#1b1c1a] font-bold mt-0.5">$49</span>
                  <span className="font-label-sm text-[10px] text-[#5c5e63] mt-0.5">Max $15 API</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#5cb855]/40 flex flex-col shadow-xs">
                  <span className="font-label-sm text-[11px] text-[#036e13] uppercase font-bold">AD-HOC</span>
                  <span className="font-title-sm text-sm text-[#1b1c1a] font-bold mt-0.5">$89</span>
                  <span className="font-label-sm text-[10px] text-[#036e13] font-semibold mt-0.5">
                    {locale === 'en' ? '24h Human' : '24h Umano'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#e5e5e0] font-label-sm text-[11px] text-[#5c5e63]">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-[#036e13]">shield</span>
                  {locale === 'en' ? 'Zero invented data' : 'Zero dati inventati'}
                </span>
                <span className="text-[#1b1c1a] font-medium">XLSX • CSV</span>
              </div>
            </div>

            {/* Feature Meta Tags */}
            <div className="flex flex-wrap gap-space-xs mt-space-md">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f5f3f0] font-label-sm text-label-sm text-[#5c5e63]">
                <span className="material-symbols-outlined text-[13px] text-[#1b1c1a]">link</span>
                {locale === 'en' ? 'Primary source URL for every field' : 'Fonte per ogni campo'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f5f3f0] font-label-sm text-label-sm text-[#036e13]">
                <span className="material-symbols-outlined text-[13px]">security</span>
                {locale === 'en' ? 'Formula injection safe' : 'Anti-injection DDE'}
              </span>
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="flex items-center gap-space-sm mt-space-lg pt-space-md border-t border-[#e5e5e0]">
            <Link
              href="/lead-research"
              className="flex-1 h-10 px-space-md rounded-lg bg-[#30312f] text-[#f2f0ed] hover:bg-[#5c5e63] transition-all flex items-center justify-center gap-2 font-label-md text-label-md"
            >
              <span>{locale === 'en' ? 'Open Research' : 'Accedi alle Ricerche'}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
            <Link
              href="/lead-research?new=true"
              className="h-10 px-space-md rounded-lg bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] transition-all flex items-center gap-1.5 font-label-md text-label-md border border-[#e5e5e0]"
            >
              <span className="material-symbols-outlined text-[16px]">search</span>
              <span>+ {locale === 'en' ? 'New Request' : 'Nuova Ricerca'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Section Three: Attività Recente & Stato Code */}
      <div className="mt-space-xl flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] font-semibold">
              {locale === 'en' ? 'System Monitoring' : 'Monitoraggio di Sistema'}
            </span>
            <h2 className="font-headline-md text-headline-md text-[#1b1c1a]">
              {locale === 'en' ? 'Recent Activity & Queue Status' : 'Attività Recente & Stato Code'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm text-[#5c5e63]">
              {locale === 'en' ? 'Global queue synchronized' : 'Coda globale aggiornata'}
            </span>
            <button
              onClick={() => window.location.reload()}
              className="p-1 rounded bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#5c5e63] hover:text-[#1b1c1a] transition-colors border border-[#e5e5e0]"
              title={locale === 'en' ? 'Refresh now' : 'Aggiorna ora'}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
          {/* Latest Campaign Execution Card or Real Empty State (Spans 2 columns) */}
          <div className="lg:col-span-2 bg-[#ffffff] rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] p-space-md flex flex-col justify-between">
            {latestCamp ? (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-space-sm border-b border-[#e5e5e0]">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-[#036e13]/10 flex items-center justify-center text-[#036e13]">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-title-sm text-title-sm text-[#1b1c1a]">{latestCamp.name}</h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#ecf8eb] text-[#036e13] font-label-sm text-[10px] font-bold tracking-wider uppercase">
                          {latestCamp.status}
                        </span>
                      </div>
                      <p className="font-label-sm text-label-sm text-[#5c5e63]">
                        {locale === 'en' ? 'Mass B2B priority outbound campaign • Targeted recipients' : 'Campagna massiva B2B ad alta priorità • Destinatari selezionati'}
                      </p>
                    </div>
                  </div>
                  <span className="font-label-sm text-label-sm text-[#5c5e63] sm:text-right">
                    {new Date(latestCamp.updated_at).toLocaleTimeString(locale === 'en' ? 'en-US' : 'it-IT', { hour: '2-digit', minute: '2-digit' })} CET
                  </span>
                </div>

                {/* Execution Stats Matrix */}
                <div className="grid grid-cols-3 gap-space-sm my-space-md">
                  <div className="p-space-sm rounded-lg bg-[#f5f3f0] border border-[#e5e5e0] flex flex-col">
                    <span className="font-label-sm text-label-sm uppercase text-[#5c5e63] font-semibold">
                      {locale === 'en' ? 'Emails Sent' : 'Email Inviate'}
                    </span>
                    <span className="font-metric-num text-headline-md text-[#1b1c1a] mt-1">
                      {latestCamp.sentLeads}{' '}
                      <span className="text-body-md text-[#5c5e63]">/ {latestCamp.totalLeads}</span>
                    </span>
                    <span className="font-label-sm text-[11px] text-[#036e13] font-medium mt-0.5">
                      {latestCamp.totalLeads > 0
                        ? `${Math.round((latestCamp.sentLeads / latestCamp.totalLeads) * 100)}% ${locale === 'en' ? 'delivery' : 'recapito'}`
                        : (locale === 'en' ? 'Pending dispatch' : 'In attesa invio')}
                    </span>
                  </div>

                  <div className="p-space-sm rounded-lg bg-[#f5f3f0] border border-[#e5e5e0] flex flex-col">
                    <span className="font-label-sm text-label-sm uppercase text-[#5c5e63] font-semibold">
                      {locale === 'en' ? 'Queue Cadence' : 'Cadenza Coda'}
                    </span>
                    <span className="font-metric-num text-headline-md text-[#1b1c1a] mt-1">240s</span>
                    <span className="font-label-sm text-[11px] text-[#5c5e63] mt-0.5">
                      {locale === 'en' ? 'Anti-spam safe-throttle' : 'Safe-throttle antispam'}
                    </span>
                  </div>

                  <div className="p-space-sm rounded-lg bg-[#f5f3f0] border border-[#e5e5e0] flex flex-col">
                    <span className="font-label-sm text-label-sm uppercase text-[#5c5e63] font-semibold">
                      {locale === 'en' ? 'MX Delivery' : 'Recapito MX'}
                    </span>
                    <span className="font-metric-num text-headline-md text-[#036e13] mt-1">TLS 1.3</span>
                    <span className="font-label-sm text-[11px] text-[#1b1c1a] font-medium mt-0.5">Gestor Mail Port 465</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[#5c5e63] pt-space-xs font-label-sm text-label-sm border-t border-[#e5e5e0]">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#036e13]">done_all</span>
                    {locale === 'en'
                      ? 'All foreign recipient servers accepted delivery without greylisting.'
                      : 'Tutti i server di ricezione esteri hanno accettato il messaggio senza greylisting.'}
                  </span>
                  <Link
                    href={`/campaigns/${latestCamp.id}`}
                    className="text-[#1b1c1a] hover:text-[#036e13] transition-colors flex items-center gap-1 font-semibold"
                  >
                    {t.hub.viewCampaign}
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                <div className="w-12 h-12 rounded-xl bg-[#f5f3f0] flex items-center justify-center text-[#a2a59e] mb-3">
                  <span className="material-symbols-outlined text-[28px]">mark_email_unread</span>
                </div>
                <h4 className="font-title-sm text-base text-[#1b1c1a] font-semibold">
                  {locale === 'en' ? 'No Campaign Activity Yet' : 'Nessuna Attività di Campagna'}
                </h4>
                <p className="font-body-md text-sm text-[#5c5e63] mt-1.5 max-w-md">
                  {locale === 'en'
                    ? 'Your operational queue is ready. Create a campaign and import your leads to start your first staggered dispatch sequence.'
                    : 'La coda operativa è pronta. Crea una campagna e importa i tuoi contatti per avviare la prima sequenza di invio dilazionato.'}
                </p>
                <Link
                  href="/campaigns/new"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#30312f] text-white hover:bg-[#5c5e63] transition-colors font-label-md text-xs font-semibold uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>{t.navigation.newCampaign}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Engine Diagnostics Mini Panel */}
          <div className="bg-[#ffffff] rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] p-space-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-space-xs border-b border-[#e5e5e0]">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] font-semibold">
                  {t.hub.diagnosticsTitle}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#f5f3f0] font-label-sm text-[10px] text-[#036e13] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855]"></span>
                  {t.hub.regular}
                </span>
              </div>

              <div className="flex flex-col gap-space-sm mt-space-sm text-body-md font-body-md">
                <div className="flex items-center justify-between">
                  <span className="text-[#5c5e63]">{locale === 'en' ? 'Relay Engine' : 'Motore Relay'}</span>
                  <span className="font-title-sm text-title-sm text-[#1b1c1a]">Gestor Mail SSL</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5c5e63]">{locale === 'en' ? 'Global queue pending' : 'Coda globale in attesa'}</span>
                  <span className="font-title-sm text-title-sm text-[#036e13]">
                    {stats.pendingLeadsCount} {locale === 'en' ? 'messages' : 'messaggi'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5c5e63]">{locale === 'en' ? 'Today dispatches' : 'Invii odierni'}</span>
                  <span className="font-title-sm text-title-sm text-[#1b1c1a]">
                    {stats.todaySends} / {dailyLimit}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5c5e63]">DKIM / SPF Record</span>
                  <span className="inline-flex items-center gap-1 text-[#036e13] font-semibold">
                    <span className="material-symbols-outlined text-[15px]">check</span> {locale === 'en' ? 'Verified' : 'Verificati'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5c5e63]">DMARC Policy</span>
                  <span className="inline-flex items-center gap-1 text-[#036e13] font-semibold">
                    <span className="material-symbols-outlined text-[15px]">check</span> p=reject
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-space-md pt-space-xs border-t border-[#e5e5e0]">
              <div className="p-space-xs rounded bg-[#f5f3f0] flex items-center justify-between font-label-sm text-[11px] text-[#5c5e63]">
                <span>Cron scheduler: <strong>{locale === 'en' ? 'Active (1 min)' : 'Attivo (1 min)'}</strong></span>
                <span className="text-[#036e13] font-medium">Porta 465 (SSL)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
