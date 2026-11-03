'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LOGIN_PATH, PASSWORD_MIN_LENGTH, WORKSPACE_PATH, validateNewPassword } from '@/lib/konta/auth-paths';

const COPY = {
  it: {
    title: 'Imposta una nuova password',
    subtitle: 'Vale per Mail-K, K-CRM e KONTA PRO.',
    checking: 'Verifica del link in corso…',
    noSession: 'Nessuna sessione di recupero attiva.',
    noSessionHint: 'Il link va aperto nello stesso browser da cui è stato richiesto e vale per un tempo limitato. Torna all’accesso e usa «Password dimenticata?» per riceverne uno nuovo.',
    backToSignIn: 'Torna all’accesso',
    account: 'Account',
    password: 'Nuova password',
    passwordHint: `Almeno ${PASSWORD_MIN_LENGTH} caratteri.`,
    confirmation: 'Conferma nuova password',
    showPassword: 'Mostra password',
    save: 'Salva la nuova password',
    saving: 'Aggiornamento…',
    done: 'Password aggiornata. Ti stiamo portando nel tuo spazio di lavoro.',
    generic: 'Operazione non riuscita. Riprova.',
  },
  en: {
    title: 'Set a new password',
    subtitle: 'Valid for Mail-K, K-CRM and KONTA PRO.',
    checking: 'Checking the link…',
    noSession: 'No active recovery session.',
    noSessionHint: 'The link must be opened in the same browser you used for the request and expires after a while. Go back to sign in and use “Forgot your password?” to get a new one.',
    backToSignIn: 'Back to sign in',
    account: 'Account',
    password: 'New password',
    passwordHint: `At least ${PASSWORD_MIN_LENGTH} characters.`,
    confirmation: 'Confirm new password',
    showPassword: 'Show password',
    save: 'Save the new password',
    saving: 'Updating…',
    done: 'Password updated. Taking you to your workspace.',
    generic: 'Something went wrong. Try again.',
  },
} as const;

/**
 * Atterraggio del link "password dimenticata": `/auth/callback` ha già scambiato il token di
 * recupero con una sessione; qui l'utente sceglie la nuova password (`updateUser`).
 */
function ResetContent() {
  const router = useRouter();
  const { locale } = useTranslation();
  const lang: 'it' | 'en' = locale === 'en' ? 'en' : 'it';
  const c = COPY[lang];

  const [status, setStatus] = useState<'loading' | 'ready' | 'none'>('loading');
  const [userEmail, setUserEmail] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmation?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        if (data.user?.email) {
          setUserEmail(data.user.email);
          setStatus('ready');
        } else {
          setStatus('none');
        }
      } catch {
        if (!cancelled) setStatus('none');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const errors = validateNewPassword(password, confirmation, lang);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || c.generic);
        return;
      }
      setDone(true);
      router.replace(WORKSPACE_PATH);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : c.generic);
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full h-11 px-3 rounded-lg border border-[#e5e5e0] bg-white text-[#1b1c1a] text-sm outline-none focus:border-[#036e13] focus:ring-2 focus:ring-[#036e13]/15 transition';
  const inputErrorClass = 'border-[#b3261e] focus:border-[#b3261e] focus:ring-[#b3261e]/15';
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-[#5c5e63] mb-1.5';
  const buttonClass =
    'w-full h-11 rounded-lg bg-[#1b1c1a] text-[#f2f0ed] text-sm font-semibold hover:bg-[#30312f] disabled:opacity-50 disabled:cursor-not-allowed transition';

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <span className="font-headline-md text-sm font-bold tracking-wider uppercase text-[#1b1c1a]">MAIL-K</span>
        <h1 className="font-headline-md text-2xl text-[#1b1c1a] mt-4">{c.title}</h1>
        <p className="mt-1 text-sm text-[#5c5e63]">{c.subtitle}</p>
      </div>

      {status === 'loading' ? <p className="text-sm text-[#5c5e63]">{c.checking}</p> : null}

      {status === 'none' ? (
        <div className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-3">
          <p className="text-sm text-[#1b1c1a]">{c.noSession}</p>
          <p className="text-sm text-[#5c5e63]">{c.noSessionHint}</p>
          <Link href={LOGIN_PATH} className="inline-block text-sm text-[#036e13] font-medium hover:underline underline-offset-4">
            {c.backToSignIn}
          </Link>
        </div>
      ) : null}

      {status === 'ready' ? (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <p className="text-sm text-[#5c5e63]">
            {c.account}: <span className="text-[#1b1c1a]">{userEmail}</span>
          </p>
          <div>
            <label htmlFor="new-password" className={labelClass}>{c.password}</label>
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy || done}
              className={`${inputClass} ${fieldErrors.password ? inputErrorClass : ''}`}
            />
            <p className={`mt-1 text-xs ${fieldErrors.password ? 'text-[#b3261e]' : 'text-[#5c5e63]'}`}>{fieldErrors.password || c.passwordHint}</p>
          </div>
          <div>
            <label htmlFor="confirm-password" className={labelClass}>{c.confirmation}</label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={busy || done}
              className={`${inputClass} ${fieldErrors.confirmation ? inputErrorClass : ''}`}
            />
            {fieldErrors.confirmation ? <p className="mt-1 text-xs text-[#b3261e]">{fieldErrors.confirmation}</p> : null}
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-[#5c5e63] cursor-pointer">
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} disabled={busy || done} />
            {c.showPassword}
          </label>
          {error ? <p role="alert" className="text-sm text-[#b3261e]">{error}</p> : null}
          {done ? <p role="status" className="text-sm text-[#036e13]">{c.done}</p> : null}
          <button type="submit" disabled={busy || done || !password || !confirmation} className={buttonClass}>
            {busy ? c.saving : c.save}
          </button>
          <Link href={LOGIN_PATH} className="block text-center text-sm text-[#5c5e63] hover:text-[#1b1c1a] underline-offset-4 hover:underline">
            {c.backToSignIn}
          </Link>
        </form>
      ) : null}
    </div>
  );
}

export default function PasswordResetPage() {
  return (
    <div className="min-h-screen bg-[#fbf9f6] flex items-center justify-center px-6 py-12">
      <Suspense fallback={null}>
        <ResetContent />
      </Suspense>
    </div>
  );
}
