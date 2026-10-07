'use client';

import React, { useState } from 'react';
import { Server, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [testingConnection, setTestingConnection] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; text: string } | null>(null);
  const [sendResult, setSendResult] = useState<{ success: boolean; text: string } | null>(null);

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">Impostazioni & SMTP</h1>
        <p className="text-sm text-[#666666]">
          Stato del server SMTP Hostinger e strumenti di verifica di recapito
        </p>
      </div>

      {/* SMTP Info Card */}
      <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-[#D8D2C8]">
          <Server className="w-5 h-5 text-[#1A1A1E]" />
          <div>
            <h3 className="text-base font-semibold text-[#1A1A1E]">Casella di Invio SMTP</h3>
            <p className="text-xs text-[#666666]">Configurazione caricata dalle variabili d&apos;ambiente del server</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-[#F7F5F0] border border-[#D8D2C8] rounded">
            <span className="text-[#666666] block mb-0.5">Provider SMTP:</span>
            <span className="font-semibold text-[#1A1A1E]">Hostinger</span>
          </div>
          <div className="p-3 bg-[#F7F5F0] border border-[#D8D2C8] rounded">
            <span className="text-[#666666] block mb-0.5">Host SMTP:</span>
            <span className="font-mono text-[#1A1A1E]">smtp.hostinger.com</span>
          </div>
          <div className="p-3 bg-[#F7F5F0] border border-[#D8D2C8] rounded">
            <span className="text-[#666666] block mb-0.5">Porta & Crittografia:</span>
            <span className="font-semibold text-[#1A1A1E]">465 (SSL / TLS)</span>
          </div>
          <div className="p-3 bg-[#F7F5F0] border border-[#D8D2C8] rounded">
            <span className="text-[#666666] block mb-0.5">Mittente Predefinito:</span>
            <span className="text-[#1A1A1E]">Stefano Martini | ARKITECNA</span>
          </div>
          <div className="p-3 bg-[#F7F5F0] border border-[#D8D2C8] rounded">
            <span className="text-[#666666] block mb-0.5">Indirizzo Email Mittente:</span>
            <span className="font-mono text-[#1A1A1E]">cesare@arkitecna.com</span>
          </div>
          <div className="p-3 bg-[#F7F5F0] border border-[#D8D2C8] rounded">
            <span className="text-[#666666] block mb-0.5">Password SMTP:</span>
            <span className="font-mono text-[#666666]">•••••••••••• (Nascosta / Sicura)</span>
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
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{connectionResult.text}</span>
            </div>
          )}
        </div>

        {/* Send Test Email Section */}
        <div className="pt-4 border-t border-[#D8D2C8] space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-[#1A1A1E]">Invia Email di Test</h4>
            <p className="text-xs text-[#666666]">
              Invia un messaggio di prova reale (non incrementa i contatori delle campagne)
            </p>
          </div>

          <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="latuaemail@esempio.it"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="flex-1 px-3 py-2 border border-[#D8D2C8] rounded text-xs bg-white text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
            />
            <button
              type="submit"
              disabled={sendingTestEmail || !testRecipient}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-[#1A1A1E] text-white text-xs font-medium rounded hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              {sendingTestEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Invio test...</span>
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
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{sendResult.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
