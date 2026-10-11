'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import LoginModal from '@/components/LoginModal';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function LandingPage() {
  const { t } = useTranslation();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSubmitted, setInviteSubmitted] = useState(false);

  const handleOpenLogin = (mode: 'signin' | 'signup' = 'signin') => {
    setModalMode(mode);
    setIsLoginModalOpen(true);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSubmitted(true);
    setModalMode('signin');
    setIsLoginModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#fbf9f6] font-body-lg text-[#1b1c1a] antialiased selection:bg-[#5cb855]/20 selection:text-[#036e13]">
      {/* FIXED LUXURY HEADER */}
      <header className="fixed top-0 w-full z-40 bg-[#fbf9f6]/90 backdrop-blur-md border-b border-[#eae8e5]/60 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-20 max-w-[1440px] mx-auto px-6 sm:px-10 flex items-center justify-between">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-4">
            <Link href="/landing" title={t.common.appName} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 border border-[#e5e5e0]">
                <img src="/icon.png" alt="MAIL-K" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-headline-md text-xl tracking-wider text-[#1b1c1a] uppercase font-bold">
                    {t.common.appName}
                  </span>
                  <span className="font-label-sm text-[10px] tracking-wider text-[#036e13] bg-[#5cb855]/20 border border-[#5cb855]/30 uppercase px-2 py-0.5 rounded-full font-semibold">
                    DISPATCH
                  </span>
                </div>
                <span className="font-label-sm text-[11px] tracking-[0.22em] text-[#6f7a6b] uppercase -mt-0.5">
                  {t.common.appTagline}
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8">
            <a
              href="#caratteristiche"
              className="text-sm font-semibold text-[#1b1c1a] hover:text-[#036e13] transition-colors"
            >
              {t.landing.nav.features}
            </a>
            <a
              href="#deliverability"
              className="text-sm text-[#5c5e63] hover:text-[#1b1c1a] transition-colors"
            >
              {t.landing.nav.deliverability}
            </a>
            <a
              href="#anteprima"
              className="text-sm text-[#5c5e63] hover:text-[#1b1c1a] transition-colors"
            >
              {t.landing.nav.workflow}
            </a>
            <a
              href="#richiedi-invito"
              className="text-sm text-[#5c5e63] hover:text-[#1b1c1a] transition-colors"
            >
              {t.landing.nav.pricing}
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageSwitcher variant="transparent" />
            <button
              type="button"
              onClick={() => handleOpenLogin('signin')}
              className="inline-flex items-center justify-center bg-[#5cb855] hover:bg-[#036e13] text-white font-label-md text-xs uppercase px-5 py-2.5 rounded-lg shadow-[0_2px_8px_rgba(3,110,19,0.15)] transition-all cursor-pointer font-semibold tracking-wider"
            >
              {t.landing.nav.requestAccess}
            </button>
            <button
              type="button"
              onClick={() => handleOpenLogin('signin')}
              className="w-8 h-8 rounded-full bg-[#036e13] text-white flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
              title="Console login"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="w-full pt-20 max-w-[1440px] mx-auto px-6 sm:px-10">
        <div className="flex flex-col w-full">
          {/* HERO SECTION */}
          <section className="relative w-full py-16 lg:py-24 overflow-hidden">
            {/* Ambient Blur Background Accents */}
            <div className="absolute -top-32 right-12 w-96 h-96 rounded-full bg-[#5cb855]/10 blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 -left-20 w-80 h-80 rounded-full bg-[#eae8e5]/60 blur-2xl pointer-events-none" />

            <div className="relative max-w-[1280px] mx-auto flex flex-col items-center text-center">
              {/* Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#efeeeb] border border-[#bfcab8]/30 shadow-xs mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5cb855] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5cb855]" />
                </span>
                <span className="font-label-sm text-xs text-[#1b1c1a] uppercase tracking-widest font-semibold">
                  {t.landing.hero.editionBadge}
                </span>
              </div>

              {/* Hero Monumental Title */}
              <h1 className="font-headline-xl text-3xl sm:text-5xl lg:text-[56px] text-[#1b1c1a] max-w-4xl tracking-tight leading-[1.15] mb-6">
                {t.landing.hero.title}
              </h1>

              {/* Subtitle */}
              <p className="font-body-lg text-base sm:text-lg text-[#5c5e63] max-w-2xl mb-10 leading-relaxed">
                {t.landing.hero.subtitle}
              </p>

              {/* CTA Action Group */}
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto">
                <a
                  href="#richiedi-invito"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1c1e1c] hover:bg-[#5cb855] text-white font-label-md text-xs uppercase px-8 py-3.5 rounded-xl shadow-md transition-all duration-200 font-semibold"
                >
                  <span>{t.landing.hero.primaryCta}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
                <a
                  href="#anteprima"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#efeeeb] hover:bg-[#eae8e5] text-[#1b1c1a] font-label-md text-xs uppercase px-8 py-3.5 rounded-xl shadow-xs transition-all duration-200 font-semibold"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#036e13]">play_circle</span>
                  <span>{t.landing.hero.secondaryCta}</span>
                </a>
              </div>

              {/* KPI Strip: Floating Glass Surface */}
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-[#eae8e5] shadow-lg">
                <div className="flex items-center gap-4 p-4 bg-[#f5f3f0] rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-[#5cb855]/15 flex items-center justify-center text-[#036e13]">
                    <span className="material-symbols-outlined text-[24px]">verified_user</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-metric-num text-2xl font-bold text-[#1b1c1a]">{t.landing.kpi.deliverabilityTitle}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5cb855] text-white tracking-wider uppercase">
                        {t.landing.kpi.deliverabilityBadge}
                      </span>
                    </div>
                    <span className="font-label-sm text-xs text-[#6f7a6b] uppercase tracking-wider block mt-0.5">
                      {t.landing.kpi.deliverabilitySubtitle}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-[#f5f3f0] rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-[#eae8e5] flex items-center justify-center text-[#1b1c1a]">
                    <span className="material-symbols-outlined text-[24px]">timer</span>
                  </div>
                  <div className="text-left">
                    <span className="font-metric-num text-2xl font-bold text-[#1b1c1a]">{t.landing.kpi.throttlingTitle}</span>
                    <span className="font-label-sm text-xs text-[#6f7a6b] uppercase tracking-wider block mt-0.5">
                      {t.landing.kpi.throttlingSubtitle}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-[#f5f3f0] rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-[#eae8e5] flex items-center justify-center text-[#1b1c1a]">
                    <span className="material-symbols-outlined text-[24px]">dns</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-metric-num text-2xl font-bold text-[#1b1c1a]">{t.landing.kpi.smtpTitle}</span>
                      <span className="font-label-sm text-[11px] text-[#036e13] font-bold uppercase tracking-wider">
                        {t.landing.kpi.smtpBadge}
                      </span>
                    </div>
                    <span className="font-label-sm text-xs text-[#6f7a6b] uppercase tracking-wider block mt-0.5">
                      {t.landing.kpi.smtpSubtitle}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SHOWCASE INTERFACCIA / APP PREVIEW */}
          <section className="w-full py-12 lg:py-16" id="anteprima">
            <div className="max-w-[1360px] mx-auto bg-white rounded-2xl border border-[#eae8e5] shadow-xl p-6 sm:p-8">
              {/* Cockpit Window Top Bar */}
              <div className="flex flex-wrap items-center justify-between pb-6 border-b border-[#eae8e5] gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#eae8e5] inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#eae8e5] inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#eae8e5] inline-block" />
                  </div>
                  <span className="font-label-sm text-xs text-[#6f7a6b] uppercase tracking-widest ml-2">
                    {t.landing.cockpit.clusterSession}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-[#efeeeb] px-3.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#5cb855] animate-pulse" />
                  <span className="font-label-sm text-xs text-[#1b1c1a] font-semibold uppercase">
                    {t.landing.cockpit.engineStatus}
                  </span>
                </div>
              </div>

              {/* App Interface Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                {/* Left Panel: Campaign Flow & Queue Monitors */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {/* Flow Type Switcher Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Massive Outbound Card */}
                    <div className="p-5 bg-[#f5f3f0] rounded-xl border border-[#eae8e5] relative overflow-hidden shadow-xs">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-label-sm text-xs text-[#036e13] uppercase font-bold tracking-wider">
                          {t.landing.cockpit.primaryFlowBadge}
                        </span>
                        <span className="inline-flex items-center gap-1 font-label-sm text-[11px] bg-[#5cb855]/20 text-[#036e13] px-2 py-0.5 rounded-full font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855]" />
                          {t.landing.cockpit.runningStatus}
                        </span>
                      </div>
                      <h3 className="font-title-sm text-base text-[#1b1c1a] font-bold mb-1">
                        {t.landing.cockpit.primaryFlowTitle}
                      </h3>
                      <p className="font-body-md text-xs text-[#5c5e63] mb-4">
                        {t.landing.cockpit.primaryFlowSubtitle}
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-label-sm text-xs text-[#5c5e63]">
                          <span>{t.landing.cockpit.queueProgress}</span>
                          <span className="font-semibold text-[#1b1c1a]">342 / 450</span>
                        </div>
                        <div className="w-full h-2 bg-[#eae8e5] rounded-full overflow-hidden">
                          <div className="h-full bg-[#5cb855] rounded-full w-[76%] transition-all duration-500" />
                        </div>
                      </div>
                    </div>

                    {/* Newsletter Card */}
                    <div className="p-5 bg-[#f5f3f0] rounded-xl border border-[#eae8e5] relative overflow-hidden shadow-xs">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-label-sm text-xs text-[#6f7a6b] uppercase font-bold tracking-wider">
                          {t.landing.cockpit.editorialFlowBadge}
                        </span>
                        <span className="font-label-sm text-[11px] bg-[#eae8e5] text-[#1b1c1a] px-2 py-0.5 rounded-full font-semibold">
                          {t.landing.cockpit.scheduledStatus}
                        </span>
                      </div>
                      <h3 className="font-title-sm text-base text-[#1b1c1a] font-bold mb-1">
                        {t.landing.cockpit.editorialFlowTitle}
                      </h3>
                      <p className="font-body-md text-xs text-[#5c5e63] mb-4">
                        {t.landing.cockpit.editorialFlowSubtitle}
                      </p>
                      <div className="flex items-center justify-between font-label-sm text-xs text-[#5c5e63] pt-1">
                        <span>{t.landing.cockpit.dispatchWindow}</span>
                        <span className="font-semibold text-[#1b1c1a]">09:30 CET</span>
                      </div>
                    </div>
                  </div>

                  {/* Jitter Delay Timeline Visualization */}
                  <div className="p-5 bg-[#f5f3f0] rounded-xl border border-[#eae8e5] shadow-xs">
                    <div className="flex flex-wrap items-center justify-between mb-4">
                      <div>
                        <span className="font-label-sm text-xs text-[#6f7a6b] uppercase tracking-wider block">
                          {t.landing.cockpit.algorithmTitle}
                        </span>
                        <h4 className="font-title-sm text-sm sm:text-base text-[#1b1c1a] font-bold">
                          {t.landing.cockpit.algorithmHeadline}
                        </h4>
                      </div>
                      <span className="font-label-sm text-xs bg-white px-2.5 py-1 rounded-md text-[#036e13] font-semibold border border-[#bfcab8]/40">
                        {t.landing.cockpit.zeroPatternBadge}
                      </span>
                    </div>

                    {/* Bar Timeline SVG */}
                    <div className="w-full bg-white p-3.5 rounded-lg border border-[#eae8e5]">
                      <svg className="w-full h-20 overflow-visible text-[#5cb855]" fill="none" viewBox="0 0 540 80">
                        <line stroke="currentColor" strokeDasharray="3 3" strokeOpacity="0.2" x1="10" x2="530" y1="70" y2="70" />
                        <rect fill="currentColor" fillOpacity="0.7" height="40" rx="2" width="8" x="25" y="30" />
                        <rect fill="currentColor" height="55" rx="2" width="8" x="55" y="15" />
                        <rect fill="currentColor" fillOpacity="0.5" height="25" rx="2" width="8" x="85" y="45" />
                        <rect fill="currentColor" fillOpacity="0.85" height="50" rx="2" width="8" x="115" y="20" />
                        <rect fill="currentColor" fillOpacity="0.6" height="35" rx="2" width="8" x="145" y="35" />
                        <rect fill="currentColor" height="60" rx="2" width="8" x="175" y="10" />
                        <rect fill="currentColor" fillOpacity="0.4" height="20" rx="2" width="8" x="205" y="50" />
                        <rect fill="currentColor" fillOpacity="0.8" height="45" rx="2" width="8" x="235" y="25" />
                        <rect fill="currentColor" fillOpacity="0.65" height="30" rx="2" width="8" x="265" y="40" />
                        <rect fill="currentColor" fillOpacity="0.9" height="52" rx="2" width="8" x="295" y="18" />
                        <rect fill="currentColor" fillOpacity="0.45" height="22" rx="2" width="8" x="325" y="48" />
                        <rect fill="currentColor" fillOpacity="0.85" height="48" rx="2" width="8" x="355" y="22" />
                        <rect fill="currentColor" fillOpacity="0.6" height="32" rx="2" width="8" x="385" y="38" />
                        <rect fill="currentColor" height="58" rx="2" width="8" x="415" y="12" />
                        <rect fill="currentColor" fillOpacity="0.55" height="28" rx="2" width="8" x="445" y="42" />
                        <rect fill="currentColor" fillOpacity="0.75" height="42" rx="2" width="8" x="475" y="28" />
                        <rect fill="currentColor" fillOpacity="0.85" height="50" rx="2" width="8" x="505" y="20" />
                      </svg>
                      <div className="flex justify-between font-label-sm text-[11px] text-[#6f7a6b] mt-1 px-1">
                        <span>00:00 (124s)</span>
                        <span className="font-semibold text-[#036e13]">{t.landing.cockpit.nextRelease}</span>
                        <span>04:00 (312s)</span>
                      </div>
                    </div>

                    {/* Queue Mini Stream */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between py-1.5 px-3 bg-white rounded-lg text-xs border border-[#eae8e5]">
                        <span className="font-mono text-[#1b1c1a]">TO: client-contact@enterprise.com</span>
                        <span className="text-[#036e13] font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span> 250 OK (Safe Relay)
                        </span>
                        <span className="text-[#6f7a6b] text-[11px]">14:22:04</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-3 bg-white rounded-lg text-xs border border-[#eae8e5]">
                        <span className="font-mono text-[#1b1c1a]">TO: director@globalbrand.com</span>
                        <span className="text-[#036e13] font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span> 250 OK (DKIM Validated)
                        </span>
                        <span className="text-[#6f7a6b] text-[11px]">14:18:12</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Photorealistic Architectural Dispatch Preview */}
                <div className="lg:col-span-5 bg-[#f5f3f0] rounded-xl p-5 border border-[#eae8e5] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 bg-white p-3 rounded-lg border border-[#eae8e5]">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-[11px] text-[#6f7a6b] uppercase">
                          {t.landing.cockpit.simulationTitle}
                        </span>
                        <span className="font-title-sm text-xs sm:text-sm text-[#1b1c1a] font-semibold">
                          {t.landing.cockpit.simulationClient}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[#6f7a6b]">devices</span>
                    </div>

                    {/* Email Letterhead Body */}
                    <div className="bg-white rounded-lg p-5 border border-[#eae8e5] shadow-inner space-y-3">
                      <div className="flex justify-between items-center text-xs text-[#6f7a6b] pb-2 border-b border-[#eae8e5]">
                        <span><strong>{t.landing.cockpit.from}:</strong> stefano@arkitecna.com</span>
                        <span>14:32 (PST)</span>
                      </div>
                      <div className="text-xs text-[#1b1c1a] font-medium pb-2 border-b border-[#eae8e5]">
                        <span><strong>{t.landing.cockpit.subject}:</strong> {t.landing.cockpit.subjectExample}</span>
                      </div>

                      {/* Architecture Image Preview */}
                      <div className="w-full h-44 rounded-md overflow-hidden relative shadow-sm">
                        <img
                          alt="Photorealistic visualization"
                          className="w-full h-full object-cover"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7H5o9wYLlefmPEOfKczRMfOvCFhhIiBUQPrqjNrB_qUzDwv0e3gDOokcm8duTlJXrddfaHRHWsCSD68oQ5YbLmwpQuk638qqCUaCWdn2WfrdprwmguMz4GEli4qmReYJqd9lg_djHufYa92RlQ6KQ_R05QftcvNvqQlEHhfkOl8CaPdcLIcZTiSUMqFIcI5n7jmla9yg3DoCEIpVAoP8cevnJD47wFOaRRrFIV8I7eTFX-JEpaQGW"
                        />
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-[#1c1e1c]/80 text-[#f2f0ed] text-[10px] tracking-widest uppercase font-semibold">
                          {t.landing.cockpit.technicalAttachmentBadge}
                        </span>
                      </div>

                      <div className="space-y-2 pt-1 text-xs sm:text-sm">
                        <p className="text-[#1b1c1a] font-medium">{t.landing.cockpit.recipientGreeting}</p>
                        <p className="text-[#5c5e63] leading-relaxed">
                          {t.landing.cockpit.messageExcerpt}
                        </p>
                        <div className="p-2.5 rounded bg-[#efeeeb] text-xs text-[#1b1c1a] font-mono border border-[#eae8e5]">
                          • {t.landing.cockpit.dynamicTagLabel}: <span className="text-[#036e13] font-bold">&#123;&#123;CompanyName&#125;&#125;</span> → Olson Kundig Partners
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 flex items-center justify-between text-xs text-[#6f7a6b]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#036e13]">lock</span>
                      {t.landing.cockpit.encryptedRfc}
                    </span>
                    <span className="font-semibold text-[#036e13]">{t.landing.cockpit.spamScoreClean}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SEZIONE: I PILASTRI DEL MOTORE */}
          <section className="w-full py-16 lg:py-24" id="caratteristiche">
            <div className="max-w-[1280px] mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <span className="font-label-sm text-xs text-[#6f7a6b] uppercase tracking-widest block mb-2 font-semibold">
                  {t.landing.pillars.sectionBadge}
                </span>
                <h2 className="font-headline-lg text-3xl sm:text-4xl text-[#1b1c1a] font-bold">
                  {t.landing.pillars.title}
                </h2>
                <p className="font-body-md text-base text-[#5c5e63] mt-3">
                  {t.landing.pillars.subtitle}
                </p>
              </div>

              {/* 3 Editorial Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pillar 1 */}
                <div className="flex flex-col justify-between p-8 rounded-2xl bg-white border border-[#eae8e5] shadow-md hover:shadow-lg transition-all duration-300">
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-[#efeeeb] flex items-center justify-center text-[#036e13] mb-6">
                      <span className="material-symbols-outlined text-[28px]">hourglass_empty</span>
                    </div>
                    <span className="font-label-sm text-xs text-[#036e13] uppercase font-bold tracking-wider">
                      {t.landing.pillars.pillar1Badge}
                    </span>
                    <h3 className="font-title-sm text-lg text-[#1b1c1a] font-bold mt-1 mb-3">
                      {t.landing.pillars.pillar1Title}
                    </h3>
                    <p className="font-body-md text-sm text-[#5c5e63] leading-relaxed">
                      {t.landing.pillars.pillar1Description}
                    </p>
                  </div>
                  <div className="mt-6 pt-3 bg-[#f5f3f0] p-3 rounded-lg text-xs font-mono text-[#6f7a6b]">
                    jitter_span: random(120, 380) ± 15%
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="flex flex-col justify-between p-8 rounded-2xl bg-white border border-[#eae8e5] shadow-md hover:shadow-lg transition-all duration-300">
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-[#efeeeb] flex items-center justify-center text-[#036e13] mb-6">
                      <span className="material-symbols-outlined text-[28px]">sync_alt</span>
                    </div>
                    <span className="font-label-sm text-xs text-[#036e13] uppercase font-bold tracking-wider">
                      {t.landing.pillars.pillar2Badge}
                    </span>
                    <h3 className="font-title-sm text-lg text-[#1b1c1a] font-bold mt-1 mb-3">
                      {t.landing.pillars.pillar2Title}
                    </h3>
                    <p className="font-body-md text-sm text-[#5c5e63] leading-relaxed">
                      {t.landing.pillars.pillar2Description}
                    </p>
                  </div>
                  <div className="mt-6 pt-3 bg-[#f5f3f0] p-3 rounded-lg text-xs font-mono text-[#6f7a6b]">
                    fallback_strategy: auto_abort_on_null
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="flex flex-col justify-between p-8 rounded-2xl bg-white border border-[#eae8e5] shadow-md hover:shadow-lg transition-all duration-300">
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-[#efeeeb] flex items-center justify-center text-[#036e13] mb-6">
                      <span className="material-symbols-outlined text-[28px]">hub</span>
                    </div>
                    <span className="font-label-sm text-xs text-[#036e13] uppercase font-bold tracking-wider">
                      {t.landing.pillars.pillar3Badge}
                    </span>
                    <h3 className="font-title-sm text-lg text-[#1b1c1a] font-bold mt-1 mb-3">
                      {t.landing.pillars.pillar3Title}
                    </h3>
                    <p className="font-body-md text-sm text-[#5c5e63] leading-relaxed">
                      {t.landing.pillars.pillar3Description}
                    </p>
                  </div>
                  <div className="mt-6 pt-3 bg-[#f5f3f0] p-3 rounded-lg text-xs font-mono text-[#6f7a6b]">
                    topology: multi_mta_shared_reputation
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* METRICHE DI CONFORMITÀ & DELIVERABILITY */}
          <section className="w-full py-16 lg:py-24" id="deliverability">
            <div className="max-w-[1280px] mx-auto bg-white rounded-2xl p-8 sm:p-12 border border-[#eae8e5] shadow-lg">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Description Left */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5cb855]/20 text-[#036e13] self-start font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#5cb855]" />
                    <span className="font-label-sm text-xs uppercase font-bold">{t.landing.deliverability.relayBadge}</span>
                  </div>
                  <h2 className="font-headline-lg text-3xl sm:text-4xl text-[#1b1c1a] font-bold leading-tight">
                    {t.landing.deliverability.title}
                  </h2>
                  <p className="font-body-md text-sm text-[#5c5e63] leading-relaxed">
                    {t.landing.deliverability.description}
                  </p>
                  <div className="p-4 bg-[#f5f3f0] rounded-xl border border-[#eae8e5] mt-2">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#036e13] text-[24px]">verified</span>
                      <div>
                        <span className="font-label-md text-sm text-[#1b1c1a] font-bold block">
                          {t.landing.deliverability.dkimCertTitle}
                        </span>
                        <span className="font-body-md text-xs text-[#6f7a6b]">
                          {t.landing.deliverability.dkimCertDescription}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comparison Table Right */}
                <div className="lg:col-span-7 bg-[#f5f3f0] rounded-2xl p-6 border border-[#eae8e5] shadow-xs overflow-x-auto">
                  <div className="min-w-[480px]">
                    <div className="grid grid-cols-3 pb-3 font-label-sm text-xs uppercase text-[#6f7a6b] font-bold tracking-wider border-b border-[#eae8e5]">
                      <span>{t.landing.deliverability.tableBenchmark}</span>
                      <span className="text-center">{t.landing.deliverability.tableLegacy}</span>
                      <span className="text-right text-[#036e13] font-bold">{t.landing.deliverability.tableMailK}</span>
                    </div>
                    <div className="divide-y divide-[#eae8e5] font-body-md text-sm">
                      <div className="grid grid-cols-3 py-3.5 items-center">
                        <span className="text-[#1b1c1a] font-semibold">{t.landing.deliverability.inboxPlacementRate}</span>
                        <span className="text-center text-[#6f7a6b]">72.0%</span>
                        <span className="text-right font-metric-num text-lg font-bold text-[#036e13]">98.4%</span>
                      </div>
                      <div className="grid grid-cols-3 py-3.5 items-center">
                        <span className="text-[#1b1c1a] font-semibold">{t.landing.deliverability.dispatchInterval}</span>
                        <span className="text-center text-[#6f7a6b]">{t.landing.deliverability.blastFlagged}</span>
                        <span className="text-right text-[#1b1c1a] font-mono font-medium">120s - 380s Jitter</span>
                      </div>
                      <div className="grid grid-cols-3 py-3.5 items-center">
                        <span className="text-[#1b1c1a] font-semibold">{t.landing.deliverability.dynamicErrors}</span>
                        <span className="text-center text-[#6f7a6b]">{t.landing.deliverability.sendsEmptyPlaceholder}</span>
                        <span className="text-right text-[#036e13] font-medium flex items-center justify-end gap-1">
                          <span className="material-symbols-outlined text-[16px]">shield</span> {t.landing.deliverability.safeQueueAbort}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 py-3.5 items-center">
                        <span className="text-[#1b1c1a] font-semibold">{t.landing.deliverability.domainIsolation}</span>
                        <span className="text-center text-[#6f7a6b]">{t.landing.deliverability.sharedOverloadedIps}</span>
                        <span className="text-right text-[#1b1c1a] font-medium">{t.landing.deliverability.dedicatedRelay}</span>
                      </div>
                      <div className="grid grid-cols-3 py-3.5 items-center">
                        <span className="text-[#1b1c1a] font-semibold">{t.landing.deliverability.attachmentRendering}</span>
                        <span className="text-center text-[#6f7a6b]">{t.landing.deliverability.lossyCompression}</span>
                        <span className="text-right text-[#1b1c1a] font-medium">{t.landing.deliverability.losslessPhotorealistic}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SOCIAL PROOF / CASE STUDY */}
          <section className="w-full py-16 lg:py-24">
            <div className="max-w-[1280px] mx-auto bg-[#efeeeb] rounded-2xl p-8 sm:p-12 border border-[#eae8e5] shadow-xs relative overflow-hidden">
              <span className="material-symbols-outlined text-[140px] text-[#dbdad7]/40 absolute -top-10 -right-6 select-none pointer-events-none">
                format_quote
              </span>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Director Portrait Image */}
                <div className="lg:col-span-4">
                  <div className="w-full h-80 rounded-xl overflow-hidden shadow-md border border-white">
                    <img
                      alt="Stefano Martini portrait"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqslr7DKGddg4ioMyPShSEmXHUBn_QAcUipr1W9O1iAQKCPRwvh5R0ijiTsah3qimKyclBTWOXu6CX8kehrR-j1uPGQMtEDFMBbSvpnT92o52Eu8ZRC6J7mXI48vvCvICeACrlc8eHdBX32qBFzx07Lb-6bxbsEWdqeITRVzagZyby-cIP2HCAYeQufY8l8rEZapLp47bNtk2eed8QoaJ7v_vgm8iBTLAzhSnv_PY8cLIvzSXVHmAS"
                    />
                  </div>
                </div>

                {/* Quote Content */}
                <div className="lg:col-span-8 flex flex-col justify-center">
                  <div className="flex items-center gap-1 text-[#036e13] mb-3">
                    <span className="material-symbols-outlined text-[18px]">star</span>
                    <span className="material-symbols-outlined text-[18px]">star</span>
                    <span className="material-symbols-outlined text-[18px]">star</span>
                    <span className="material-symbols-outlined text-[18px]">star</span>
                    <span className="material-symbols-outlined text-[18px]">star</span>
                    <span className="font-label-sm text-xs text-[#6f7a6b] ml-2 uppercase tracking-widest font-semibold">
                      {t.landing.caseStudy.badge}
                    </span>
                  </div>

                  <blockquote className="font-headline-lg text-2xl sm:text-3xl text-[#1b1c1a] italic leading-snug mb-6">
                    &ldquo;{t.landing.caseStudy.quote}&rdquo;
                  </blockquote>

                  <div>
                    <span className="font-title-sm text-base text-[#1b1c1a] block font-bold">
                      {t.landing.caseStudy.author}
                    </span>
                    <span className="font-body-md text-xs text-[#5c5e63]">
                      {t.landing.caseStudy.role}
                    </span>
                  </div>

                  {/* Highlight Metric Badges */}
                  <div className="flex flex-wrap gap-6 mt-6 pt-6 bg-white/80 p-4 rounded-xl border border-white">
                    <div>
                      <span className="font-metric-num text-2xl font-bold text-[#1b1c1a] block">+412%</span>
                      <span className="font-label-sm text-xs text-[#6f7a6b] uppercase tracking-wider">
                        {t.landing.caseStudy.metric1Label}
                      </span>
                    </div>
                    <div className="w-px h-10 bg-[#eae8e5] my-auto" />
                    <div>
                      <span className="font-metric-num text-2xl font-bold text-[#1b1c1a] block">0</span>
                      <span className="font-label-sm text-xs text-[#6f7a6b] uppercase tracking-wider">
                        {t.landing.caseStudy.metric2Label}
                      </span>
                    </div>
                    <div className="w-px h-10 bg-[#eae8e5] my-auto" />
                    <div>
                      <span className="font-metric-num text-2xl font-bold text-[#036e13] block">€ 1.8M</span>
                      <span className="font-label-sm text-xs text-[#6f7a6b] uppercase tracking-wider">
                        {t.landing.caseStudy.metric3Label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CALL TO ACTION FINALE */}
          <section className="w-full py-16 lg:py-24 mb-12" id="richiedi-invito">
            <div className="max-w-[1280px] mx-auto bg-white rounded-2xl p-8 sm:p-14 border border-[#eae8e5] shadow-xl text-center relative overflow-hidden">
              <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#5cb855]/10 blur-3xl pointer-events-none" />

              <div className="max-w-2xl mx-auto relative z-10">
                <span className="font-label-sm text-xs text-[#036e13] uppercase font-bold tracking-widest block mb-3">
                  {t.landing.cta.badge}
                </span>
                <h2 className="font-headline-xl text-3xl sm:text-4xl text-[#1b1c1a] font-bold mb-4">
                  {t.landing.cta.title}
                </h2>
                <p className="font-body-md text-sm sm:text-base text-[#5c5e63] mb-8 leading-relaxed">
                  {t.landing.cta.description}
                </p>

                {/* Form Box */}
                {!inviteSubmitted ? (
                  <form
                    onSubmit={handleInviteSubmit}
                    className="flex flex-col sm:flex-row items-center gap-2 bg-[#f5f3f0] p-2 rounded-xl shadow-inner max-w-lg mx-auto border border-[#eae8e5]"
                  >
                    <input
                      type="email"
                      required
                      placeholder={t.landing.cta.inputPlaceholder}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-transparent px-4 py-3 text-[#1b1c1a] font-body-md text-sm placeholder-[#6f7a6b] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="w-full sm:w-auto shrink-0 bg-[#5cb855] hover:bg-[#036e13] text-white font-label-md text-xs uppercase px-6 py-3 rounded-lg shadow-md transition-all duration-200 font-semibold cursor-pointer"
                    >
                      {t.landing.cta.buttonText}
                    </button>
                  </form>
                ) : (
                  <div className="p-6 bg-[#ecf8eb] border border-[#5cb855]/30 rounded-xl text-center max-w-lg mx-auto">
                    <span className="material-symbols-outlined text-[#036e13] text-[32px] block mx-auto mb-2">
                      check_circle
                    </span>
                    <span className="font-title-sm text-base text-[#1b1c1a] block font-bold">
                      {t.landing.cta.successTitle}
                    </span>
                    <p className="font-body-md text-xs text-[#5c5e63] mt-1">
                      {t.landing.cta.successDescription.replace('{email}', inviteEmail)}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-6 mt-8 font-label-sm text-xs text-[#6f7a6b] uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#036e13]">lock</span> {t.landing.cta.gdprBadge}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#036e13]">bolt</span> {t.landing.cta.setupBadge}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#036e13]">shield</span> {t.landing.cta.noLockInBadge}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* LUXURY ATELIER FOOTER */}
      <footer className="w-full bg-[#f5f3f0] border-t border-[#eae8e5] mt-16">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
            <div className="md:col-span-5 flex flex-col gap-3">
              <span className="font-headline-md text-xl uppercase tracking-wider text-[#1b1c1a] font-bold">
                {t.common.appName}
              </span>
              <p className="font-body-md text-xs text-[#5c5e63] max-w-md leading-relaxed">
                {t.landing.footer.description}
              </p>
              <div className="flex items-center gap-2 mt-2 text-[#6f7a6b]">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span className="font-label-sm text-[11px] uppercase tracking-wider">
                  {t.landing.footer.isoCert}
                </span>
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col gap-2">
              <span className="font-label-sm text-xs text-[#6f7a6b] uppercase tracking-wider mb-2 font-semibold">
                {t.landing.footer.platformHeader}
              </span>
              <a href="#caratteristiche" className="font-body-md text-xs text-[#5c5e63] hover:text-[#1b1c1a] transition-colors">
                {t.landing.footer.platformFeatures}
              </a>
              <a href="#deliverability" className="font-body-md text-xs text-[#5c5e63] hover:text-[#1b1c1a] transition-colors">
                {t.landing.footer.platformWarmup}
              </a>
              <a href="#anteprima" className="font-body-md text-xs text-[#5c5e63] hover:text-[#1b1c1a] transition-colors">
                {t.landing.footer.platformWorkflow}
              </a>
              <a href="#richiedi-invito" className="font-body-md text-xs text-[#5c5e63] hover:text-[#1b1c1a] transition-colors">
                {t.landing.footer.platformPricing}
              </a>
            </div>

            <div className="md:col-span-4 flex flex-col gap-2">
              <span className="font-label-sm text-xs text-[#6f7a6b] uppercase tracking-wider mb-2 font-semibold">
                {t.landing.footer.complianceHeader}
              </span>
              <div className="p-4 rounded-xl bg-[#efeeeb] border border-[#eae8e5]">
                <span className="font-label-sm text-xs text-[#1b1c1a] font-semibold block mb-1">
                  {t.landing.footer.complianceTitle}
                </span>
                <p className="font-body-md text-xs text-[#5c5e63] leading-relaxed">
                  {t.landing.footer.complianceDescription}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-[#eae8e5] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-body-md text-xs text-[#5c5e63]">
              {t.landing.footer.rights}
            </span>
            <div className="flex items-center gap-6">
              <a
                href="https://arkai.dev/app/PPmailk"
                target="_blank"
                rel="noopener noreferrer"
                className="font-label-sm text-[11px] text-[#6f7a6b] hover:text-[#1b1c1a] uppercase tracking-wider transition-colors"
              >
                {t.landing.footer.privacyPolicy}
              </a>
              <a
                href="https://arkai.dev/app/TSmailk"
                target="_blank"
                rel="noopener noreferrer"
                className="font-label-sm text-[11px] text-[#6f7a6b] hover:text-[#1b1c1a] uppercase tracking-wider transition-colors"
              >
                {t.landing.footer.termsOfService}
              </a>
              <a href="#caratteristiche" className="font-label-sm text-[11px] text-[#6f7a6b] hover:text-[#1b1c1a] uppercase tracking-wider transition-colors">
                {t.landing.footer.networkArchitecture}
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* INTERACTIVE LOGIN MODAL (LOGIN POP-UP) */}
      <LoginModal
        isOpen={isLoginModalOpen}
        initialMode={modalMode}
        initialEmail={inviteEmail}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
