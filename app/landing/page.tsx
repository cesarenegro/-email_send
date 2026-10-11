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
            <Link
              href="/faq"
              className="text-sm text-[#5c5e63] hover:text-[#1b1c1a] transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/guida"
              className="text-sm text-[#5c5e63] hover:text-[#1b1c1a] transition-colors"
            >
              {t.navigation.userGuide}
            </Link>
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
                  <div className="mt-6 pt-3 bg-[#f5f3f0] p-3 rounded-lg text-xs font-medium text-[#1b1c1a]">
                    {t.landing.pillars.pillar1Footer}
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
                  <div className="mt-6 pt-3 bg-[#f5f3f0] p-3 rounded-lg text-xs font-medium text-[#1b1c1a]">
                    {t.landing.pillars.pillar2Footer}
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
                  <div className="mt-6 pt-3 bg-[#f5f3f0] p-3 rounded-lg text-xs font-medium text-[#1b1c1a]">
                    {t.landing.pillars.pillar3Footer}
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

          {/* SOCIAL PROOF / CASE STUDIES */}
          <section className="w-full py-16 lg:py-24">
            <div className="max-w-[1280px] mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="font-label-sm text-xs text-[#036e13] uppercase font-bold tracking-widest block mb-2">
                  {t.landing.caseStudies.sectionBadge}
                </span>
                <h2 className="font-headline-xl text-3xl sm:text-4xl text-[#1b1c1a] font-bold">
                  {t.landing.caseStudies.title}
                </h2>
                <p className="font-body-md text-base text-[#5c5e63] mt-3">
                  {t.landing.caseStudies.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Case 1: Stefano Martini */}
                <div className="flex flex-col justify-between bg-[#efeeeb] rounded-2xl p-7 sm:p-8 border border-[#eae8e5] shadow-xs hover:shadow-md transition-all duration-300">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-0.5 text-[#036e13]">
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                      </div>
                      <span className="font-label-sm text-[10px] text-[#036e13] bg-[#5cb855]/20 border border-[#5cb855]/30 uppercase px-2 py-0.5 rounded-full font-bold">
                        {t.landing.caseStudies.item1.badge}
                      </span>
                    </div>

                    <blockquote className="font-body-lg text-sm sm:text-base text-[#1b1c1a] italic leading-relaxed mb-6">
                      &ldquo;{t.landing.caseStudies.item1.quote}&rdquo;
                    </blockquote>

                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-white shadow-xs shrink-0">
                        <img
                          alt={t.landing.caseStudies.item1.author}
                          className="w-full h-full object-cover"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqslr7DKGddg4ioMyPShSEmXHUBn_QAcUipr1W9O1iAQKCPRwvh5R0ijiTsah3qimKyclBTWOXu6CX8kehrR-j1uPGQMtEDFMBbSvpnT92o52Eu8ZRC6J7mXI48vvCvICeACrlc8eHdBX32qBFzx07Lb-6bxbsEWdqeITRVzagZyby-cIP2HCAYeQufY8l8rEZapLp47bNtk2eed8QoaJ7v_vgm8iBTLAzhSnv_PY8cLIvzSXVHmAS"
                        />
                      </div>
                      <div>
                        <span className="font-title-sm text-sm text-[#1b1c1a] block font-bold">
                          {t.landing.caseStudies.item1.author}
                        </span>
                        <span className="font-body-md text-xs text-[#5c5e63]">
                          {t.landing.caseStudies.item1.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#eae8e5] text-center bg-white/70 p-3 rounded-xl">
                    <div>
                      <span className="font-metric-num text-lg font-bold text-[#1b1c1a] block">{t.landing.caseStudies.item1.metric1Value}</span>
                      <span className="font-label-sm text-[10px] text-[#6f7a6b] leading-tight block">
                        {t.landing.caseStudies.item1.metric1Label}
                      </span>
                    </div>
                    <div className="border-x border-[#eae8e5]">
                      <span className="font-metric-num text-lg font-bold text-[#1b1c1a] block">{t.landing.caseStudies.item1.metric2Value}</span>
                      <span className="font-label-sm text-[10px] text-[#6f7a6b] leading-tight block">
                        {t.landing.caseStudies.item1.metric2Label}
                      </span>
                    </div>
                    <div>
                      <span className="font-metric-num text-lg font-bold text-[#036e13] block">{t.landing.caseStudies.item1.metric3Value}</span>
                      <span className="font-label-sm text-[10px] text-[#6f7a6b] leading-tight block">
                        {t.landing.caseStudies.item1.metric3Label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Case 2: Corporate & Legal (NDA) */}
                <div className="flex flex-col justify-between bg-[#efeeeb] rounded-2xl p-7 sm:p-8 border border-[#eae8e5] shadow-xs hover:shadow-md transition-all duration-300">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-0.5 text-[#036e13]">
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                      </div>
                      <span className="font-label-sm text-[10px] text-[#6f7a6b] bg-[#dfdeda] border border-[#cfceca] uppercase px-2 py-0.5 rounded-full font-bold">
                        {t.landing.caseStudies.item2.badge}
                      </span>
                    </div>

                    <blockquote className="font-body-lg text-sm sm:text-base text-[#1b1c1a] italic leading-relaxed mb-6">
                      &ldquo;{t.landing.caseStudies.item2.quote}&rdquo;
                    </blockquote>

                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-11 h-11 rounded-full bg-[#1c1e1c] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                        <span className="material-symbols-outlined text-[20px] text-[#5cb855]">gavel</span>
                      </div>
                      <div>
                        <span className="font-title-sm text-sm text-[#1b1c1a] block font-bold">
                          {t.landing.caseStudies.item2.author}
                        </span>
                        <span className="font-body-md text-xs text-[#5c5e63]">
                          {t.landing.caseStudies.item2.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#eae8e5] text-center bg-white/70 p-3 rounded-xl">
                    <div>
                      <span className="font-metric-num text-lg font-bold text-[#1b1c1a] block">{t.landing.caseStudies.item2.metric1Value}</span>
                      <span className="font-label-sm text-[10px] text-[#6f7a6b] leading-tight block">
                        {t.landing.caseStudies.item2.metric1Label}
                      </span>
                    </div>
                    <div className="border-x border-[#eae8e5]">
                      <span className="font-metric-num text-lg font-bold text-[#1b1c1a] block">{t.landing.caseStudies.item2.metric2Value}</span>
                      <span className="font-label-sm text-[10px] text-[#6f7a6b] leading-tight block">
                        {t.landing.caseStudies.item2.metric2Label}
                      </span>
                    </div>
                    <div>
                      <span className="font-metric-num text-lg font-bold text-[#036e13] block">{t.landing.caseStudies.item2.metric3Value}</span>
                      <span className="font-label-sm text-[10px] text-[#6f7a6b] leading-tight block">
                        {t.landing.caseStudies.item2.metric3Label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Case 3: Elena Morandi */}
                <div className="flex flex-col justify-between bg-[#efeeeb] rounded-2xl p-7 sm:p-8 border border-[#eae8e5] shadow-xs hover:shadow-md transition-all duration-300">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-0.5 text-[#036e13]">
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="material-symbols-outlined text-[16px]">star</span>
                      </div>
                      <span className="font-label-sm text-[10px] text-[#036e13] bg-[#5cb855]/20 border border-[#5cb855]/30 uppercase px-2 py-0.5 rounded-full font-bold">
                        {t.landing.caseStudies.item3.badge}
                      </span>
                    </div>

                    <blockquote className="font-body-lg text-sm sm:text-base text-[#1b1c1a] italic leading-relaxed mb-6">
                      &ldquo;{t.landing.caseStudies.item3.quote}&rdquo;
                    </blockquote>

                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-11 h-11 rounded-full bg-[#efeeeb] text-[#036e13] border border-[#bfcab8] flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                        <span className="material-symbols-outlined text-[20px]">architecture</span>
                      </div>
                      <div>
                        <span className="font-title-sm text-sm text-[#1b1c1a] block font-bold">
                          {t.landing.caseStudies.item3.author}
                        </span>
                        <span className="font-body-md text-xs text-[#5c5e63]">
                          {t.landing.caseStudies.item3.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#eae8e5] text-center bg-white/70 p-3 rounded-xl">
                    <div>
                      <span className="font-metric-num text-lg font-bold text-[#1b1c1a] block">{t.landing.caseStudies.item3.metric1Value}</span>
                      <span className="font-label-sm text-[10px] text-[#6f7a6b] leading-tight block">
                        {t.landing.caseStudies.item3.metric1Label}
                      </span>
                    </div>
                    <div className="border-x border-[#eae8e5]">
                      <span className="font-metric-num text-lg font-bold text-[#1b1c1a] block">{t.landing.caseStudies.item3.metric2Value}</span>
                      <span className="font-label-sm text-[10px] text-[#6f7a6b] leading-tight block">
                        {t.landing.caseStudies.item3.metric2Label}
                      </span>
                    </div>
                    <div>
                      <span className="font-metric-num text-lg font-bold text-[#036e13] block">{t.landing.caseStudies.item3.metric3Value}</span>
                      <span className="font-label-sm text-[10px] text-[#6f7a6b] leading-tight block">
                        {t.landing.caseStudies.item3.metric3Label}
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

                {/* Social Login Buttons in CTA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-lg mx-auto mb-3">
                  <button
                    type="button"
                    onClick={() => handleOpenLogin('signin')}
                    className="w-full h-11 px-3 bg-[#92C775] hover:bg-[#81b863] text-white border border-[#81b863] rounded-xl shadow-xs hover:shadow-md flex items-center justify-center gap-2 font-label-md text-xs font-semibold transition-all cursor-pointer"
                  >
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shrink-0 shadow-xs">
                      <svg aria-hidden="true" className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" fill="#4285F4"></path>
                        <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.39 7.35 24 12 24z" fill="#34A853"></path>
                        <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z" fill="#FBBC05"></path>
                        <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.23 0 12 0 7.35 0 3.27 2.61 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335"></path>
                      </svg>
                    </div>
                    <span>{t.auth.googleButton}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenLogin('signin')}
                    className="w-full h-11 px-3 bg-[#1877F2] hover:bg-[#166fe5] text-white border border-[#1877F2] rounded-xl shadow-xs hover:shadow-md flex items-center justify-center gap-2 font-label-md text-xs font-semibold transition-all cursor-pointer"
                  >
                    <svg aria-hidden="true" className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
                    </svg>
                    <span>{t.auth.facebookButton}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenLogin('signin')}
                    className="w-full h-11 px-3 bg-[#0A66C2] hover:bg-[#08549e] text-white border border-[#0A66C2] rounded-xl shadow-xs hover:shadow-md flex items-center justify-center gap-2 font-label-md text-xs font-semibold transition-all cursor-pointer"
                  >
                    <svg aria-hidden="true" className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.979 0 1.778-.773 1.778-1.729V1.73C24 .774 23.205 0 22.222 0h.003z"/>
                    </svg>
                    <span>{t.auth.linkedinButton}</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative flex items-center justify-center max-w-lg mx-auto my-3">
                  <div className="w-full h-px bg-[#eae8e5]"></div>
                  <span className="absolute bg-white px-3 font-label-sm text-[10px] text-[#6f7a6b] uppercase tracking-wider">
                    {t.auth.orDivider}
                  </span>
                </div>

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
              <Link href="/faq" className="font-label-sm text-[11px] text-[#6f7a6b] hover:text-[#1b1c1a] uppercase tracking-wider transition-colors">
                FAQ
              </Link>
              <Link href="/guida" className="font-label-sm text-[11px] text-[#6f7a6b] hover:text-[#1b1c1a] uppercase tracking-wider transition-colors">
                {t.navigation.userGuide}
              </Link>
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
