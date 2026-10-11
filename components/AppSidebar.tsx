'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  const [userEmail, setUserEmail] = useState<string>('cesare@arkitecna.com');
  const [userName, setUserName] = useState<string>('Stefano Martini');
  const [activeCampaignsCount, setActiveCampaignsCount] = useState<number>(0);
  const [todaySends, setTodaySends] = useState<number>(0);
  const dailyLimit = 80;

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
          const namePart = user.user_metadata?.full_name || user.email.split('@')[0];
          setUserName(namePart);
        }

        // Active campaigns count
        const { count: activeCount } = await supabase
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active');
        if (activeCount !== null && activeCount !== undefined) {
          setActiveCampaignsCount(activeCount);
        }

        // Today's sent emails from email_logs
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { count: logCount } = await supabase
          .from('email_logs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent')
          .gte('created_at', startOfDay.toISOString());
        if (logCount !== null && logCount !== undefined) {
          setTodaySends(logCount);
        }
      } catch (err) {
        console.error('Error fetching sidebar telemetry:', err);
      }
    }
    loadData();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/landing';
  };

  if (pathname === '/login') {
    return null;
  }

  const navItems = [
    {
      href: '/',
      label: t.navigation.hub,
      icon: 'grid_view',
      exact: true,
    },
    {
      href: '/campaigns',
      label: t.navigation.campaigns,
      icon: 'send',
      badge: activeCampaignsCount > 0 ? activeCampaignsCount : undefined,
    },
    {
      href: '/newsletters',
      label: t.navigation.newsletters,
      icon: 'article',
    },
    {
      href: '/lead-research',
      label: t.navigation.leadResearch,
      icon: 'person_search',
    },
    {
      href: '/settings',
      label: t.navigation.settings,
      icon: 'tune',
    },
    {
      href: '/faq',
      label: t.navigation.faq,
      icon: 'help_outline',
    },
    {
      href: '/guida',
      label: t.navigation.userGuide,
      icon: 'menu_book',
    },
  ];

  const quotaPercent = Math.min(100, Math.round((todaySends / dailyLimit) * 100));

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-[#f5f3f0] border-r border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between p-space-md">
      {/* Brand & Nav */}
      <div className="flex flex-col gap-space-md">
        {/* Brand Header */}
        <div className="flex flex-col px-space-xs pt-space-xs">
          <Link href="/landing" title={t.common.appName} className="flex items-center gap-space-sm group">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs border border-[#e5e5e0]">
              <img src="/icon.png" alt="MAIL-K" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-headline-md text-headline-md font-bold tracking-tight block text-[#1b1c1a] leading-none">
                {t.common.appName}
              </span>
              <span className="font-label-sm text-[10px] uppercase text-[#5c5e63] tracking-widest block mt-0.5">
                {t.common.appTagline}
              </span>
            </div>
          </Link>
        </div>

        {/* Primary CTA */}
        <div className="px-space-xs">
          <Link
            href="/campaigns/new"
            className="w-full h-10 px-space-md rounded-lg bg-[#30312f] text-[#f2f0ed] hover:bg-[#5c5e63] transition-colors duration-150 flex items-center justify-between font-label-md text-label-md"
          >
            <span className="flex items-center gap-space-sm">
              <span className="w-2 h-2 rounded-full bg-[#5cb855] animate-pulse"></span>
              <span>{t.navigation.newOutbound}</span>
            </span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 px-space-xs">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors font-body-md text-body-md ${
                  isActive
                    ? 'bg-[#e4e2df] text-[#1b1c1a] font-semibold shadow-xs'
                    : 'text-[#3f4a3c] hover:bg-[#eae8e5] hover:text-[#1b1c1a]'
                }`}
              >
                <span className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#e4e2df] font-label-sm text-label-sm text-[#1b1c1a]">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Telemetry & User Account */}
      <div className="flex flex-col gap-space-sm">
        {/* Hostinger SMTP Live Gauge Card */}
        <div className="p-space-sm rounded-xl bg-[#ffffff] border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-[#5c5e63] uppercase tracking-wider">Hostinger SMTP</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#f5f3f0] font-label-sm text-label-sm text-[#036e13] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855] animate-pulse"></span>
              {t.hub.regular}
            </span>
          </div>
          <div className="flex items-center justify-between font-label-md text-label-md text-[#1b1c1a] pt-1">
            <span>{t.hub.sendsTodayCard}</span>
            <span className="font-metric-num text-title-sm">
              {todaySends} <span className="text-[#5c5e63] font-body-md text-body-md">/ {dailyLimit}</span>
            </span>
          </div>
          <div className="w-full bg-[#f5f3f0] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#5cb855] h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(5, quotaPercent)}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between pt-0.5 text-[#5c5e63] font-label-sm text-label-sm">
            <span>Throttling</span>
            <span className="uppercase font-semibold text-[#1b1c1a]">Safe Mode</span>
          </div>
        </div>

        {/* Language Switcher in Sidebar */}
        <div className="px-space-xs flex justify-center">
          <LanguageSwitcher variant="light" className="w-full justify-center" />
        </div>

        {/* User Card & Logout */}
        <div className="p-space-xs flex items-center justify-between border-t border-[#e5e5e0]/60 pt-space-xs">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-full bg-[#036e13] flex items-center justify-center text-[#ffffff] font-semibold text-xs shadow-xs">
              <span className="material-symbols-outlined text-[#ffffff] text-[18px]">person</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-title-sm text-title-sm text-[#1b1c1a] text-[13px] truncate max-w-[120px]">
                {userName}
              </span>
              <span className="font-label-sm text-label-sm text-[#5c5e63] truncate max-w-[120px]">
                {userEmail}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-[#5c5e63] hover:text-[#1b1c1a] hover:bg-[#eae8e5] transition-colors"
            title={t.common.signOut}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
