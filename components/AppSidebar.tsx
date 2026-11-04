'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LEAD_RESEARCH_TRIAL_LOCK_MESSAGE, isLeadResearchLockedByState } from '@/lib/konta/trial-features';
import { KONTA_ROLE_LABELS, readStoredOrganizationId, writeStoredOrganizationId, type KontaRole } from '@/lib/konta/workspace';

interface WorkspaceInfo {
  user: { id: string; email: string };
  memberships: Array<{ organization_id: string; role: KontaRole; name: string }>;
  active_organization_id: string | null;
  lead_research_enabled?: boolean;
  mailk_state?: string | null;
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { t, locale } = useTranslation();

  const [userEmail, setUserEmail] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [roleLabel, setRoleLabel] = useState<string>('');
  const [membershipCount, setMembershipCount] = useState<number>(0);
  const [leadResearchEnabled, setLeadResearchEnabled] = useState<boolean>(false);
  const [leadResearchLocked, setLeadResearchLocked] = useState<boolean>(false);
  const [activeCampaignsCount, setActiveCampaignsCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const wsRes = await fetch('/api/workspace', { cache: 'no-store' });
        if (!wsRes.ok) return;
        const ws = (await wsRes.json()) as WorkspaceInfo;
        if (cancelled) return;
        setUserEmail(ws.user?.email || '');
        setMembershipCount(ws.memberships?.length || 0);
        setLeadResearchEnabled(Boolean(ws.lead_research_enabled));
        setLeadResearchLocked(isLeadResearchLockedByState(ws.mailk_state));
        const active = ws.memberships?.find((m) => m.organization_id === ws.active_organization_id) || null;
        if (active) {
          setOrganizationName(active.name);
          setRoleLabel(KONTA_ROLE_LABELS[active.role] || active.role);
          if (readStoredOrganizationId() !== active.organization_id) writeStoredOrganizationId(active.organization_id);
        }

        const orgId = ws.active_organization_id;
        if (!orgId) return;

        const supabase = createClient();
        const { count: activeCount } = await supabase
          .from('mail_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'active');
        if (!cancelled && typeof activeCount === 'number') setActiveCampaignsCount(activeCount);


      } catch (err) {
        console.error('Error fetching sidebar telemetry:', err);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/workspace', { method: 'DELETE' });
      writeStoredOrganizationId(null);
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      window.location.href = '/login';
    }
  };

  if (pathname === '/login') {
    return null;
  }

  const navItems = [
    { href: '/', label: t.navigation.hub, icon: 'grid_view', exact: true },
    {
      href: '/campaigns',
      label: t.navigation.campaigns,
      icon: 'send',
      badge: activeCampaignsCount > 0 ? activeCampaignsCount : undefined,
    },
    { href: '/newsletters', label: t.navigation.newsletters, icon: 'article' },
    ...(leadResearchEnabled
      ? [
          {
            href: '/lead-research',
            label: t.navigation.leadResearch,
            icon: 'person_search',
            locked: leadResearchLocked,
            lockedMessage: LEAD_RESEARCH_TRIAL_LOCK_MESSAGE[locale === 'en' ? 'en' : 'it'],
          },
        ]
      : []),
    { href: '/settings', label: t.navigation.settings, icon: 'tune' },
    { href: '/faq', label: t.navigation.faq, icon: 'help_outline' },
    { href: '/guida', label: t.navigation.userGuide, icon: 'menu_book' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-[#f5f3f0] border-r border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between p-space-md">
      <div className="flex flex-col gap-space-md">
        <div className="flex flex-col px-space-xs pt-space-xs">
          <Link href="/landing" title={t.common.appName} className="flex items-center gap-space-sm group">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs border border-[#e5e5e0]">
              <img src="/icon.png" alt="MAIL-K" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-headline-md text-headline-md font-bold tracking-tight block text-[#1b1c1a] leading-none">
                {t.common.appName}
              </span>
            </div>
          </Link>
        </div>

        {/* Organizzazione attiva */}
        <div className="px-space-xs">
          <Link
            href="/workspace"
            className="block rounded-lg border border-[#e5e5e0] bg-white px-3 py-2 hover:border-[#036e13] transition-colors"
            title={locale === 'en' ? 'Switch organization' : 'Cambia organizzazione'}
          >
            <span className="block text-[10px] uppercase tracking-widest text-[#5c5e63] font-semibold">
              {locale === 'en' ? 'Organization' : 'Organizzazione'}
            </span>
            <span className="flex items-center justify-between gap-2 mt-0.5">
              <span className="text-sm font-semibold text-[#1b1c1a] truncate">{organizationName || '…'}</span>
              {membershipCount > 1 ? <span className="material-symbols-outlined text-[16px] text-[#5c5e63]">swap_horiz</span> : null}
            </span>
            {roleLabel ? <span className="block text-[11px] text-[#5c5e63]">{roleLabel}</span> : null}
          </Link>
        </div>

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

        <nav className="flex flex-col gap-1 px-space-xs">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                title={'locked' in item && item.locked ? item.lockedMessage : undefined}
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
                {'locked' in item && item.locked ? (
                  <span className="material-symbols-outlined text-[16px] text-[#5c5e63]" aria-label={item.lockedMessage}>lock</span>
                ) : null}
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

      <div className="flex flex-col gap-space-sm">
        <div className="p-space-xs flex items-center justify-between border-t border-[#e5e5e0]/60 pt-space-xs">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#036e13] flex items-center justify-center text-[#ffffff] font-semibold text-xs shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[#ffffff] text-[18px]">person</span>
            </div>
            <Link
              href="/account/password"
              className="font-label-sm text-label-sm text-[#5c5e63] truncate max-w-[150px] hover:text-[#1b1c1a] underline-offset-4 hover:underline"
              title={locale === 'en' ? 'KONTA account · change password' : 'Account KONTA · cambia password'}
            >
              {userEmail}
            </Link>
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
