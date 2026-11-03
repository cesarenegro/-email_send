'use client';

/**
 * MAIL-K — Modale "sola consultazione" dentro l'app (CONTRATTO_ACCOUNT_UNICO.md §4, mock schermata 5).
 *
 * Mail-K non ha ancora un listino: il modale mostra solo lo stato reale dell'organizzazione e il link
 * ai prezzi del portale. Nessun prezzo, piano o data inventati.
 *
 * PREPARATO, NON MONTATO: va mostrato (es. dall'hub) solo dopo l'approvazione del mock, quando lo stato
 * `mailk` dell'organizzazione attiva non è operativo.
 */

import React from 'react';
import { kontaStateLabel, type KontaAccessState } from '@/lib/konta/entitlements';

export const KONTA_PRICING_URL = 'https://konta.arkai.dev/prezzi';

const STATE_LABELS_EN: Partial<Record<KontaAccessState, string>> = {
  non_activated: 'Not activated',
  expired: 'Expired',
  past_due: 'Payment overdue',
  suspended: 'Suspended',
  security_hold: 'Security hold',
};

interface MailkPlanModalProps {
  lang: 'it' | 'en';
  organizationName: string;
  state: KontaAccessState;
  onClose: () => void;
}

export default function MailkPlanModal({ lang, organizationName, state, onClose }: MailkPlanModalProps) {
  const en = lang === 'en';
  const stateLabel = en ? STATE_LABELS_EN[state] ?? kontaStateLabel(state) : kontaStateLabel(state);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1b1c1a]/30 px-4" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mailk-plan-title"
        className="w-full max-w-[440px] rounded-2xl border border-[#e5e5e0] bg-white p-6 shadow-[0_12px_28px_rgba(31,20,18,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="mailk-plan-title" className="text-lg font-semibold text-[#1b1c1a]">
          {en ? 'Mail-K is in read-only mode' : 'Mail-K è in sola consultazione'}
        </h3>
        <p className="mt-1.5 text-sm text-[#5c5e63]">
          {en ? (
            <>Mail-K for <b className="text-[#1b1c1a]">{organizationName}</b> is not active. Your data stays available; to send or edit you need an active plan.</>
          ) : (
            <>Mail-K per <b className="text-[#1b1c1a]">{organizationName}</b> non è attivo. I dati restano disponibili; per inviare o modificare serve un piano attivo.</>
          )}
        </p>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-[#e5e5e0] px-3.5 py-3">
          <span className="text-sm text-[#5c5e63]">{en ? 'Status' : 'Stato'}</span>
          <span className="text-sm font-semibold text-[#1b1c1a]">{stateLabel}</span>
        </div>
        <a
          href={KONTA_PRICING_URL}
          className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-[#1b1c1a] text-sm font-semibold text-[#f2f0ed] hover:bg-[#30312f] transition"
        >
          {en ? 'See prices on konta.arkai.dev' : 'Vedi i prezzi su konta.arkai.dev'}
        </a>
        <button type="button" onClick={onClose} className="mt-3 w-full text-sm text-[#5c5e63] hover:text-[#1b1c1a] underline-offset-4 hover:underline">
          {en ? 'Continue in read-only mode' : 'Continua in sola lettura'}
        </button>
      </div>
    </div>
  );
}
