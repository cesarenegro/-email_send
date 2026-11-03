'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import SendReceiveButton from '@/components/konta/SendReceiveButton';
import { useTranslation } from '@/lib/i18n/useTranslation';

/** Intestazione essenziale: titolo della sezione, Invia/Ricevi, lingua. */
export default function AppHeader() {
  const pathname = usePathname();
  const { t } = useTranslation();

  if (pathname === '/login') {
    return null;
  }

  let title = t.navigation.hub;
  if (pathname === '/campaigns/new') title = t.navigation.newCampaign;
  else if (pathname.startsWith('/campaigns')) title = t.navigation.campaigns;
  else if (pathname === '/newsletters/new') title = t.navigation.newEdition;
  else if (pathname.startsWith('/newsletters')) title = t.navigation.newsletters;
  else if (pathname.startsWith('/settings')) title = t.navigation.settings;
  else if (pathname.startsWith('/lead-research')) title = t.navigation.leadResearch;
  else if (pathname.startsWith('/faq')) title = t.navigation.faq;
  else if (pathname.startsWith('/guida')) title = t.navigation.userGuide;

  return (
    <header className="fixed top-0 left-72 right-0 h-14 bg-[#fbf9f6]/95 backdrop-blur border-b border-[#e5e5e0] z-40 flex items-center justify-between px-gutter">
      <span className="text-sm font-semibold text-[#1b1c1a]">{title}</span>
      <div className="flex items-center gap-3">
        <SendReceiveButton />
        <LanguageSwitcher variant="light" />
      </div>
    </header>
  );
}
