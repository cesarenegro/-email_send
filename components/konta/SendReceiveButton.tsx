'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface SendReceiveResponse {
  send?: { status?: string; to?: string | null; next_send_at?: string | null; error?: string; message?: string };
  receive?: { status?: string; updated?: number; error?: string };
  error?: string;
}

function formatTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale === 'en' ? 'en-GB' : 'it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Tasto "Invia/Ricevi": un invio dovuto + lettura rimbalzi per l'organizzazione attiva. */
export default function SendReceiveButton() {
  const { locale } = useTranslation();
  const en = locale === 'en';
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/mail/send-receive', { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as SendReceiveResponse;
      if (!res.ok) {
        setNote({ ok: false, text: body.error || (en ? 'Failed' : 'Non riuscito') });
        return;
      }
      const parts: string[] = [];
      const s = body.send;
      if (s?.status === 'sent') parts.push(en ? `Sent to ${s.to}` : `Inviata a ${s.to}`);
      else if (s?.status === 'idle') {
        parts.push(
          s.next_send_at
            ? en ? `Next send ${formatTime(s.next_send_at, locale)}` : `Prossimo invio ${formatTime(s.next_send_at, locale)}`
            : en ? 'Nothing to send' : 'Niente da inviare'
        );
      } else if (s?.status === 'postponed') parts.push(en ? 'Outside sending window' : 'Fuori finestra di invio');
      else if (s?.status === 'daily_limit_reached') parts.push(en ? 'Daily limit reached' : 'Limite giornaliero raggiunto');
      else if (s?.status === 'completed') parts.push(en ? 'Completed' : 'Completato');
      else if (s?.status) parts.push(s.error || s.message || s.status);

      const r = body.receive;
      if (r?.status === 'ok') parts.push(en ? `${r.updated ?? 0} bounces` : `${r.updated ?? 0} rimbalzi`);
      else if (r?.status === 'error') parts.push(en ? 'IMAP error' : 'Errore IMAP');

      const failed = s?.status === 'error' || s?.status === 'error_configuration' || s?.status === 'error_transient' || r?.status === 'error';
      setNote({ ok: !failed, text: parts.join(' · ') });
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : en ? 'Failed' : 'Non riuscito' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {note ? (
        <span
          role="status"
          className={`hidden md:inline max-w-[280px] truncate text-xs ${note.ok ? 'text-[#036e13]' : 'text-[#b3261e]'}`}
          title={note.text}
        >
          {note.text}
        </span>
      ) : null}
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="h-8 px-3 rounded-lg border border-[#e5e5e0] bg-white text-[#1b1c1a] text-xs font-semibold hover:bg-[#f5f3f0] disabled:opacity-50 transition flex items-center gap-1.5"
        title={en ? 'Send due email and read bounces' : 'Invia l’email dovuta e leggi i rimbalzi'}
      >
        <span className={`material-symbols-outlined text-[16px] ${busy ? 'animate-spin' : ''}`}>sync</span>
        {en ? 'Send/Receive' : 'Invia/Ricevi'}
      </button>
    </div>
  );
}
