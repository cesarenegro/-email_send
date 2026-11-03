'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n/useTranslation';

type Mode = 'password' | 'otp_request' | 'otp_verify';

interface LoginFormProps {
  /** Intestazione della pagina. */
  title: string;
  /** Riga sotto il titolo (vuota per nessuna). */
  subtitle?: string;
  /** Mostra il collegamento "Accedi con account KONTA PRO". */
  showProLink?: boolean;
}

const COPY = {
  it: {
    email: 'Email',
    password: 'Password',
    signIn: 'Accedi',
    signingIn: 'Accesso…',
    otpLink: 'Accedi con un link via email',
    otpSend: 'Invia link',
    otpSending: 'Invio…',
    otpSent: 'Email inviata: apri il link oppure inserisci il codice.',
    otpCode: 'Codice (se presente)',
    otpVerify: 'Conferma',
    otpVerifying: 'Verifica…',
    backToPassword: 'Torna alla password',
    proLink: 'Accedi con account KONTA PRO',
    missingEnv: 'Configurazione Supabase mancante.',
    callbackFailed: 'Link non valido o scaduto.',
    invalid: 'Email o password non corretti.',
    generic: 'Accesso non riuscito. Riprova.',
    noAccount: 'Gli account si creano in KONTA PRO.',
  },
  en: {
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    otpLink: 'Sign in with an email link',
    otpSend: 'Send link',
    otpSending: 'Sending…',
    otpSent: 'Email sent: open the link or enter the code.',
    otpCode: 'Code (if any)',
    otpVerify: 'Confirm',
    otpVerifying: 'Verifying…',
    backToPassword: 'Back to password',
    proLink: 'Sign in with your KONTA PRO account',
    missingEnv: 'Supabase configuration missing.',
    callbackFailed: 'Invalid or expired link.',
    invalid: 'Wrong email or password.',
    generic: 'Sign-in failed. Try again.',
    noAccount: 'Accounts are created in KONTA PRO.',
  },
} as const;

export default function LoginForm({ title, subtitle, showProLink = true }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useTranslation();
  const c = COPY[locale === 'en' ? 'en' : 'it'];

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const e = searchParams.get('error');
    if (e === 'missing_env') return c.missingEnv;
    if (e === 'auth_callback_failed') return c.callbackFailed;
    return null;
  });
  const [notice, setNotice] = useState<string | null>(null);

  const normalizedEmail = email.trim().toLowerCase();

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (signInError) {
        setError(/invalid/i.test(signInError.message) ? c.invalid : signInError.message || c.generic);
        return;
      }
      router.replace('/workspace');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : c.generic);
    } finally {
      setBusy(false);
    }
  }

  async function handleOtpRequest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (otpError) {
        setError(otpError.message || c.generic);
        return;
      }
      setNotice(c.otpSent);
      setMode('otp_verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : c.generic);
    } finally {
      setBusy(false);
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: code.trim(),
        type: 'email',
      });
      if (verifyError) {
        setError(verifyError.message || c.generic);
        return;
      }
      router.replace('/workspace');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : c.generic);
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full h-11 px-3 rounded-lg border border-[#e5e5e0] bg-white text-[#1b1c1a] text-sm outline-none focus:border-[#036e13] focus:ring-2 focus:ring-[#036e13]/15 transition';
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-[#5c5e63] mb-1.5';
  const buttonClass =
    'w-full h-11 rounded-lg bg-[#1b1c1a] text-[#f2f0ed] text-sm font-semibold hover:bg-[#30312f] disabled:opacity-50 disabled:cursor-not-allowed transition';

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <Link href="/landing" className="inline-flex items-center gap-2 mb-6">
          <img src="/icon.png" alt="MAIL-K" className="w-8 h-8 rounded-lg border border-[#e5e5e0]" />
          <span className="font-headline-md text-sm font-bold tracking-wider uppercase text-[#1b1c1a]">MAIL-K</span>
        </Link>
        <h1 className="font-headline-md text-2xl text-[#1b1c1a]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[#5c5e63]">{subtitle}</p> : null}
      </div>

      {mode === 'password' && (
        <form onSubmit={handlePassword} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className={labelClass}>{c.email}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>{c.password}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          {error ? <p role="alert" className="text-sm text-[#b3261e]">{error}</p> : null}
          <button type="submit" disabled={busy || !normalizedEmail || !password} className={buttonClass}>
            {busy ? c.signingIn : c.signIn}
          </button>
          <button
            type="button"
            onClick={() => { setMode('otp_request'); setError(null); setNotice(null); }}
            className="w-full text-sm text-[#5c5e63] hover:text-[#1b1c1a] underline-offset-4 hover:underline"
          >
            {c.otpLink}
          </button>
        </form>
      )}

      {mode === 'otp_request' && (
        <form onSubmit={handleOtpRequest} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email-otp" className={labelClass}>{c.email}</label>
            <input
              id="email-otp"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          {error ? <p role="alert" className="text-sm text-[#b3261e]">{error}</p> : null}
          <button type="submit" disabled={busy || !normalizedEmail} className={buttonClass}>
            {busy ? c.otpSending : c.otpSend}
          </button>
          <button
            type="button"
            onClick={() => { setMode('password'); setError(null); }}
            className="w-full text-sm text-[#5c5e63] hover:text-[#1b1c1a] underline-offset-4 hover:underline"
          >
            {c.backToPassword}
          </button>
        </form>
      )}

      {mode === 'otp_verify' && (
        <form onSubmit={handleOtpVerify} className="space-y-4" noValidate>
          {notice ? <p className="text-sm text-[#036e13]">{notice}</p> : null}
          <div>
            <label htmlFor="otp-code" className={labelClass}>{c.otpCode}</label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputClass}
            />
          </div>
          {error ? <p role="alert" className="text-sm text-[#b3261e]">{error}</p> : null}
          <button type="submit" disabled={busy || code.trim().length < 6} className={buttonClass}>
            {busy ? c.otpVerifying : c.otpVerify}
          </button>
          <button
            type="button"
            onClick={() => { setMode('password'); setError(null); setNotice(null); }}
            className="w-full text-sm text-[#5c5e63] hover:text-[#1b1c1a] underline-offset-4 hover:underline"
          >
            {c.backToPassword}
          </button>
        </form>
      )}

      <div className="mt-8 pt-6 border-t border-[#e5e5e0] space-y-2 text-sm">
        {showProLink ? (
          <Link href="/login/pro" className="block text-[#036e13] font-medium hover:underline underline-offset-4">
            {c.proLink}
          </Link>
        ) : null}
        <p className="text-[#5c5e63]">{c.noAccount}</p>
      </div>
    </div>
  );
}
