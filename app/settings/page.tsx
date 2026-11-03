'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SUPPORTED_TIMEZONES as TIMEZONE_OPTIONS } from '@/lib/constants/timezones';
import type { SenderSettingsPublic } from '@/types/database';

type SettingsResponse = SenderSettingsPublic & {
  can_manage: boolean;
  organization_name: string;
  role: string;
  message?: string;
};

interface FormState {
  from_name: string;
  from_email: string;
  reply_to: string;
  preferred_timezone: string;
  send_window_start: string;
  send_window_end: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  imap_host: string;
  imap_port: string;
  imap_user: string;
  imap_password: string;
}

const COPY = {
  it: {
    title: 'Impostazioni mittente',
    readOnly: 'Solo Titolare o Amministratore possono modificare queste impostazioni.',
    identity: 'Identità',
    fromName: 'Nome mittente',
    fromEmail: 'Email mittente',
    replyTo: 'Rispondi a',
    timezone: 'Fuso orario',
    window: 'Finestra di invio',
    smtp: 'Casella SMTP',
    host: 'Server',
    port: 'Porta',
    user: 'Utente',
    password: 'Password',
    passwordKeep: 'Lascia vuoto per conservare quella salvata',
    verified: 'Verificata',
    notVerified: 'Da verificare',
    imap: 'Casella IMAP (bounce)',
    imapHint: 'Facoltativa. Se vuota, i rimbalzi non vengono letti.',
    save: 'Salva',
    saving: 'Salvataggio…',
    test: 'Verifica connessione',
    testing: 'Verifica…',
    testImap: 'Verifica IMAP',
    sendTest: 'Invia prova',
    sendTestTo: 'Indirizzo di prova',
    sending: 'Invio…',
    loading: 'Caricamento…',
    loadError: 'Impossibile caricare le impostazioni.',
    changeOrg: 'Cambia organizzazione',
  },
  en: {
    title: 'Sender settings',
    readOnly: 'Only Owner or Admin can change these settings.',
    identity: 'Identity',
    fromName: 'Sender name',
    fromEmail: 'Sender email',
    replyTo: 'Reply to',
    timezone: 'Time zone',
    window: 'Sending window',
    smtp: 'SMTP mailbox',
    host: 'Server',
    port: 'Port',
    user: 'User',
    password: 'Password',
    passwordKeep: 'Leave empty to keep the saved one',
    verified: 'Verified',
    notVerified: 'Not verified',
    imap: 'IMAP mailbox (bounces)',
    imapHint: 'Optional. If empty, bounces are not read.',
    save: 'Save',
    saving: 'Saving…',
    test: 'Test connection',
    testing: 'Testing…',
    testImap: 'Test IMAP',
    sendTest: 'Send test',
    sendTestTo: 'Test address',
    sending: 'Sending…',
    loading: 'Loading…',
    loadError: 'Could not load settings.',
    changeOrg: 'Switch organization',
  },
} as const;

function toForm(s: SenderSettingsPublic): FormState {
  return {
    from_name: s.from_name,
    from_email: s.from_email,
    reply_to: s.reply_to,
    preferred_timezone: s.preferred_timezone,
    send_window_start: s.send_window_start,
    send_window_end: s.send_window_end,
    smtp_host: s.smtp_host,
    smtp_port: String(s.smtp_port || 465),
    smtp_user: s.smtp_user,
    smtp_password: '',
    imap_host: s.imap_host,
    imap_port: String(s.imap_port || 993),
    imap_user: s.imap_user,
    imap_password: '',
  };
}

export default function SettingsPage() {
  const { locale } = useTranslation();
  const c = COPY[locale === 'en' ? 'en' : 'it'];

  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'test' | 'imap' | 'send' | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [testTo, setTestTo] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        const body = (await res.json()) as SettingsResponse & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(body.error || c.loadError);
          return;
        }
        setSettings(body);
        setForm(toForm(body));
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : c.loadError);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [c.loadError]);

  const canManage = settings?.can_manage ?? false;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy('save');
    setFeedback(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          smtp_port: Number(form.smtp_port),
          imap_port: Number(form.imap_port),
          smtp_password: form.smtp_password || undefined,
          imap_password: form.imap_password || undefined,
        }),
      });
      const body = (await res.json()) as SettingsResponse & { error?: string };
      if (!res.ok) {
        setFeedback({ ok: false, text: body.error || c.loadError });
        return;
      }
      setSettings(body);
      setForm(toForm(body));
      setFeedback({ ok: true, text: body.message || c.save });
    } catch (err) {
      setFeedback({ ok: false, text: err instanceof Error ? err.message : c.loadError });
    } finally {
      setBusy(null);
    }
  }

  async function runTest(kind: 'test' | 'imap') {
    setBusy(kind);
    setFeedback(null);
    try {
      const res = await fetch(kind === 'test' ? '/api/settings/test-smtp' : '/api/settings/test-imap', { method: 'POST' });
      const body = (await res.json()) as { success?: boolean; message?: string; error?: string; verified_at?: string };
      setFeedback({ ok: res.ok && !!body.success, text: body.message || body.error || '' });
      if (kind === 'test' && settings) {
        setSettings({ ...settings, is_verified: res.ok && !!body.success, verified_at: body.verified_at ?? settings.verified_at });
      }
    } catch (err) {
      setFeedback({ ok: false, text: err instanceof Error ? err.message : c.loadError });
    } finally {
      setBusy(null);
    }
  }

  async function sendTest(e: React.FormEvent) {
    e.preventDefault();
    setBusy('send');
    setFeedback(null);
    try {
      const res = await fetch('/api/settings/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo.trim() }),
      });
      const body = (await res.json()) as { message?: string; error?: string };
      setFeedback({ ok: res.ok, text: body.message || body.error || '' });
    } catch (err) {
      setFeedback({ ok: false, text: err instanceof Error ? err.message : c.loadError });
    } finally {
      setBusy(null);
    }
  }

  const input =
    'w-full h-10 px-3 rounded-lg border border-[#e5e5e0] bg-white text-[#1b1c1a] text-sm outline-none focus:border-[#036e13] focus:ring-2 focus:ring-[#036e13]/15 disabled:bg-[#f5f3f0] disabled:text-[#5c5e63] transition';
  const label = 'block text-xs font-semibold uppercase tracking-wider text-[#5c5e63] mb-1.5';
  const primary =
    'h-10 px-4 rounded-lg bg-[#1b1c1a] text-[#f2f0ed] text-sm font-semibold hover:bg-[#30312f] disabled:opacity-50 disabled:cursor-not-allowed transition';
  const secondary =
    'h-10 px-4 rounded-lg border border-[#e5e5e0] bg-white text-[#1b1c1a] text-sm font-medium hover:bg-[#f5f3f0] disabled:opacity-50 disabled:cursor-not-allowed transition';
  const section = 'rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-4';
  const heading = 'text-sm font-semibold text-[#1b1c1a]';

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-headline-md text-2xl text-[#1b1c1a]">{c.title}</h1>
          {settings ? (
            <p className="mt-1 text-sm text-[#5c5e63]">
              {settings.organization_name} ·{' '}
              <Link href="/workspace" className="hover:text-[#1b1c1a] underline-offset-4 hover:underline">
                {c.changeOrg}
              </Link>
            </p>
          ) : null}
        </div>
        {settings ? (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              settings.is_verified ? 'bg-[#ecf8eb] text-[#036e13]' : 'bg-[#f5f3f0] text-[#5c5e63]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${settings.is_verified ? 'bg-[#5cb855]' : 'bg-[#a2a59e]'}`} />
            {settings.is_verified ? c.verified : c.notVerified}
          </span>
        ) : null}
      </div>

      {loadError ? <p role="alert" className="text-sm text-[#b3261e]">{loadError}</p> : null}
      {!form && !loadError ? <p className="text-sm text-[#5c5e63]">{c.loading}</p> : null}

      {form ? (
        <form onSubmit={save} className="space-y-4" noValidate>
          {!canManage ? <p className="text-sm text-[#5c5e63]">{c.readOnly}</p> : null}

          <section className={section}>
            <h2 className={heading}>{c.identity}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>{c.fromName}</label>
                <input className={input} disabled={!canManage} value={form.from_name} onChange={(e) => update('from_name', e.target.value)} />
              </div>
              <div>
                <label className={label}>{c.fromEmail}</label>
                <input type="email" className={input} disabled={!canManage} value={form.from_email} onChange={(e) => update('from_email', e.target.value)} />
              </div>
              <div>
                <label className={label}>{c.replyTo}</label>
                <input type="email" className={input} disabled={!canManage} value={form.reply_to} onChange={(e) => update('reply_to', e.target.value)} />
              </div>
              <div>
                <label className={label}>{c.timezone}</label>
                <select className={input} disabled={!canManage} value={form.preferred_timezone} onChange={(e) => update('preferred_timezone', e.target.value)}>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                  {!TIMEZONE_OPTIONS.some((tz) => tz.value === form.preferred_timezone) ? (
                    <option value={form.preferred_timezone}>{form.preferred_timezone}</option>
                  ) : null}
                </select>
              </div>
              <div>
                <label className={label}>{c.window}</label>
                <div className="flex items-center gap-2">
                  <input type="time" className={input} disabled={!canManage} value={form.send_window_start} onChange={(e) => update('send_window_start', e.target.value)} />
                  <span className="text-[#5c5e63]">–</span>
                  <input type="time" className={input} disabled={!canManage} value={form.send_window_end} onChange={(e) => update('send_window_end', e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          <section className={section}>
            <h2 className={heading}>{c.smtp}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className={label}>{c.host}</label>
                <input className={input} disabled={!canManage} value={form.smtp_host} onChange={(e) => update('smtp_host', e.target.value)} placeholder="smtp.example.com" />
              </div>
              <div>
                <label className={label}>{c.port}</label>
                <select className={input} disabled={!canManage} value={form.smtp_port} onChange={(e) => update('smtp_port', e.target.value)}>
                  <option value="465">465 · SSL</option>
                  <option value="587">587 · STARTTLS</option>
                  <option value="2525">2525</option>
                  <option value="25">25</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={label}>{c.user}</label>
                <input className={input} disabled={!canManage} value={form.smtp_user} onChange={(e) => update('smtp_user', e.target.value)} autoComplete="off" />
              </div>
              <div>
                <label className={label}>{c.password}</label>
                <input
                  type="password"
                  className={input}
                  disabled={!canManage}
                  value={form.smtp_password}
                  onChange={(e) => update('smtp_password', e.target.value)}
                  placeholder={settings?.smtp_pass_set ? '••••••••' : ''}
                  autoComplete="new-password"
                />
                {settings?.smtp_pass_set ? <p className="mt-1 text-xs text-[#5c5e63]">{c.passwordKeep}</p> : null}
              </div>
            </div>
          </section>

          <section className={section}>
            <div>
              <h2 className={heading}>{c.imap}</h2>
              <p className="text-xs text-[#5c5e63] mt-0.5">{c.imapHint}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className={label}>{c.host}</label>
                <input className={input} disabled={!canManage} value={form.imap_host} onChange={(e) => update('imap_host', e.target.value)} placeholder="imap.example.com" />
              </div>
              <div>
                <label className={label}>{c.port}</label>
                <input type="number" min={1} max={65535} className={input} disabled={!canManage} value={form.imap_port} onChange={(e) => update('imap_port', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>{c.user}</label>
                <input className={input} disabled={!canManage} value={form.imap_user} onChange={(e) => update('imap_user', e.target.value)} autoComplete="off" />
              </div>
              <div>
                <label className={label}>{c.password}</label>
                <input
                  type="password"
                  className={input}
                  disabled={!canManage}
                  value={form.imap_password}
                  onChange={(e) => update('imap_password', e.target.value)}
                  placeholder={settings?.imap_pass_set ? '••••••••' : ''}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </section>

          {feedback ? (
            <p role="status" className={`text-sm ${feedback.ok ? 'text-[#036e13]' : 'text-[#b3261e]'}`}>{feedback.text}</p>
          ) : null}

          {canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={busy !== null} className={primary}>
                {busy === 'save' ? c.saving : c.save}
              </button>
              <button type="button" disabled={busy !== null || !settings?.smtp_pass_set} onClick={() => runTest('test')} className={secondary}>
                {busy === 'test' ? c.testing : c.test}
              </button>
              <button type="button" disabled={busy !== null || !settings?.imap_host} onClick={() => runTest('imap')} className={secondary}>
                {busy === 'imap' ? c.testing : c.testImap}
              </button>
            </div>
          ) : null}
        </form>
      ) : null}

      {form && canManage ? (
        <form onSubmit={sendTest} className="mt-4 flex flex-wrap items-end gap-2" noValidate>
          <div className="flex-1 min-w-[220px]">
            <label className={label}>{c.sendTestTo}</label>
            <input type="email" className={input} value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          </div>
          <button type="submit" disabled={busy !== null || !settings?.is_verified || !testTo.trim()} className={secondary}>
            {busy === 'send' ? c.sending : c.sendTest}
          </button>
        </form>
      ) : null}
    </div>
  );
}
