'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LOGIN_PATH, PASSWORD_MIN_LENGTH, validateNewPassword } from '@/lib/konta/auth-paths';

const COPY = {
  it: {
    title: 'Account KONTA',
    subtitle: 'Un solo account per Mail-K, K-CRM e KONTA PRO. Il cambio password non modifica ruoli né organizzazioni.',
    loading: 'Caricamento…',
    account: 'Account',
    current: 'Password attuale',
    password: 'Nuova password',
    passwordHint: `Almeno ${PASSWORD_MIN_LENGTH} caratteri.`,
    confirmation: 'Conferma nuova password',
    showPassword: 'Mostra password',
    save: 'Cambia password',
    saving: 'Aggiornamento…',
    done: 'Password aggiornata: vale da subito per tutte le app KONTA.',
    currentRequired: 'Inserisci la password attuale.',
    currentWrong: 'La password attuale non è corretta.',
    sameAsCurrent: 'La nuova password deve essere diversa da quella attuale.',
    generic: 'Operazione non riuscita. Riprova.',
    back: 'Torna a MAIL-K',
    workspace: 'Cambia organizzazione',
  },
  en: {
    title: 'KONTA account',
    subtitle: 'One account for Mail-K, K-CRM and KONTA PRO. Changing the password does not affect roles or organizations.',
    loading: 'Loading…',
    account: 'Account',
    current: 'Current password',
    password: 'New password',
    passwordHint: `At least ${PASSWORD_MIN_LENGTH} characters.`,
    confirmation: 'Confirm new password',
    showPassword: 'Show password',
    save: 'Change password',
    saving: 'Updating…',
    done: 'Password updated: it applies right away to every KONTA app.',
    currentRequired: 'Enter your current password.',
    currentWrong: 'The current password is not correct.',
    sameAsCurrent: 'The new password must differ from the current one.',
    generic: 'Something went wrong. Try again.',
    back: 'Back to MAIL-K',
    workspace: 'Switch organization',
  },
} as const;

/**
 * Cambio password dell'utente autenticato. La password attuale viene verificata con un nuovo
 * accesso Supabase (sessione recente anche con "secure password change" attivo), poi `updateUser`.
 * Raggiungibile anche senza organizzazione scelta (esclusa dall'obbligo nel middleware).
 */
export default function AccountPasswordPage() {
  const router = useRouter();
  const { locale } = useTranslation();
  const lang: 'it' | 'en' = locale === 'en' ? 'en' : 'it';
  const c = COPY[lang];

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ current?: string; password?: string; confirmation?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user?.email) {
        router.replace(LOGIN_PATH);
        return;
      }
      setUserEmail(data.user.email);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !userEmail) return;
    setError(null);
    setSuccess(null);
    const errors: typeof fieldErrors = {};
    if (current.length === 0) errors.current = c.currentRequired;
    Object.assign(errors, validateNewPassword(password, confirmation, lang));
    if (!errors.password && password === current) errors.password = c.sameAsCurrent;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: userEmail, password: current });
      if (verifyError) {
        setFieldErrors({ current: c.currentWrong });
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || c.generic);
        return;
      }
      setCurrent('');
      setPassword('');
      setConfirmation('');
      setSuccess(c.done);
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

  const passwordInput = (
    id: string,
    value: string,
    onChange: (v: string) => void,
    autoComplete: string,
    err?: string,
    hint?: string
  ) => (
    <div>
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={busy || !userEmail}
        className={`${inputClass} ${err ? inputErrorClass : ''}`}
        aria-invalid={err ? true : undefined}
      />
      {err ? <p className="mt-1 text-xs text-[#b3261e]">{err}</p> : hint ? <p className="mt-1 text-xs text-[#5c5e63]">{hint}</p> : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fbf9f6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/icon.png" alt="MAIL-K" className="w-8 h-8 rounded-lg border border-[#e5e5e0]" />
            <span className="font-headline-md text-sm font-bold tracking-wider uppercase text-[#1b1c1a]">MAIL-K</span>
          </Link>
          <h1 className="font-headline-md text-2xl text-[#1b1c1a]">{c.title}</h1>
          <p className="mt-1 text-sm text-[#5c5e63]">{c.subtitle}</p>
        </div>

        {!userEmail ? <p className="text-sm text-[#5c5e63]">{c.loading}</p> : null}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {userEmail ? (
            <p className="text-sm text-[#5c5e63]">
              {c.account}: <span className="text-[#1b1c1a]">{userEmail}</span>
            </p>
          ) : null}
          <div>
            <label htmlFor="current-password" className={labelClass}>{c.current}</label>
            {passwordInput('current-password', current, setCurrent, 'current-password', fieldErrors.current)}
          </div>
          <div>
            <label htmlFor="new-password" className={labelClass}>{c.password}</label>
            {passwordInput('new-password', password, setPassword, 'new-password', fieldErrors.password, c.passwordHint)}
          </div>
          <div>
            <label htmlFor="confirm-password" className={labelClass}>{c.confirmation}</label>
            {passwordInput('confirm-password', confirmation, setConfirmation, 'new-password', fieldErrors.confirmation)}
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-[#5c5e63] cursor-pointer">
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} disabled={busy} />
            {c.showPassword}
          </label>
          {error ? <p role="alert" className="text-sm text-[#b3261e]">{error}</p> : null}
          {success ? <p role="status" className="text-sm text-[#036e13]">{success}</p> : null}
          <button type="submit" disabled={busy || !userEmail || !current || !password || !confirmation} className={buttonClass}>
            {busy ? c.saving : c.save}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#e5e5e0] flex items-center justify-between text-sm">
          <Link href="/" className="text-[#036e13] font-medium hover:underline underline-offset-4">{c.back}</Link>
          <Link href="/workspace" className="text-[#5c5e63] hover:text-[#1b1c1a] underline-offset-4 hover:underline">{c.workspace}</Link>
        </div>
      </div>
    </div>
  );
}
