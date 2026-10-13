'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mail, Key, CheckCircle2, AlertCircle, Loader2, Server, HelpCircle, ExternalLink, ShieldCheck, Eye, EyeOff, PlusCircle } from 'lucide-react';

export interface SmtpConfigState {
  useExisting: boolean;
  email: string;
  host: string;
  port: number;
  secure: boolean;
  provider: string;
  providerNotes?: string;
  appPasswordUrl?: string;
  isVerified: boolean;
  smtpConnectionId?: string | null;
}

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
}

interface Step1SmtpProps {
  currentUserId?: string | null;
  getSessionToken: () => number;
  data: SmtpConfigState;
  onUpdate: (data: Partial<SmtpConfigState>, callingUserId?: string | null) => void;
  existingEmail?: string;
}

export default function Step1Smtp({ currentUserId, getSessionToken, data, onUpdate }: Step1SmtpProps) {
  // Local-only password state (NEVER persisted to localStorage or parent draft)
  const [passwordInput, setPasswordInput] = useState('');
  const [fromNameInput, setFromNameInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [savedConnections, setSavedConnections] = useState<SmtpConnectionItem[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
    data.isVerified ? { success: true, message: 'Casella verificata e autorizzata per l\'invio.' } : null
  );
  const [showManualGuide, setShowManualGuide] = useState(false);

  // Each mounted session owns a cancellation signal. A remount must never revive
  // an old operation, even when the same user signs in again.
  const sessionController = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    sessionController.current = controller;
    return () => {
      controller.abort();
      if (sessionController.current === controller) sessionController.current = null;
    };
  }, [currentUserId]);

  const beginOperation = () => {
    const controller = sessionController.current;
    const token = getSessionToken();
    return {
      signal: controller?.signal,
      isCurrent: () => Boolean(currentUserId && controller &&
        !controller.signal.aborted && sessionController.current === controller &&
        getSessionToken() === token),
    };
  };

  // Load user's authentic verified connections from server
  useEffect(() => {
    const operation = beginOperation();
    const sessionUserId = currentUserId;

    async function loadConnections() {
      try {
        setLoadingConnections(true);
        if (!operation.isCurrent()) return;
        const res = await fetch('/api/smtp/connections', { signal: operation.signal });
        if (!operation.isCurrent()) return;

        if (res.ok) {
          const conns: SmtpConnectionItem[] = await res.json();
          if (!operation.isCurrent()) return;

          setSavedConnections(conns);
          const verifiedConns = conns.filter((c) => c.is_verified === true);
          if (verifiedConns.length > 0) {
            setMode('existing');
            // If none currently selected, pick the first verified one
            if (!data.smtpConnectionId) {
              const first = verifiedConns[0];
              onUpdate({
                useExisting: true,
                isVerified: true,
                smtpConnectionId: first.id,
                email: first.from_email,
                host: first.host,
                port: first.port,
                secure: first.secure,
              }, sessionUserId);
              if (operation.isCurrent()) {
                setTestResult({
                  success: true,
                  message: `Casella verificata: ${first.from_email} (${first.host})`,
                });
              }
            }
          } else if (conns.length > 0) {
            setMode('existing');
          } else {
            setMode('new');
          }
        }
      } catch (err: any) {
        if (operation.isCurrent() && err.name !== 'AbortError') {
          console.warn('Error loading SMTP connections:', err);
        }
      } finally {
        if (operation.isCurrent()) {
          setLoadingConnections(false);
        }
      }
    }

    loadConnections();

  }, [currentUserId]);

  const handleSelectSaved = (conn: SmtpConnectionItem) => {
    const isConnVerified = Boolean(conn.is_verified);
    onUpdate({
      useExisting: true,
      isVerified: isConnVerified,
      smtpConnectionId: conn.id,
      email: conn.from_email,
      host: conn.host,
      port: conn.port,
      secure: conn.secure,
    }, currentUserId);
    if (isConnVerified) {
      setTestResult({
        success: true,
        message: `Casella verificata: ${conn.from_email} (${conn.host})`,
      });
    } else {
      setTestResult({
        success: false,
        message: `Attenzione: la casella ${conn.from_email} non è verificata. Verifica la configurazione prima di inviare.`,
      });
    }
  };

  const handleEmailBlur = async () => {
    if (!data.email || !data.email.includes('@')) return;
    const sessionUserId = currentUserId;
    const operation = beginOperation();
    if (!operation.isCurrent()) return;

    try {
      setDetecting(true);
      const res = await fetch('/api/smtp/detect', {
        signal: operation.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });
      if (!operation.isCurrent()) return;
      const result = await res.json();
      if (!operation.isCurrent()) return;

      if (result.detected && result.config) {
        onUpdate({
          host: result.config.host,
          port: result.config.port,
          secure: result.config.secure,
          provider: result.config.provider,
          providerNotes: result.config.notes,
          appPasswordUrl: result.config.appPasswordUrl,
          isVerified: false,
          smtpConnectionId: null,
        }, sessionUserId);
        setShowManualGuide(false);
      } else {
        onUpdate({
          host: result.suggestedHost || `mail.${data.email.split('@')[1] || ''}`,
          port: result.suggestedPort || 465,
          secure: result.suggestedSecure ?? true,
          provider: 'custom',
          providerNotes: undefined,
          appPasswordUrl: undefined,
          isVerified: false,
          smtpConnectionId: null,
        }, sessionUserId);
        setShowManualGuide(true);
      }
    } catch (err) {
      if (operation.isCurrent()) {
        console.warn('Auto-detect error:', err);
        setShowManualGuide(true);
      }
    } finally {
      if (operation.isCurrent()) {
        setDetecting(false);
      }
    }
  };

  const handleVerifyAndSave = async () => {
    const operation = beginOperation();
    if (!operation.isCurrent()) return;
    if (!data.email || !passwordInput || !data.host) {
      setTestResult({
        success: false,
        message: 'Inserisci indirizzo email, password e server prima di verificare.',
      });
      return;
    }

    const sessionUserId = currentUserId;
    setVerifying(true);
    setTestResult(null);

    try {
      // 1. First verify handshake via SSRF-protected /api/smtp/verify
      const verifyRes = await fetch('/api/smtp/verify', {
        signal: operation.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: data.host,
          port: Number(data.port),
          secure: Boolean(data.secure),
          user: data.email,
          pass: passwordInput,
        }),
      });

      if (!operation.isCurrent()) return;
      const verifyData = await verifyRes.json();
      if (!operation.isCurrent()) return;

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Impossibile connettersi al server SMTP.');
      }

      // 2. Handshake succeeded: save server-side with AES-256-GCM encryption
      const saveRes = await fetch('/api/smtp/connections', {
        signal: operation.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.email,
          host: data.host,
          port: Number(data.port),
          secure: Boolean(data.secure),
          username: data.email,
          password: passwordInput,
          from_name: fromNameInput.trim() || data.email.split('@')[0],
          from_email: data.email.trim(),
        }),
      });

      if (!operation.isCurrent()) return;
      const saveData = await saveRes.json();
      if (!operation.isCurrent()) return;

      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Errore salvataggio connessione protetta sul server.');
      }

      // 3. Clear sensitive password immediately from React state
      setPasswordInput('');

      // 4. Update parent state with verified connection ID strictly bound to sessionUserId
      onUpdate({
        isVerified: true,
        smtpConnectionId: saveData.id,
        useExisting: true,
      }, sessionUserId);

      // Update local saved list
      setSavedConnections((prev) => [saveData, ...prev]);
      setMode('existing');
      setTestResult({
        success: true,
        message: `Connessione SMTP verificata e salvata con successo con cifratura server-side! (${data.email})`,
      });
    } catch (err: any) {
      if (operation.isCurrent()) {
        setTestResult({
          success: false,
          message: err.message || 'Errore durante la verifica SMTP.',
        });
        onUpdate({ isVerified: false }, sessionUserId);
      }
    } finally {
      if (operation.isCurrent()) {
        setVerifying(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h3 className="text-lg font-semibold text-[#1B1C1A]">1. Da quale casella email vuoi spedire?</h3>
        <p className="text-xs text-[#5C5E63] mt-1">
          La casella autenticata sul server sarà esattamente quella utilizzata per spedire le email.
        </p>
      </div>

      {/* Mode Switcher if user has saved connections */}
      {savedConnections.length > 0 && (
        <div className="flex items-center gap-2 p-1 bg-[#EAE8E5] rounded-xl text-xs font-semibold max-w-md">
          <button
            type="button"
            onClick={() => setMode('existing')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all ${
              mode === 'existing'
                ? 'bg-white text-[#1B1C1A] shadow-xs'
                : 'text-[#5C5E63] hover:text-[#1B1C1A]'
            }`}
          >
            Caselle Verificate ({savedConnections.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('new');
              onUpdate({ isVerified: false, smtpConnectionId: null });
              setTestResult(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'new'
                ? 'bg-white text-[#1B1C1A] shadow-xs'
                : 'text-[#5C5E63] hover:text-[#1B1C1A]'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Collega Nuova</span>
          </button>
        </div>
      )}

      {/* List of Verified Server Connections */}
      {mode === 'existing' && savedConnections.length > 0 && (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#1B1C1A] uppercase tracking-wider">
            Seleziona la casella verificata autorizzata:
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {savedConnections.map((conn) => {
              const isSelected = data.smtpConnectionId === conn.id;
              return (
                <div
                  key={conn.id}
                  onClick={() => handleSelectSaved(conn)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-[#D8D2C8] hover:border-[#A2A59E]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="saved_smtp_choice"
                        checked={isSelected}
                        onChange={() => handleSelectSaved(conn)}
                        className="text-[#036E13] focus:ring-[#036E13]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#1B1C1A]">
                            {conn.from_name || conn.name}
                          </span>
                          {conn.is_verified ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Verificata Lato Server
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-600" /> Non Verificata
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#5C5E63] font-mono mt-0.5">
                          {conn.from_email} • {conn.host}:{conn.port}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connect New Mailbox Form */}
      {(mode === 'new' || savedConnections.length === 0) && (
        <div className="space-y-4 bg-white p-5 rounded-xl border border-[#D8D2C8] shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* From Name */}
            <div>
              <label className="block text-xs font-semibold text-[#1B1C1A] uppercase tracking-wider mb-1.5">
                Nome Mittente Visualizzato
              </label>
              <input
                type="text"
                placeholder="es. Mario Rossi | Azienda"
                value={fromNameInput}
                onChange={(e) => setFromNameInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D8D2C8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036E13]/30"
              />
            </div>

            {/* Email input */}
            <div>
              <label className="block text-xs font-semibold text-[#1B1C1A] uppercase tracking-wider mb-1.5">
                Indirizzo Email Casella <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A2A59E] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="es. nome@dominio.it"
                  value={data.email}
                  onChange={(e) => {
                    onUpdate({ email: e.target.value, isVerified: false, smtpConnectionId: null });
                    setTestResult(null);
                  }}
                  onBlur={handleEmailBlur}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#D8D2C8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036E13]/30"
                />
                {detecting && (
                  <div className="absolute right-3 top-2.5 flex items-center gap-1.5 text-xs text-[#5C5E63]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Riconoscimento...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Provider Specific Notes */}
          {data.providerNotes && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Istruzioni per {data.provider.toUpperCase()}</span>
              </div>
              <p className="leading-relaxed">{data.providerNotes}</p>
              {data.appPasswordUrl && (
                <a
                  href={data.appPasswordUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-amber-800 font-semibold underline hover:text-amber-950 mt-1"
                >
                  <span>Apri impostazioni di sicurezza dell'account</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Password Input (Local Only) */}
          <div>
            <label className="block text-xs font-semibold text-[#1B1C1A] uppercase tracking-wider mb-1.5">
              Password della casella {data.providerNotes ? '(o Password per le app)' : ''} <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-[#A2A59E] absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="off"
                placeholder="••••••••••••••••"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  onUpdate({ isVerified: false, smtpConnectionId: null });
                  setTestResult(null);
                }}
                className="w-full pl-9 pr-10 py-2 text-sm border border-[#D8D2C8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#036E13]/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#A2A59E] hover:text-[#1B1C1A]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[#5C5E63] mt-1">
              La password non viene mai salvata nel browser e viene cifrata sul server con algoritmo AES-256-GCM.
            </p>
          </div>

          {/* Advanced Server Parameters */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowManualGuide(!showManualGuide)}
              className="text-xs text-[#036E13] font-medium hover:underline flex items-center gap-1"
            >
              <Server className="w-3.5 h-3.5" />
              <span>{showManualGuide ? 'Nascondi parametri server' : 'Parametri server (Host/Porta SMTP)'}</span>
            </button>
          </div>

          {showManualGuide && (
            <div className="p-4 bg-[#F5F3F0] rounded-lg border border-[#D8D2C8] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#1B1C1A] mb-1">Server Host</label>
                  <input
                    type="text"
                    value={data.host}
                    onChange={(e) => onUpdate({ host: e.target.value, isVerified: false, smtpConnectionId: null })}
                    placeholder="es. smtp.gmail.com"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D8D2C8] rounded"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#1B1C1A] mb-1">Porta e Cifratura</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdate({ port: 465, secure: true, isVerified: false, smtpConnectionId: null })}
                      className={`flex-1 py-1.5 text-xs rounded border text-center font-medium ${
                        data.port === 465 ? 'bg-[#036E13] text-white border-[#036E13]' : 'bg-white text-[#1B1C1A] border-[#D8D2C8]'
                      }`}
                    >
                      465 (SSL)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdate({ port: 587, secure: false, isVerified: false, smtpConnectionId: null })}
                      className={`flex-1 py-1.5 text-xs rounded border text-center font-medium ${
                        data.port === 587 ? 'bg-[#036E13] text-white border-[#036E13]' : 'bg-white text-[#1B1C1A] border-[#D8D2C8]'
                      }`}
                    >
                      587 (STARTTLS)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test & Save action */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={verifying || !data.email || !passwordInput}
              onClick={handleVerifyAndSave}
              className="px-4 py-2 bg-[#1B1C1A] text-white text-xs font-semibold rounded-lg hover:bg-[#333333] transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifica e cifratura in corso...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verifica e Collega Casella</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-[#5C5E63]">
              Verifica obbligatoria sul server prima di proseguire.
            </span>
          </div>
        </div>
      )}

      {/* Verification feedback banner */}
      {testResult && (
        <div
          className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
            testResult.success
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="leading-relaxed">{testResult.message}</div>
        </div>
      )}
    </div>
  );
}
