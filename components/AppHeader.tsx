'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function AppHeader() {
  const pathname = usePathname();
  const { t } = useTranslation();

  if (pathname === '/login') {
    return null;
  }

  // Dynamic breadcrumb resolution
  let section = t.navigation.atelier;
  let pageTitle = t.navigation.operatingConsole;

  if (pathname.startsWith('/campaigns')) {
    section = t.navigation.campaigns;
    if (pathname === '/campaigns') {
      pageTitle = t.navigation.allCampaigns;
    } else if (pathname === '/campaigns/new') {
      pageTitle = t.navigation.newCampaign;
    } else {
      pageTitle = t.navigation.campaignDetail;
    }
  } else if (pathname.startsWith('/newsletters')) {
    section = t.navigation.newsletters;
    if (pathname === '/newsletters') {
      pageTitle = t.navigation.studioPublications;
    } else if (pathname === '/newsletters/new') {
      pageTitle = t.navigation.newEdition;
    } else {
      pageTitle = t.navigation.editionDetail;
    }
  } else if (pathname.startsWith('/settings')) {
    section = t.navigation.configuration;
    pageTitle = t.navigation.smtpSettings;
  }

  return (
    <header className="fixed top-0 left-72 right-0 h-16 bg-[#fbf9f6]/90 backdrop-blur-xl border-b border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.02)] z-40 flex items-center justify-between px-gutter">
      {/* App Icon & Breadcrumb Navigation */}
      <div className="flex items-center gap-space-sm font-label-md text-label-md text-[#5c5e63]">
        <Link
          href="/landing"
          title="Vai alla Landing Page (Home)"
          className="flex items-center gap-2 text-[#1b1c1a] font-bold hover:text-[#036e13] transition-colors pr-2 border-r border-[#e5e5e0] group"
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 border border-[#e5e5e0]">
            <img src="/icon.png" alt="MAIL-K" className="w-full h-full object-cover" />
          </div>
          <span className="font-headline-md text-sm font-bold tracking-wider uppercase text-[#1b1c1a] group-hover:text-[#036e13] transition-colors">
            MAIL-K
          </span>
        </Link>
        <Link href="/" className="text-[#3f4a3c] font-medium hover:text-[#1b1c1a] transition-colors">
          {section}
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#1b1c1a] font-semibold">{pageTitle}</span>
      </div>

      {/* Right Controls & Telemetry */}
      <div className="flex items-center gap-3">
        <LanguageSwitcher variant="light" />

        <div className="hidden sm:flex items-center gap-1.5 font-label-sm text-xs text-[#5c5e63] pl-2 border-l border-[#e5e5e0]">
          <span className="material-symbols-outlined text-[15px] text-[#036e13] animate-spin-slow">sync</span>
          <span>{t.common.liveSync}</span>
        </div>

        <div className="flex items-center gap-space-xs">
          <Link
            href="/campaigns"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#3f4a3c] hover:bg-[#eae8e5] hover:text-[#1b1c1a] transition-colors"
            title="Cerca"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </Link>
          <Link
            href="/settings"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#3f4a3c] hover:bg-[#eae8e5] hover:text-[#1b1c1a] transition-colors"
            title="Diagnostica & Notifiche"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </Link>
        </div>

        <div className="w-8 h-8 rounded-full bg-[#036e13] flex items-center justify-center text-[#ffffff] shadow-xs">
          <span className="material-symbols-outlined text-[#ffffff] text-[18px]">person</span>
        </div>
      </div>
    </header>
  );
}
