'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function SettingsPage() {
  const { t, locale } = useTranslation();
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Editable sender fields
  const [fromName, setFromName] = useState('Stefano Martini | ARKITECNA');
  const [fromEmail, setFromEmail] = useState('info@arkitecna.com');
  const [replyTo, setReplyTo] = useState('info@arkitecna.com');

  // Read-only server config
  const [smtpHost, setSmtpHost] = useState('smtp.hostinger.com');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('cesare@arkitecna.com');

  // Diagnostic states
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingImap, setTestingImap] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; text: string } | null>(null);
  const [imapResult, setImapResult] = useState<{ success: boolean; text: string } | null>(null);
  const [sendResult, setSendResult] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.from_name) setFromName(data.from_name);
          if (data.from_email) setFromEmail(data.from_email);
          if (data.reply_to) setReplyTo(data.reply_to);
          if (data.smtp_host) setSmtpHost(data.smtp_host);
          if (data.smtp_port) setSmtpPort(data.smtp_port);
          if (data.smtp_user) setSmtpUser(data.smtp_user);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_name: fromName,
          from_email: fromEmail,
          reply_to: replyTo,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (locale === 'en' ? 'Error while saving settings' : 'Errore durante il salvataggio'));

      setSaveSuccessMsg(data.message || t.settings.saveSenderSuccess);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || (locale === 'en' ? 'Error while saving' : 'Errore durante il salvataggio'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const res = await fetch('/api/settings/test-smtp', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (locale === 'en' ? 'SMTP test failed' : 'Test fallito'));
      setConnectionResult({ success: true, text: data.message });
    } catch (err: any) {
      setConnectionResult({ success: false, text: err.message });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestImap = async () => {
    setTestingImap(true);
    setImapResult(null);

    try {
      const res = await fetch('/api/settings/test-imap', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (locale === 'en' ? 'IMAP test failed' : 'Test IMAP fallito'));
      setImapResult({ success: true, text: data.message });
    } catch (err: any) {
      setImapResult({ success: false, text: err.message });
    } finally {
      setTestingImap(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient) return;

    setSendingTestEmail(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/settings/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testRecipient }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (locale === 'en' ? 'Test email delivery failed' : 'Invio email test fallito'));
      setSendResult({ success: true, text: data.message });
    } catch (err: any) {
      setSendResult({ success: false, text: err.message });
    } finally {
      setSendingTestEmail(false);
    }
  };

  return (
    <div className="relative w-full overflow-hidden px-gutter pb-space-xl pt-space-md flex flex-col gap-space-lg">
      {/* Decorative ambient glow */}
      <div className="absolute top-0 right-1/4 -z-10 w-96 h-96 rounded-full bg-[#5cb855]/10 blur-3xl pointer-events-none"></div>

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
        <div className="flex flex-col max-w-2xl">
          <div className="flex items-center gap-space-xs mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855]"></span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-[#5c5e63] font-semibold">
              {t.settings.studioConfig}
            </span>
            <span className="text-[#a2a59e] text-xs">•</span>
            <span className="font-label-sm text-label-sm text-[#5c5f59] font-medium">{t.common.appName}</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-[#1b1c1a] tracking-tight">{t.settings.title}</h1>
          <p className="font-body-lg text-body-lg text-[#3f4a3c] mt-1">
            {t.settings.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open-onboarding-walkthrough'));
            }
          }}
          className="h-10 px-space-md rounded-lg bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] font-label-md text-label-md border border-[#e5e5e0] transition-colors flex items-center gap-2 self-start lg:self-auto shadow-2xs"
        >
          <span className="material-symbols-outlined text-[16px] text-[#036e13]">help_outline</span>
          <span>{t.settings.restartWalkthrough}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        {/* Card 1: Identità Mittente Campagne */}
        <div className="bg-[#ffffff] rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] p-space-lg flex flex-col justify-between gap-space-md">
          <div>
            <div className="flex items-center justify-between pb-space-sm border-b border-[#e5e5e0]">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#1b1c1a]">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-[#1b1c1a]">{t.settings.senderIdentityTitle}</h3>
                  <span className="font-label-sm text-label-sm text-[#5c5e63]">
                    {t.settings.senderIdentitySub}
                  </span>
                </div>
              </div>
            </div>

            {saveSuccessMsg && (
              <div className="p-space-sm mt-space-sm bg-[#ecf8eb] border border-[#5cb855]/30 text-[#036e13] font-body-md text-body-md rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {saveErrorMsg && (
              <div className="p-space-sm mt-space-sm bg-[#ffdad6] border border-[#ffb4ab] text-[#ba1a1a] font-body-md text-body-md rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{saveErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-space-md mt-space-md">
              <div>
                <label className="block font-label-sm text-label-sm uppercase tracking-wider text-[#1b1c1a] font-semibold mb-1">
                  {t.settings.senderName}
                </label>
                <input
                  type="text"
                  required
                  disabled={loadingSettings || savingSettings}
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder={t.settings.senderNamePlaceholder}
                  className="w-full h-10 px-3 rounded-lg border border-[#e5e5e0] bg-[#ffffff] text-[#1b1c1a] font-body-md text-body-md focus:outline-none focus:border-[#1b1c1a]"
                />
              </div>

              <div>
                <label className="block font-label-sm text-label-sm uppercase tracking-wider text-[#1b1c1a] font-semibold mb-1">
                  {t.settings.senderEmail}
                </label>
                <input
                  type="email"
                  required
                  disabled={loadingSettings || savingSettings}
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder={t.settings.senderEmailPlaceholder}
                  className="w-full h-10 px-3 rounded-lg border border-[#e5e5e0] bg-[#ffffff] text-[#1b1c1a] font-body-md text-body-md focus:outline-none focus:border-[#1b1c1a]"
                />
              </div>

              <div>
                <label className="block font-label-sm text-label-sm uppercase tracking-wider text-[#1b1c1a] font-semibold mb-1">
                  {t.settings.replyTo}
                </label>
                <input
                  type="email"
                  required
                  disabled={loadingSettings || savingSettings}
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder={t.settings.replyToPlaceholder}
                  className="w-full h-10 px-3 rounded-lg border border-[#e5e5e0] bg-[#ffffff] text-[#1b1c1a] font-body-md text-body-md focus:outline-none focus:border-[#1b1c1a]"
                />
              </div>

              <button
                type="submit"
                disabled={loadingSettings || savingSettings}
                className="w-full h-10 rounded-lg bg-[#30312f] text-[#f2f0ed] hover:bg-[#5c5e63] font-label-md text-label-md font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>{savingSettings ? (locale === 'en' ? 'Saving...' : 'Salvataggio...') : t.settings.saveSenderButton}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Card 2: Server Hostinger SMTP SSL */}
        <div className="bg-[#ffffff] rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] p-space-lg flex flex-col justify-between gap-space-md">
          <div>
            <div className="flex items-center justify-between pb-space-sm border-b border-[#e5e5e0]">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#036e13]">
                  <span className="material-symbols-outlined text-[20px]">dns</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-[#1b1c1a]">{t.settings.serverSmtpTitle}</h3>
                  <span className="font-label-sm text-label-sm text-[#5c5e63]">
                    {t.settings.serverSmtpSub}
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ecf8eb] text-[#036e13] font-label-sm text-[10px] font-bold">
                PORT 465 (SSL)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-space-md mt-space-md text-body-md">
              <div className="p-space-sm rounded-lg bg-[#f5f3f0] border border-[#e5e5e0]">
                <span className="font-label-sm text-label-sm text-[#5c5e63] uppercase">{t.settings.serverHostLabel}</span>
                <p className="font-semibold text-[#1b1c1a] mt-0.5 truncate">{smtpHost}</p>
              </div>
              <div className="p-space-sm rounded-lg bg-[#f5f3f0] border border-[#e5e5e0]">
                <span className="font-label-sm text-label-sm text-[#5c5e63] uppercase">{t.settings.serverPortLabel}</span>
                <p className="font-semibold text-[#1b1c1a] mt-0.5">{smtpPort}</p>
              </div>
              <div className="col-span-2 p-space-sm rounded-lg bg-[#f5f3f0] border border-[#e5e5e0]">
                <span className="font-label-sm text-label-sm text-[#5c5e63] uppercase">{t.settings.serverUserLabel}</span>
                <p className="font-semibold text-[#1b1c1a] mt-0.5 truncate">{smtpUser}</p>
              </div>
            </div>

            {connectionResult && (
              <div
                className={`p-space-sm mt-space-md rounded-lg flex items-center gap-2 font-body-md text-body-md border ${
                  connectionResult.success
                    ? 'bg-[#ecf8eb] border-[#5cb855]/30 text-[#036e13]'
                    : 'bg-[#ffdad6] border-[#ffb4ab] text-[#ba1a1a]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {connectionResult.success ? 'check_circle' : 'error'}
                </span>
                <span>{connectionResult.text}</span>
              </div>
            )}

            {imapResult && (
              <div
                className={`p-space-sm mt-space-md rounded-lg flex items-center gap-2 font-body-md text-body-md border ${
                  imapResult.success
                    ? 'bg-[#ecf8eb] border-[#5cb855]/30 text-[#036e13]'
                    : 'bg-[#ffdad6] border-[#ffb4ab] text-[#ba1a1a]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {imapResult.success ? 'check_circle' : 'error'}
                </span>
                <span>{imapResult.text}</span>
              </div>
            )}
          </div>

          <div className="flex gap-space-sm mt-space-md pt-space-md border-t border-[#e5e5e0]">
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="flex-1 h-10 rounded-lg bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] font-label-md text-label-md font-semibold border border-[#e5e5e0] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              type="button"
            >
              <span className={`material-symbols-outlined text-[16px] ${testingConnection ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{testingConnection ? t.settings.testConnectionRunning : t.settings.testConnectionAction}</span>
            </button>
            <button
              onClick={handleTestImap}
              disabled={testingImap}
              className="flex-1 h-10 rounded-lg bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] font-label-md text-label-md font-semibold border border-[#e5e5e0] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              type="button"
            >
              <span className={`material-symbols-outlined text-[16px] ${testingImap ? 'animate-spin' : ''}`}>
                mail
              </span>
              <span>{testingImap ? t.settings.testImapRunning : t.settings.testImapAction}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Test d'invio diretto */}
        <div className="lg:col-span-2 bg-[#ffffff] rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] p-space-lg flex flex-col justify-between gap-space-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-sm border-b border-[#e5e5e0]">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#036e13]">
                <span className="material-symbols-outlined text-[20px]">send</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-[#1b1c1a]">{t.settings.testSendSectionTitle}</h3>
                <span className="font-label-sm text-label-sm text-[#5c5e63]">
                  {t.settings.testSendSectionSub}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row items-center gap-space-md">
            <div className="flex-1 w-full">
              <input
                type="email"
                required
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder={t.settings.testSendPlaceholder}
                className="w-full h-11 px-3 rounded-lg border border-[#e5e5e0] bg-[#ffffff] text-[#1b1c1a] font-body-md text-body-md focus:outline-none focus:border-[#1b1c1a]"
              />
            </div>
            <button
              type="submit"
              disabled={sendingTestEmail || !testRecipient}
              className="w-full sm:w-auto h-11 px-space-lg bg-[#5cb855] hover:bg-[#4ea547] text-[#ffffff] font-label-md text-label-md font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 shrink-0"
            >
              <span className={`material-symbols-outlined text-[16px] ${sendingTestEmail ? 'animate-spin' : ''}`}>
                send
              </span>
              <span>{sendingTestEmail ? t.settings.testSendRunning : t.settings.testSendButton}</span>
            </button>
          </form>

          {sendResult && (
            <div
              className={`p-space-sm rounded-lg flex items-center gap-2 font-body-md text-body-md border ${
                sendResult.success
                  ? 'bg-[#ecf8eb] border-[#5cb855]/30 text-[#036e13]'
                  : 'bg-[#ffdad6] border-[#ffb4ab] text-[#ba1a1a]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {sendResult.success ? 'check_circle' : 'error'}
              </span>
              <span>{sendResult.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
