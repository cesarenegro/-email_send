'use client';

/**
 * MAIL-K — Menu "App KONTA" per l'intestazione (CONTRATTO_ACCOUNT_UNICO.md §4, mock schermata 4).
 * Quattro voci da `buildKontaAppLinks` (Light, PRO, K-CRM, Mail-K) con stato e azione.
 *
 * PREPARATO, NON MONTATO: va inserito in `components/AppHeader.tsx` solo dopo l'approvazione del mock.
 * Senza risposta della RPC il menu non si mostra (nessun dato finto).
 */

import React, { useEffect, useRef, useState } from 'react';
import { fetchKontaEntitlements } from '@/lib/konta/account-client';
import { buildKontaAppLinks, type KontaAppLink, type KontaProductKey } from '@/lib/konta/entitlements';

const DOT_COLORS: Record<KontaProductKey, string> = {
  light: '#6DBE45',
  pro: '#E8693A',
  kcrm: '#1E4F7A',
  mailk: '#036e13',
};

const ACTION_LABELS: Record<'it' | 'en', Record<KontaAppLink['action'], string>> = {
  it: { open: 'Apri', activate: 'Attiva', current: 'Sei qui' },
  en: { open: 'Open', activate: 'Activate', current: 'You are here' },
};

const ACTION_CLASSES: Record<KontaAppLink['action'], string> = {
  open: 'bg-[#e6f4e6] text-[#036e13]',
  activate: 'bg-[#fff6d6] text-[#644000]',
  current: 'bg-[#eae8e5] text-[#5c5e63]',
};

export default function KontaAppsMenu({ lang }: { lang: 'it' | 'en' }) {
  const [links, setLinks] = useState<KontaAppLink[] | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchKontaEntitlements().then((ent) => {
      if (!cancelled && ent) setLinks(buildKontaAppLinks(ent, 'mailk'));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!links) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-9 px-3 rounded-lg border border-[#e5e5e0] bg-white text-sm font-semibold text-[#1b1c1a] hover:bg-[#f5f3f0] flex items-center gap-1.5"
      >
        <span className="material-symbols-outlined text-[18px]">apps</span>
        {lang === 'en' ? 'KONTA apps' : 'App KONTA'}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 mt-2 w-[300px] rounded-xl border border-[#e5e5e0] bg-white p-2 shadow-[0_12px_28px_rgba(31,20,18,0.12)] z-50">
          <p className="px-2.5 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5c5e63]">
            {lang === 'en' ? 'Your KONTA apps' : 'Le tue app KONTA'}
          </p>
          {links.map((l) => {
            const content = (
              <>
                <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: DOT_COLORS[l.key] }} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#1b1c1a]">{l.name}</span>
                  <span className="block text-xs text-[#5c5e63] truncate">{l.detail}</span>
                </span>
                <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${ACTION_CLASSES[l.action]}`}>
                  {ACTION_LABELS[lang][l.action]}
                </span>
              </>
            );
            return l.action === 'current' ? (
              <div key={l.key} role="menuitem" aria-current="page" className="flex items-center gap-2.5 p-2.5 rounded-lg">
                {content}
              </div>
            ) : (
              <a key={l.key} role="menuitem" href={l.url} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-[#f5f3f0]">
                {content}
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
