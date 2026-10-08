'use client';

import React, { useState, useEffect } from 'react';
import { Server, Send, CheckCircle2, AlertCircle, Loader2, Save, Mail, UserCheck, Sparkles } from 'lucide-react';


export default function SettingsPage() {
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
      if (!res.ok) throw new Error(data.error || 'Errore durante il salvataggio');

      setSaveSuccessMsg(data.message || 'Impostazioni mittente salvate con successo!');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || 'Errore durante il salvataggio');
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
      if (!res.ok) throw new Error(data.error || 'Test fallito');
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
      if (!res.ok) throw new Error(data.error || 'Test IMAP fallito');
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
      if (!res.ok) throw new Error(data.error || 'Invio email test fallito');
      setSendResult({ success: true, text: data.message });
    } catch (err: any) {
      setSendResult({ success: false, text: err.message });
    } finally {
      setSendingTestEmail(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">Impostazioni & SMTP</h1>
          <p className="text-sm text-[#666666]">
            Gestione mittente, credenziali server SMTP Hostinger e strumenti di verifica
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open-onboarding-walkthrough'));
            }
          }}
          className="inline-flex items-center space-x-1.5 px-3 py-2 border border-[#D8D2C8] bg-white text-[#1A1A1E] text-xs font-semibold rounded-lg hover:bg-[#F7F5F0] transition-colors shadow-sm self-start sm:self-auto"
          title="Riapri la guida a popup per la configurazione dell'account"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>Riavvia Guida Introduttiva</span>
        </button>
      </div>

      {/* Editable Sender Identity Card */}
      <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-6 shadow-sm space-y-5">
        <div className="flex items-center space-x-3 pb-4 border-b border-[#D8D2C8]">
          <UserCheck className="w-5 h-5 text-[#1A1A1E]" />
          <div>
            <h3 className="text-base font-semibold text-[#1A1A1E]">Identità Mittente Campagne (Modificabile)</h3>
            <p className="text-xs text-[#666666]">
              Puoi modificare l&apos;indirizzo mittente (anche un alias come info@arkitecna.com) e il nome visualizzato
            </p>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {saveErrorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{saveErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1E] mb-1">
                Nome Mittente Visualizzato <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                disabled={loadingSettings || savingSettings}
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="es. Stefano Martini | ARKITECNA"
                className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] disabled:bg-[#F7F5F0]"
              />
              <span className="text-[11px] text-[#666666] mt-0.5 block">
                Il nome che i destinatari vedranno nella loro casella di posta
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1E] mb-1">
                Indirizzo Email Mittente (Alias o Casella) <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                required
                disabled={loadingSettings || savingSettings}
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="es. info@arkitecna.com"
                className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm font-mono text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] disabled:bg-[#F7F5F0]"
              />
              <span className="text-[11px] text-[#666666] mt-0.5 block">
                Indirizzo mittente (es. info@arkitecna.com). Supporta alias del dominio.
              </span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A1A1E] mb-1">
                Indirizzo Reply-To (Risposte dei Clienti) <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                required
                disabled={loadingSettings || savingSettings}
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="es. info@arkitecna.com"
                className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm font-mono text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] disabled:bg-[#F7F5F0]"
              />
              <span className="text-[11px] text-[#666666] mt-0.5 block">
                Quando un destinatario clicca su &quot;Rispondi&quot;, l&apos;email verrà indirizzata qui.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loadingSettings || savingSettings}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#1A1A1E] text-white text-xs font-semibold rounded hover:bg-[#333333] transition-colors shadow-sm disabled:opacity-50"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salva Modifiche Mittente</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SMTP Server Infrastructure Info Card (Read-only) */}
      <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-[#D8D2C8]">
          <Server className="w-5 h-5 text-[#1A1A1E]" />
          <div>
            <h3 className="text-base font-semibold text-[#1A1A1E]">Connessione Server SMTP Hostinger</h3>
            <p className="text-xs text-[#666666]">Parametri di rete e autenticazione server</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-[#F7F5F0] border border-[#D8D2C8] rounded">
            <span className="text-[#666666] block mb-0.5">Provider SMTP:</span>
            <span className="font-semibold text-[#1A1A1E]">Hostinger</span>
          </div>
          <div className="p-3 bg-[#F7F5F0] border border-[#D8D2C8] rounded">
            <span className="text-[#666666] block mb-0.5">Host SMTP:</span>
            <span className="font-mono text-[#1A1A1E]">{smtpHost}</span>
          </div>
          <div className="p-3 bg-[#F7F5F0] border border-[#D8D2C8] rounded">
            <span className="text-[#666666] block mb-0.5">Porta & Crittografia:</span>
            <span className="font-semibold text-[#1A1A1E]">{smtpPort} (SSL / TLS)</span>
          </div>
          <div className="p-3 bg-[#F7F5F0] border border-[#D8D2C8] rounded">
            <span className="text-[#666666] block mb-0.5">Account Autenticazione:</span>
            <span className="font-mono text-[#1A1A1E]">{smtpUser}</span>
          </div>
          <div className="p-3 bg-[#F7F5F0] border border-[#D8D2C8] rounded">
            <span className="text-[#666666] block mb-0.5">Password SMTP:</span>
            <span className="font-mono text-[#666666]">•••••••••••• (Nascosta / Sicura)</span>
          </div>
          <div className="p-3 bg-[#F7F5F0] border border-[#D8D2C8] rounded">
            <span className="text-[#666666] block mb-0.5">Firma Dominio:</span>
            <span className="text-emerald-700 font-semibold">SPF / DKIM Allineati</span>
          </div>
        </div>

        {/* Connection Test Section */}
        <div className="pt-4 border-t border-[#D8D2C8] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[#1A1A1E]">Test Connessione Socket SMTP</h4>
              <p className="text-xs text-[#666666]">Verifica handshake TLS e autenticazione con Hostinger</p>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[#1A1A1E] text-white text-xs font-medium rounded hover:bg-[#333333] transition-colors disabled:opacity-50 self-start sm:self-auto"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifica in corso...</span>
                </>
              ) : (
                <>
                  <Server className="w-4 h-4" />
                  <span>TEST SMTP CONNECTION</span>
                </>
              )}
            </button>
          </div>

          {connectionResult && (
            <div
              className={`p-3 rounded text-xs flex items-center space-x-2 ${
                connectionResult.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {connectionResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{connectionResult.text}</span>
            </div>
          )}
        </div>

        {/* IMAP Bounce Receiver Section */}
        <div className="pt-4 border-t border-[#D8D2C8] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[#1A1A1E]">Ricezione Rimbalzi (IMAP Hostinger)</h4>
              <p className="text-xs text-[#666666]">
                Connessione protetta a <span className="font-mono text-[#1A1A1E]">imap.hostinger.com:993 (SSL)</span> per rilevamento automatico rifiuti (550 User unknown, DSN).
                <br />
                <span className="text-emerald-700 font-medium">Modalità sicura: non segna mai le email dei clienti come lette.</span>
              </p>
            </div>
            <button
              onClick={handleTestImap}
              disabled={testingImap}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium rounded hover:bg-amber-100 transition-colors disabled:opacity-50 self-start sm:self-auto"
            >
              {testingImap ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                  <span>Verifica IMAP...</span>
                </>
              ) : (
                <>
                  <Server className="w-4 h-4 text-amber-700" />
                  <span>TEST IMAP CONNECTION</span>
                </>
              )}
            </button>
          </div>

          {imapResult && (
            <div
              className={`p-3 rounded text-xs flex items-center space-x-2 ${
                imapResult.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {imapResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{imapResult.text}</span>
            </div>
          )}
        </div>

        {/* Real Send Test Section */}
        <div className="pt-4 border-t border-[#D8D2C8] space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-[#1A1A1E]">Invia Email di Test</h4>
            <p className="text-xs text-[#666666]">
              Invia un messaggio di prova reale con il mittente e l&apos;alias attualmente configurati
            </p>
          </div>

          <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="latuaemail@esempio.it"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="flex-1 px-3 py-2 border border-[#D8D2C8] rounded text-xs text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
            />
            <button
              type="submit"
              disabled={sendingTestEmail}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-[#1A1A1E] text-white text-xs font-medium rounded hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              {sendingTestEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Invio in corso...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>SEND TEST EMAIL</span>
                </>
              )}
            </button>
          </form>

          {sendResult && (
            <div
              className={`p-3 rounded text-xs flex items-center space-x-2 ${
                sendResult.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {sendResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{sendResult.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
