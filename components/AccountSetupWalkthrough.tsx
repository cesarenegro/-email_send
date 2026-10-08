'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  User,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { SUPPORTED_TIMEZONES, getTimezoneConfig } from '@/lib/constants/timezones';

interface AccountSetupWalkthroughProps {
  userEmail: string;
  initialName?: string;
  onComplete: () => void;
  isOpen?: boolean;
}

export default function AccountSetupWalkthrough({
  userEmail,
  initialName = '',
  onComplete,
  isOpen = true,
}: AccountSetupWalkthroughProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form states
  const [fromName, setFromName] = useState(initialName || 'Collaboratore | ARKITECNA');
  const [replyTo, setReplyTo] = useState(userEmail || 'info@arkitecna.com');
  const [timezone, setTimezone] = useState('Europe/Rome');
  const [sendWindowStart, setSendWindowStart] = useState('09:00');
  const [sendWindowEnd, setSendWindowEnd] = useState('18:00');

  // Test email state
  const [testEmail, setTestEmail] = useState(userEmail);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; text: string } | null>(null);

  // Finalizing state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendTestEmail = async () => {
    if (!testEmail) return;
    setSendingTest(true);
    setTestResult(null);

    try {
      // First save current user sender settings
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_name: fromName,
          from_email: 'cesare@arkitecna.com',
          reply_to: replyTo,
          preferred_timezone: timezone,
          send_window_start: sendWindowStart,
          send_window_end: sendWindowEnd,
        }),
      });

      const res = await fetch('/api/settings/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invio email fallito');
      setTestResult({ success: true, text: 'Email di test inviata con successo! Controlla la tua casella di posta.' });
    } catch (err: any) {
      setTestResult({ success: false, text: err.message || 'Errore durante l’invio del test' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleFinish = async (action: 'dashboard' | 'create_campaign') => {
    setSaving(true);
    setError(null);

    try {
      // Save settings and mark onboarding complete
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_name: fromName,
          from_email: 'cesare@arkitecna.com',
          reply_to: replyTo,
          preferred_timezone: timezone,
          send_window_start: sendWindowStart,
          send_window_end: sendWindowEnd,
          onboarding_completed: true,
        }),
      });

      await fetch('/api/settings/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });

      onComplete();

      if (action === 'create_campaign') {
        router.push('/campaigns/new');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-[#D8D2C8] overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8D2C8] bg-[#F7F5F0]">
          <div className="flex items-center space-x-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#1A1A1E] text-white text-xs font-semibold">
              {step}/5
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
              Configurazione Account Guidata
            </span>
          </div>
          <button
            onClick={() => handleFinish('dashboard')}
            className="text-xs text-[#666666] hover:text-[#1A1A1E] transition-colors p-1"
            title="Salta configurazione"
          >
            Salta
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#E5E0D8] h-1">
          <div
            className="bg-[#1A1A1E] h-1 transition-all duration-300 ease-out"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 space-y-6 flex-1 min-h-[360px] flex flex-col justify-between">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#1A1A1E]">Benvenuto in ARKITECNA MAILER</h3>
                <p className="text-sm text-[#666666] mt-1 leading-relaxed">
                  Questa piattaforma è progettata per inviare comunicazioni mirate in modo scaglionato, proteggendo la reputazione del dominio e garantendo che le tue email non finiscano nello SPAM.
                </p>
              </div>

              <div className="bg-[#FAF9F6] border border-[#D8D2C8] rounded-lg p-4 space-y-2.5 text-xs text-[#1A1A1E]">
                <div className="flex items-start space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Invio Scaglionato di Precisione:</strong> Le email vengono spedite una ad una a intervalli regolari (default 4 minuti) per simulare un invio umano.
                  </div>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Clock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Fasce Orarie e Giorni Lavorativi:</strong> Le campagne operano solo dal Lunedì al Venerdì negli orari da te stabiliti nel fuso orario del destinatario.
                  </div>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Mail className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Spazio Riservato Personale:</strong> Le tue campagne e i tuoi lead rimangono visibili e gestibili esclusivamente dal tuo account.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SENDER IDENTITY */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 flex items-center justify-center mb-2">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#1A1A1E]">La tua Identità Mittente</h3>
                <p className="text-sm text-[#666666] mt-1">
                  Definisci come i destinatari vedranno il tuo nome e a quale indirizzo desideri ricevere le risposte.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1E] mb-1">
                    Nome Visualizzato dal Destinatario
                  </label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="es. Mario Rossi | ARKITECNA"
                    className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm bg-white text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                  />
                  <p className="text-[11px] text-[#666666] mt-1">
                    Questo è il nome che compare nella casella di posta del cliente prima dell&apos;oggetto.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1E] mb-1">
                    Email di Risposta (Reply-To)
                  </label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="tuaemail@arkitecna.com"
                    className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm bg-white text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                  />
                  <p className="text-[11px] text-[#666666] mt-1">
                    Quando un contatto clicca &quot;Rispondi&quot;, l&apos;email arriverà direttamente a questo indirizzo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: TIMEZONE & SEND WINDOW */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 flex items-center justify-center mb-2">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#1A1A1E]">Fuso Orario & Orari di Invio</h3>
                <p className="text-sm text-[#666666] mt-1">
                  Scegli il tuo fuso orario di riferimento e la fascia oraria giornaliera in cui consentire l&apos;invio delle email.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1E] mb-1">
                    Fuso Orario Predefinito
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm bg-white text-[#1A1A1E] font-medium focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                  >
                    {SUPPORTED_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label} ({tz.utcOffset})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#666666] mt-1">
                    {getTimezoneConfig(timezone).description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1E] mb-1">
                      Inizio Invio (HH:mm)
                    </label>
                    <input
                      type="time"
                      value={sendWindowStart}
                      onChange={(e) => setSendWindowStart(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm bg-white text-[#1A1A1E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1E] mb-1">
                      Fine Invio (HH:mm)
                    </label>
                    <input
                      type="time"
                      value={sendWindowEnd}
                      onChange={(e) => setSendWindowEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm bg-white text-[#1A1A1E]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: EMAIL TEST */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center mb-2">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#1A1A1E]">Test di Invio Immediato</h3>
                <p className="text-sm text-[#666666] mt-1">
                  Verifichiamo che il server di posta risponda correttamente e che tu possa ricevere email senza problemi.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1E] mb-1">
                    Invia un&apos;email di prova a questo indirizzo:
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="tuaemail@esempio.com"
                      className="flex-1 px-3 py-2 border border-[#D8D2C8] rounded text-sm bg-white text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                    />
                    <button
                      type="button"
                      disabled={sendingTest || !testEmail}
                      onClick={handleSendTestEmail}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#1A1A1E] text-white text-xs font-semibold rounded hover:bg-[#333333] transition-colors disabled:opacity-50 shrink-0"
                    >
                      {sendingTest ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Invio...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Invia Test</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded text-xs flex items-start space-x-2 border ${
                      testResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    )}
                    <span>{testResult.text}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: READY */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in duration-200 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#1A1A1E]">Configurazione Completata!</h3>
                <p className="text-sm text-[#666666] mt-2 max-w-md mx-auto leading-relaxed">
                  Il tuo account è pronto per inviare email professionali scaglionate. Puoi modificare queste impostazioni in ogni momento dalla pagina Impostazioni.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleFinish('create_campaign')}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-[#1A1A1E] text-white text-sm font-semibold rounded-lg hover:bg-[#333333] transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Crea la tua prima Campagna</span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleFinish('dashboard')}
                  className="w-full sm:w-auto px-4 py-2.5 border border-[#D8D2C8] text-xs font-semibold text-[#1A1A1E] rounded-lg hover:bg-[#F7F5F0] transition-colors"
                >
                  Vai alla Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Navigation Footer */}
          {step < 5 && (
            <div className="flex items-center justify-between pt-6 border-t border-[#D8D2C8]">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.max(1, prev - 1) as any)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs text-[#666666] hover:text-[#1A1A1E] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  <span>Indietro</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setStep((prev) => Math.min(5, prev + 1) as any)}
                className="inline-flex items-center space-x-1.5 px-5 py-2 bg-[#1A1A1E] text-white text-xs font-semibold rounded hover:bg-[#333333] transition-colors"
              >
                <span>Continua</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
