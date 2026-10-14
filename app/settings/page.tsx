'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface SmtpConnectionItem {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  from_name: string;
  from_email: string;
  reply_to?: string;
  is_verified: boolean;
  verified_at?: string;
  created_at?: string;
}

export default function SettingsPage() {
  const { t, locale } = useTranslation();
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Editable sender fields (user_settings)
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [replyTo, setReplyTo] = useState('');

  // SMTP Connections state
  const [connections, setConnections] = useState<SmtpConnectionItem[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [smtpTab, setSmtpTab] = useState<'list' | 'new'>('list');

  // New SMTP Connection Form State
  const [newSmtpProvider, setNewSmtpProvider] = useState<'hostinger' | 'google' | 'aruba' | 'office365' | 'custom'>('hostinger');
  const [newSmtpName, setNewSmtpName] = useState('Casella Principale');
  const [newSmtpEmail, setNewSmtpEmail] = useState('');
  const [newSmtpHost, setNewSmtpHost] = useState('smtp.hostinger.com');
  const [newSmtpPort, setNewSmtpPort] = useState('465');
  const [newSmtpSecure, setNewSmtpSecure] = useState(true);
  const [newSmtpUsername, setNewSmtpUsername] = useState('');
  const [newSmtpPassword, setNewSmtpPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newSmtpFromName, setNewSmtpFromName] = useState('');
  const [newSmtpReplyTo, setNewSmtpReplyTo] = useState('');

  // Verification & saving states for new SMTP
  const [verifyingSmtp, setVerifyingSmtp] = useState(false);
  const [detectingSmtp, setDetectingSmtp] = useState(false);
  const [smtpFormMsg, setSmtpFormMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Testing existing connection
  const [testingConnId, setTestingConnId] = useState<string | null>(null);
  const [deletingConnId, setDeletingConnId] = useState<string | null>(null);
  const [connTestResult, setConnTestResult] = useState<{ id?: string; success: boolean; text: string } | null>(null);

  // Direct test email dispatch
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [sendResult, setSendResult] = useState<{ success: boolean; text: string } | null>(null);

  // Apply provider presets
  const handleSelectPreset = (provider: 'hostinger' | 'google' | 'aruba' | 'office365' | 'custom') => {
    setNewSmtpProvider(provider);
    setSmtpFormMsg(null);

    switch (provider) {
      case 'hostinger':
        setNewSmtpHost('smtp.hostinger.com');
        setNewSmtpPort('465');
        setNewSmtpSecure(true);
        break;
      case 'google':
        setNewSmtpHost('smtp.gmail.com');
        setNewSmtpPort('465');
        setNewSmtpSecure(true);
        break;
      case 'aruba':
        setNewSmtpHost('smtps.aruba.it');
        setNewSmtpPort('465');
        setNewSmtpSecure(true);
        break;
      case 'office365':
        setNewSmtpHost('smtp.office365.com');
        setNewSmtpPort('587');
        setNewSmtpSecure(false);
        break;
      case 'custom':
        if (!newSmtpHost || newSmtpHost.includes('hostinger') || newSmtpHost.includes('gmail')) {
          setNewSmtpHost('');
        }
        break;
    }
  };

  // Auto-detect SMTP when user finishes entering new email
  const handleEmailBlur = async () => {
    const email = newSmtpEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;

    if (!newSmtpUsername) {
      setNewSmtpUsername(email);
    }
    if (!newSmtpFromName && fromName) {
      setNewSmtpFromName(fromName);
    }
    if (!newSmtpReplyTo && replyTo) {
      setNewSmtpReplyTo(replyTo);
    }

    try {
      setDetectingSmtp(true);
      const res = await fetch('/api/smtp/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.detected && result.config) {
          setNewSmtpHost(result.config.host);
          setNewSmtpPort(String(result.config.port));
          setNewSmtpSecure(Boolean(result.config.secure));
          if (result.config.provider === 'gmail') setNewSmtpProvider('google');
          else if (result.config.provider === 'hostinger') setNewSmtpProvider('hostinger');
          else if (result.config.provider === 'aruba') setNewSmtpProvider('aruba');
          else if (result.config.provider === 'office365') setNewSmtpProvider('office365');
          else setNewSmtpProvider('custom');
        } else if (result.suggestedHost) {
          setNewSmtpHost(result.suggestedHost);
          setNewSmtpPort(String(result.suggestedPort || 465));
          setNewSmtpSecure(result.suggestedSecure ?? true);
        }
      }
    } catch (err) {
      console.warn('Auto-detect error:', err);
    } finally {
      setDetectingSmtp(false);
    }
  };

  // Fetch initial data
  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.from_name) setFromName(data.from_name);
        if (data.from_email) setFromEmail(data.from_email);
        if (data.reply_to) setReplyTo(data.reply_to);

        const conns: SmtpConnectionItem[] = data.smtp_connections || [];
        setConnections(conns);

        if (conns.length > 0) {
          const verified = conns.find((c) => c.is_verified) || conns[0];
          setActiveConnectionId(verified.id);
          setSmtpTab('list');
        } else {
          setSmtpTab('new');
          if (data.from_email) {
            setNewSmtpEmail(data.from_email);
            setNewSmtpUsername(data.from_email);
          }
          if (data.from_name) {
            setNewSmtpFromName(data.from_name);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Save sender identity
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

  // Verify and Save new SMTP connection
  const handleSaveNewSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpFormMsg(null);

    if (!newSmtpHost || !newSmtpPort || !newSmtpEmail || !newSmtpPassword) {
      setSmtpFormMsg({
        success: false,
        text: locale === 'en' ? 'Please complete all required fields.' : 'Compila tutti i campi obbligatori per procedere.',
      });
      return;
    }

    setVerifyingSmtp(true);
    try {
      const payload = {
        name: newSmtpName.trim() || newSmtpEmail.trim(),
        host: newSmtpHost.trim(),
        port: Number(newSmtpPort),
        secure: Number(newSmtpPort) === 465 || newSmtpSecure,
        username: newSmtpUsername.trim() || newSmtpEmail.trim(),
        password: newSmtpPassword,
        from_name: newSmtpFromName.trim() || fromName.trim() || newSmtpEmail.split('@')[0],
        from_email: newSmtpEmail.trim().toLowerCase(),
        reply_to: (newSmtpReplyTo.trim() || replyTo.trim() || newSmtpEmail.trim()).toLowerCase(),
      };

      const res = await fetch('/api/smtp/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || (locale === 'en' ? 'SMTP verification failed' : 'Verifica SMTP fallita'));
      }

      setSmtpFormMsg({
        success: true,
        text: locale === 'en'
          ? `SMTP connection verified and secured successfully! (${result.from_email})`
          : `Connessione SMTP verificata e cifrata con successo! (${result.from_email})`,
      });

      // Clear password from memory
      setNewSmtpPassword('');
      // Reload connections
      await loadSettings();
      setSmtpTab('list');
      setActiveConnectionId(result.id);
    } catch (err: any) {
      setSmtpFormMsg({
        success: false,
        text: err.message || (locale === 'en' ? 'Connection error' : 'Errore durante la verifica della connessione'),
      });
    } finally {
      setVerifyingSmtp(false);
    }
  };

  // Test an existing connection
  const handleTestExistingConnection = async (connId?: string) => {
    const targetId = connId || activeConnectionId;
    setTestingConnId(targetId || 'active');
    setConnTestResult(null);

    try {
      const res = await fetch('/api/settings/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtp_connection_id: targetId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (locale === 'en' ? 'SMTP test failed' : 'Test fallito'));
      setConnTestResult({ id: targetId || undefined, success: true, text: data.message });
    } catch (err: any) {
      setConnTestResult({ id: targetId || undefined, success: false, text: err.message });
    } finally {
      setTestingConnId(null);
    }
  };

  // Delete an existing connection
  const handleDeleteConnection = async (connId: string) => {
    const conn = connections.find((c) => c.id === connId);
    const confirmPrompt = locale === 'en'
      ? `Are you sure you want to remove the SMTP account ${conn?.from_email || ''}?`
      : `Sei sicuro di voler rimuovere la casella SMTP ${conn?.from_email || ''}?`;

    if (!window.confirm(confirmPrompt)) return;

    setDeletingConnId(connId);
    try {
      const res = await fetch(`/api/smtp/connections/${connId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante l\'eliminazione');

      setConnections((prev) => prev.filter((c) => c.id !== connId));
      if (activeConnectionId === connId) {
        setActiveConnectionId(null);
      }
    } catch (err: any) {
      alert(err.message || 'Errore eliminazione casella');
    } finally {
      setDeletingConnId(null);
    }
  };

  // Direct test email dispatch
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient) return;

    setSendingTestEmail(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/settings/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testRecipient,
          smtp_connection_id: activeConnectionId || null,
        }),
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
          className="h-10 px-space-md rounded-lg bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] font-label-md text-label-md border border-[#e5e5e0] transition-colors flex items-center gap-2 self-start lg:self-auto shadow-2xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px] text-[#036e13]">help_outline</span>
          <span>{t.settings.restartWalkthrough}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Colonna Sinistra (4 col): Identità Mittente */}
        <div className="lg:col-span-5 bg-[#ffffff] rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] p-space-lg flex flex-col justify-between gap-space-md">
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
                className="w-full h-10 rounded-lg bg-[#30312f] text-[#f2f0ed] hover:bg-[#5c5e63] font-label-md text-label-md font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>{savingSettings ? (locale === 'en' ? 'Saving...' : 'Salvataggio...') : t.settings.saveSenderButton}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Colonna Destra (7 col): Suite Gestione & Configurazione SMTP */}
        <div className="lg:col-span-7 bg-[#ffffff] rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] p-space-lg flex flex-col justify-between gap-space-md">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-sm border-b border-[#e5e5e0] gap-2">
              <div className="flex items-center gap-space-sm">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${connections.length > 0 ? 'bg-[#f5f3f0] text-[#036e13]' : 'bg-[#fff1f0] text-[#cf1322]'}`}>
                  <span className="material-symbols-outlined text-[20px]">dns</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-[#1b1c1a]">
                    {locale === 'en' ? 'SMTP Outbound Gateway' : 'Gateway SMTP & Server di Spedizione'}
                  </h3>
                  <span className="font-label-sm text-label-sm text-[#5c5e63]">
                    {locale === 'en' ? 'Multi-tenant isolated email dispatcher' : 'Isolamento caselle con crittografia AES-256'}
                  </span>
                </div>
              </div>

              {/* Tab Selector: Caselle Collegate vs Aggiungi Nuova */}
              <div className="flex items-center gap-1 p-1 bg-[#f5f3f0] rounded-lg border border-[#e5e5e0]">
                <button
                  type="button"
                  onClick={() => { setSmtpTab('list'); setSmtpFormMsg(null); }}
                  className={`px-3 py-1.5 rounded-md font-label-sm text-xs font-semibold transition-all cursor-pointer ${
                    smtpTab === 'list' ? 'bg-[#ffffff] text-[#1b1c1a] shadow-xs' : 'text-[#5c5e63] hover:text-[#1b1c1a]'
                  }`}
                >
                  {locale === 'en' ? `Connected (${connections.length})` : `Caselle (${connections.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => { setSmtpTab('new'); setSmtpFormMsg(null); }}
                  className={`px-3 py-1.5 rounded-md font-label-sm text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    smtpTab === 'new' ? 'bg-[#ffffff] text-[#036e13] shadow-xs' : 'text-[#5c5e63] hover:text-[#1b1c1a]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  <span>{locale === 'en' ? 'Add SMTP' : 'Nuova Casella'}</span>
                </button>
              </div>
            </div>

            {/* TAB 1: LISTA CASELLE CONNESSE */}
            {smtpTab === 'list' && (
              <div className="mt-space-md space-y-3">
                {connections.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-[#e5e5e0] text-center bg-[#faf9f6]">
                    <span className="material-symbols-outlined text-[32px] text-[#cf1322] block mx-auto mb-2">
                      warning
                    </span>
                    <h4 className="font-headline-sm text-base text-[#1b1c1a] font-bold">
                      {locale === 'en' ? 'No verified SMTP mailbox found' : 'Nessuna casella SMTP configurata'}
                    </h4>
                    <p className="font-body-md text-xs text-[#5c5e63] mt-1 max-w-md mx-auto">
                      {locale === 'en'
                        ? 'To guarantee mailbox isolation and high deliverability, please configure your SMTP connection.'
                        : 'Per garantire l’isolamento della reputazione e la massima deliverability, configura subito la tua casella mittente protetta.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSmtpTab('new')}
                      className="mt-4 px-4 py-2 bg-[#5cb855] hover:bg-[#4ea547] text-white font-label-md text-xs font-semibold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>{locale === 'en' ? 'Configure SMTP Mailbox' : 'Configura Casella SMTP Adesso'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {connections.map((conn) => {
                      const isSelected = activeConnectionId === conn.id;
                      const isTestingThis = testingConnId === conn.id;
                      const isDeletingThis = deletingConnId === conn.id;

                      return (
                        <div
                          key={conn.id}
                          className={`p-space-md rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-[#fbfcfb] border-[#5cb855] shadow-xs'
                              : 'bg-[#ffffff] border-[#e5e5e0] hover:border-[#cfceca]'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setActiveConnectionId(conn.id)}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                                  isSelected ? 'border-[#036e13] bg-[#036e13]' : 'border-[#d0cfcb]'
                                }`}
                                title={isSelected ? 'Casella attiva predefinita' : 'Imposta come predefinita'}
                              >
                                {isSelected && <span className="w-2 h-2 rounded-full bg-white"></span>}
                              </button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-title-sm text-sm font-bold text-[#1b1c1a]">
                                    {conn.from_email}
                                  </span>
                                  {conn.is_verified ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ecf8eb] text-[#036e13] text-[10px] font-bold">
                                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                      VERIFICATO
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff1f0] text-[#cf1322] text-[10px] font-bold">
                                      DA VERIFICARE
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="px-2 py-0.5 rounded-md bg-[#f5f3f0] text-[#1b1c1a] text-[10px] font-semibold border border-[#e5e5e0]">
                                      ATTIVA
                                    </span>
                                  )}
                                </div>
                                <p className="font-body-md text-xs text-[#5c5e63] mt-0.5">
                                  {conn.host}:{conn.port} ({conn.secure ? 'SSL' : 'TLS'}) • Mittente: <span className="font-semibold text-[#1b1c1a]">{conn.from_name}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <button
                                type="button"
                                disabled={isTestingThis}
                                onClick={() => handleTestExistingConnection(conn.id)}
                                className="h-8 px-2.5 rounded-md bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] font-label-sm text-xs font-semibold border border-[#e5e5e0] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                title="Verifica connessione dal vivo"
                              >
                                <span className={`material-symbols-outlined text-[14px] ${isTestingThis ? 'animate-spin' : ''}`}>
                                  sync
                                </span>
                                <span>{isTestingThis ? 'Verifica...' : 'Collauda'}</span>
                              </button>

                              <button
                                type="button"
                                disabled={isDeletingThis}
                                onClick={() => handleDeleteConnection(conn.id)}
                                className="h-8 w-8 rounded-md bg-[#fff1f0] hover:bg-[#ffdad6] text-[#cf1322] border border-[#ffb4ab]/40 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                                title="Elimina casella SMTP"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Test result feedback for this connection */}
                          {connTestResult && connTestResult.id === conn.id && (
                            <div
                              className={`p-2.5 mt-3 rounded-lg flex items-center gap-2 font-body-md text-xs border ${
                                connTestResult.success
                                  ? 'bg-[#ecf8eb] border-[#5cb855]/30 text-[#036e13]'
                                  : 'bg-[#ffdad6] border-[#ffb4ab] text-[#ba1a1a]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {connTestResult.success ? 'check_circle' : 'error'}
                              </span>
                              <span>{connTestResult.text}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CONFIGURA NUOVA CASELLA SMTP */}
            {smtpTab === 'new' && (
              <form onSubmit={handleSaveNewSmtp} className="mt-space-md space-y-space-md">
                {/* Provider Quick Presets */}
                <div>
                  <label className="block font-label-sm text-label-sm uppercase tracking-wider text-[#1b1c1a] font-semibold mb-1.5">
                    {locale === 'en' ? 'Provider Preset' : 'Seleziona Provider Preconfigurato'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'hostinger', label: 'Hostinger' },
                      { id: 'google', label: 'Google / Gmail' },
                      { id: 'aruba', label: 'Aruba' },
                      { id: 'office365', label: 'Microsoft 365' },
                      { id: 'custom', label: 'Personalizzato' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p.id as any)}
                        className={`h-9 px-2 rounded-lg font-label-sm text-xs font-semibold border transition-all cursor-pointer ${
                          newSmtpProvider === p.id
                            ? 'bg-[#1b1c1a] text-white border-[#1b1c1a] shadow-xs'
                            : 'bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] border-[#e5e5e0]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {newSmtpProvider === 'google' && (
                    <div className="mt-2 p-2.5 bg-[#e8f0fe] border border-[#d2e3fc] rounded-lg text-[#1a73e8] font-body-md text-xs flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">info</span>
                      <span>
                        Per Gmail e Google Workspace è obbligatorio utilizzare una <strong>Password per le app</strong> (generata in Sicurezza Account Google &gt; Verifica in 2 passaggi &gt; Password per le app).
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div>
                    <label className="block font-label-sm text-label-sm uppercase tracking-wider text-[#1b1c1a] font-semibold mb-1">
                      {locale === 'en' ? 'Mailbox / Sender Email *' : 'Email Mittente Casella *'}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={newSmtpEmail}
                        onChange={(e) => setNewSmtpEmail(e.target.value)}
                        onBlur={handleEmailBlur}
                        placeholder="es. info@tuodominio.com"
                        className="w-full h-10 px-3 pr-8 rounded-lg border border-[#e5e5e0] bg-[#ffffff] text-[#1b1c1a] font-body-md text-body-md focus:outline-none focus:border-[#1b1c1a]"
                      />
                      {detectingSmtp && (
                        <div className="absolute right-2.5 top-2.5">
                          <span className="w-4 h-4 border-2 border-[#036e13] border-t-transparent rounded-full animate-spin block"></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-sm text-label-sm uppercase tracking-wider text-[#1b1c1a] font-semibold mb-1">
                      {locale === 'en' ? 'Sender Display Name *' : 'Nome Mittente Visualizzato *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newSmtpFromName}
                      onChange={(e) => setNewSmtpFromName(e.target.value)}
                      placeholder="es. Stefano Martini | ARKITECNA"
                      className="w-full h-10 px-3 rounded-lg border border-[#e5e5e0] bg-[#ffffff] text-[#1b1c1a] font-body-md text-body-md focus:outline-none focus:border-[#1b1c1a]"
                    />
                  </div>

                  <div>
                    <label className="block font-label-sm text-label-sm uppercase tracking-wider text-[#1b1c1a] font-semibold mb-1">
                      {t.settings.serverHostLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSmtpHost}
                      onChange={(e) => setNewSmtpHost(e.target.value)}
                      placeholder="es. smtp.hostinger.com"
                      className="w-full h-10 px-3 rounded-lg border border-[#e5e5e0] bg-[#ffffff] text-[#1b1c1a] font-body-md text-body-md focus:outline-none focus:border-[#1b1c1a]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-label-sm text-label-sm uppercase tracking-wider text-[#1b1c1a] font-semibold mb-1">
                        {t.settings.serverPortLabel} *
                      </label>
                      <input
                        type="number"
                        required
                        value={newSmtpPort}
                        onChange={(e) => {
                          setNewSmtpPort(e.target.value);
                          if (e.target.value === '465') setNewSmtpSecure(true);
                          else if (e.target.value === '587') setNewSmtpSecure(false);
                        }}
                        className="w-full h-10 px-3 rounded-lg border border-[#e5e5e0] bg-[#ffffff] text-[#1b1c1a] font-body-md text-body-md focus:outline-none focus:border-[#1b1c1a]"
                      />
                    </div>
                    <div>
                      <label className="block font-label-sm text-label-sm uppercase tracking-wider text-[#1b1c1a] font-semibold mb-1">
                        Sicurezza
                      </label>
                      <div className="h-10 flex items-center px-2 bg-[#f5f3f0] border border-[#e5e5e0] rounded-lg">
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newSmtpSecure}
                            onChange={(e) => setNewSmtpSecure(e.target.checked)}
                            className="rounded border-[#e5e5e0] text-[#036e13] focus:ring-0"
                          />
                          <span>SSL/TLS</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-sm text-label-sm uppercase tracking-wider text-[#1b1c1a] font-semibold mb-1">
                      {t.settings.serverUserLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSmtpUsername}
                      onChange={(e) => setNewSmtpUsername(e.target.value)}
                      placeholder="es. info@tuodominio.com"
                      className="w-full h-10 px-3 rounded-lg border border-[#e5e5e0] bg-[#ffffff] text-[#1b1c1a] font-body-md text-body-md focus:outline-none focus:border-[#1b1c1a]"
                    />
                  </div>

                  <div>
                    <label className="block font-label-sm text-label-sm uppercase tracking-wider text-[#1b1c1a] font-semibold mb-1">
                      {t.settings.smtpPassword} *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newSmtpPassword}
                        onChange={(e) => setNewSmtpPassword(e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full h-10 px-3 pr-10 rounded-lg border border-[#e5e5e0] bg-[#ffffff] text-[#1b1c1a] font-body-md text-body-md focus:outline-none focus:border-[#1b1c1a]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-[#5c5e63] hover:text-[#1b1c1a]"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {smtpFormMsg && (
                  <div
                    className={`p-space-sm rounded-lg flex items-center gap-2 font-body-md text-body-md border ${
                      smtpFormMsg.success
                        ? 'bg-[#ecf8eb] border-[#5cb855]/30 text-[#036e13]'
                        : 'bg-[#ffdad6] border-[#ffb4ab] text-[#ba1a1a]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {smtpFormMsg.success ? 'check_circle' : 'error'}
                    </span>
                    <span>{smtpFormMsg.text}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  {connections.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSmtpTab('list')}
                      className="h-10 px-4 rounded-lg bg-[#f5f3f0] hover:bg-[#eae8e5] text-[#1b1c1a] font-label-md text-xs font-semibold border border-[#e5e5e0] transition-colors cursor-pointer"
                    >
                      {locale === 'en' ? 'Cancel' : 'Annulla'}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={verifyingSmtp}
                    className="h-10 px-6 rounded-lg bg-[#5cb855] hover:bg-[#4ea547] text-white font-label-md text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${verifyingSmtp ? 'animate-spin' : ''}`}>
                      {verifyingSmtp ? 'sync' : 'lock'}
                    </span>
                    <span>
                      {verifyingSmtp
                        ? (locale === 'en' ? 'Verifying & Saving...' : 'Verifica e Cifratura...')
                        : (locale === 'en' ? 'Verify & Secure Mailbox' : 'Verifica e Salva Casella SMTP')}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Card 3: Collaudo Invio Email di Test Reale */}
        <div className="lg:col-span-12 bg-[#ffffff] rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.03)] p-space-lg flex flex-col justify-between gap-space-md">
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
            {connections.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-xs text-[#5c5e63]">Spedisci da:</span>
                <select
                  value={activeConnectionId || ''}
                  onChange={(e) => setActiveConnectionId(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-[#e5e5e0] bg-[#f5f3f0] text-[#1b1c1a] font-label-sm text-xs font-semibold focus:outline-none"
                >
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.from_email} ({c.host})
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              className="w-full sm:w-auto h-11 px-space-lg bg-[#5cb855] hover:bg-[#4ea547] text-[#ffffff] font-label-md text-label-md font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
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
