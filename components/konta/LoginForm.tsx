'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import OAuthButtons from '@/components/konta/OAuthButtons';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  AUTH_CALLBACK_ERROR_MESSAGES,
  AUTH_ERROR_QUERY_PARAM,
  AUTH_NOTICE_MESSAGES,
  AUTH_NOTICE_QUERY_PARAM,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RESET_PATH,
  WORKSPACE_PATH,
  buildAuthCallbackUrl,
  isAuthCallbackErrorCode,
  isAuthNoticeCode,
  validateNewPassword,
} from '@/lib/konta/auth-paths';

type Mode = 'password' | 'otp_request' | 'otp_verify' | 'signup' | 'forgot';

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
    otpLink: 'Ricevi un codice via email',
    otpSend: 'Invia codice',
    otpSending: 'Invio…',
    otpSent: 'Email inviata: apri il link oppure inserisci il codice.',
    otpCode: 'Codice (se presente)',
    otpVerify: 'Conferma',
    otpVerifying: 'Verifica…',
    backToPassword: 'Torna alla password',
    backToSignIn: 'Torna all’accesso',
    proLink: 'Accedi con account KONTA PRO',
    missingEnv: 'Configurazione Supabase mancante.',
    callbackFailed: 'Link non valido o scaduto.',
    invalid: 'Email o password non corretti.',
    generic: 'Operazione non riuscita. Riprova.',
    forgot: 'Password dimenticata?',
    forgotTitle: 'Recupera la password',
    forgotHint: 'Inserisci l’indirizzo del tuo account KONTA: riceverai un link per scegliere una nuova password.',
    forgotSend: 'Invia link di recupero',
    forgotSending: 'Invio…',
    forgotSent: 'Se l’indirizzo è registrato riceverai un link per impostare una nuova password. Il link vale per un tempo limitato e va aperto nello stesso browser.',
    haveCode: 'Hai ricevuto un codice? Inseriscilo qui',
    noAccount: 'Non hai un account?',
    signUp: 'Registrati',
    signUpTitle: 'Crea il tuo account KONTA',
    signUpHint: 'Un solo account per tutto l’ecosistema KONTA: le stesse credenziali valgono per Light, PRO, K-CRM e Mail-K.',
    ecoTitle: 'Hai già un account KONTA PRO o K-CRM?',
    ecoBody: 'Entra con le stesse credenziali: se la tua azienda è abilitata a Mail-K la trovi subito.',
    newPassword: 'Password',
    newPasswordHint: `Almeno ${PASSWORD_MIN_LENGTH} caratteri.`,
    confirmPassword: 'Conferma password',
    showPassword: 'Mostra password',
    createAccount: 'Crea account',
    creating: 'Registrazione…',
    confirmEmail: 'Ti abbiamo inviato un link di conferma: aprilo per attivare l’account, poi accedi.',
    alreadyRegistered: 'Questo indirizzo ha già un account KONTA. Accedi con la tua password oppure usa «Password dimenticata».',
    fixFields: 'Correggi i campi evidenziati.',
    emailInvalid: 'Inserisci un indirizzo email valido.',
  },
  en: {
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    otpLink: 'Get a code by email',
    otpSend: 'Send code',
    otpSending: 'Sending…',
    otpSent: 'Email sent: open the link or enter the code.',
    otpCode: 'Code (if any)',
    otpVerify: 'Confirm',
    otpVerifying: 'Verifying…',
    backToPassword: 'Back to password',
    backToSignIn: 'Back to sign in',
    proLink: 'Sign in with your KONTA PRO account',
    missingEnv: 'Supabase configuration missing.',
    callbackFailed: 'Invalid or expired link.',
    invalid: 'Wrong email or password.',
    generic: 'Something went wrong. Try again.',
    forgot: 'Forgot your password?',
    forgotTitle: 'Recover your password',
    forgotHint: 'Enter the email of your KONTA account: you will receive a link to choose a new password.',
    forgotSend: 'Send recovery link',
    forgotSending: 'Sending…',
    forgotSent: 'If the address is registered you will receive a link to set a new password. The link expires and must be opened in the same browser.',
    haveCode: 'Got a code? Enter it here',
    noAccount: 'No account yet?',
    signUp: 'Sign up',
    signUpTitle: 'Create your KONTA account',
    signUpHint: 'One account for the whole KONTA ecosystem: the same credentials work in Light, PRO, K-CRM and Mail-K.',
    ecoTitle: 'Already have a KONTA PRO or K-CRM account?',
    ecoBody: 'Sign in with the same credentials: if your company is enabled for Mail-K you will find it right away.',
    newPassword: 'Password',
    newPasswordHint: `At least ${PASSWORD_MIN_LENGTH} characters.`,
    confirmPassword: 'Confirm password',
    showPassword: 'Show password',
    createAccount: 'Create account',
    creating: 'Signing up…',
    confirmEmail: 'We sent you a confirmation link: open it to activate the account, then sign in.',
    alreadyRegistered: 'This address already has a KONTA account. Sign in with your password or use “Forgot your password?”.',
    fixFields: 'Fix the highlighted fields.',
    emailInvalid: 'Enter a valid email address.',
  },
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Accesso, registrazione e recupero password sull'account KONTA unico (stesso progetto
 * Supabase di K-CRM e KONTA PRO). La registrazione non crea organizzazioni né membership:
 * un nuovo utente senza azienda viene indirizzato da /workspace a K-CRM.
 */
export default function LoginForm({ title, subtitle, showProLink = true }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useTranslation();
  const lang: 'it' | 'en' = locale === 'en' ? 'en' : 'it';
  const c = COPY[lang];

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmation?: string }>({});
  const [error, setError] = useState<string | null>(() => {
    const e = searchParams.get('error');
    if (e === 'missing_env') return c.missingEnv;
    if (e === 'auth_callback_failed') return c.callbackFailed;
    const authError = searchParams.get(AUTH_ERROR_QUERY_PARAM);
    if (isAuthCallbackErrorCode(authError)) return AUTH_CALLBACK_ERROR_MESSAGES[lang][authError];
    return null;
  });
  const [notice, setNotice] = useState<string | null>(() => {
    const n = searchParams.get(AUTH_NOTICE_QUERY_PARAM);
    return isAuthNoticeCode(n) ? AUTH_NOTICE_MESSAGES[lang][n] : null;
  });

  const normalizedEmail = email.trim().toLowerCase();

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setFieldErrors({});
    setPassword('');
    setConfirmation('');
    setCode('');
  }

  function goToWorkspace() {
    router.replace(WORKSPACE_PATH);
    router.refresh();
  }

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
      goToWorkspace();
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
        options: { shouldCreateUser: false, emailRedirectTo: buildAuthCallbackUrl(window.location.origin, WORKSPACE_PATH) },
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
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: normalizedEmail, token: code.trim(), type: 'email' });
      if (verifyError) {
        setError(verifyError.message || c.generic);
        return;
      }
      goToWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : c.generic);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const errors: typeof fieldErrors = {};
    if (!EMAIL_PATTERN.test(normalizedEmail)) errors.email = c.emailInvalid;
    Object.assign(errors, validateNewPassword(password, confirmation, lang));
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(c.fixFields);
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { emailRedirectTo: buildAuthCallbackUrl(window.location.origin, WORKSPACE_PATH) },
      });
      if (signUpError) {
        setError(/already|registered|exists/i.test(signUpError.message) ? c.alreadyRegistered : signUpError.message || c.generic);
        return;
      }
      // Supabase (con conferma email attiva) risponde con un utente fittizio senza identità
      // quando l'indirizzo esiste già: non rivela nulla, ma per l'utente il messaggio è lo stesso.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setNotice(c.alreadyRegistered);
        return;
      }
      if (data.session) {
        goToWorkspace();
        return;
      }
      setNotice(c.confirmEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.generic);
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setFieldErrors({ email: c.emailInvalid });
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: buildAuthCallbackUrl(window.location.origin, PASSWORD_RESET_PATH),
      });
      if (resetError) {
        setError(resetError.message || c.generic);
        return;
      }
      setNotice(c.forgotSent);
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
  const hintClass = 'mt-1 text-xs text-[#5c5e63]';
  const fieldErrorClass = 'mt-1 text-xs text-[#b3261e]';
  const buttonClass =
    'w-full h-11 rounded-lg bg-[#1b1c1a] text-[#f2f0ed] text-sm font-semibold hover:bg-[#30312f] disabled:opacity-50 disabled:cursor-not-allowed transition';
  const linkButtonClass = 'w-full text-sm text-[#5c5e63] hover:text-[#1b1c1a] underline-offset-4 hover:underline';

  const heading = mode === 'signup' ? c.signUpTitle : mode === 'forgot' ? c.forgotTitle : title;
  const sub = mode === 'signup' ? c.signUpHint : mode === 'forgot' ? c.forgotHint : subtitle;

  const emailField = (id: string) => (
    <div>
      <label htmlFor={id} className={labelClass}>{c.email}</label>
      <input
        id={id}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`${inputClass} ${fieldErrors.email ? inputErrorClass : ''}`}
        aria-invalid={fieldErrors.email ? true : undefined}
      />
      {fieldErrors.email ? <p className={fieldErrorClass}>{fieldErrors.email}</p> : null}
    </div>
  );

  const showPasswordToggle = (
    <label className="inline-flex items-center gap-2 text-sm text-[#5c5e63] cursor-pointer">
      <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} disabled={busy} />
      {c.showPassword}
    </label>
  );

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <Link href="/landing" className="inline-flex items-center gap-2 mb-6">
          <img src="/icon.png" alt="MAIL-K" className="w-8 h-8 rounded-lg border border-[#e5e5e0]" />
          <span className="font-headline-md text-sm font-bold tracking-wider uppercase text-[#1b1c1a]">MAIL-K</span>
        </Link>
        <h1 className="font-headline-md text-2xl text-[#1b1c1a]">{heading}</h1>
        {sub ? <p className="mt-1 text-sm text-[#5c5e63]">{sub}</p> : null}
      </div>

      {(mode === 'password' || mode === 'signup') && <OAuthButtons lang={lang} disabled={busy} />}

      {mode === 'password' && (
        <form onSubmit={handlePassword} className="space-y-4" noValidate>
          {notice ? <p role="status" className="text-sm text-[#036e13]">{notice}</p> : null}
          {emailField('email')}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className={`${labelClass} mb-0`}>{c.password}</label>
              <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-[#5c5e63] hover:text-[#1b1c1a] underline-offset-4 hover:underline">
                {c.forgot}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          {showPasswordToggle}
          {error ? <p role="alert" className="text-sm text-[#b3261e]">{error}</p> : null}
          <button type="submit" disabled={busy || !normalizedEmail || !password} className={buttonClass}>
            {busy ? c.signingIn : c.signIn}
          </button>
          <button type="button" onClick={() => switchMode('otp_request')} className={linkButtonClass}>
            {c.otpLink}
          </button>
        </form>
      )}

      {mode === 'otp_request' && (
        <form onSubmit={handleOtpRequest} className="space-y-4" noValidate>
          {emailField('email-otp')}
          {error ? <p role="alert" className="text-sm text-[#b3261e]">{error}</p> : null}
          <button type="submit" disabled={busy || !normalizedEmail} className={buttonClass}>
            {busy ? c.otpSending : c.otpSend}
          </button>
          <button type="button" onClick={() => switchMode('password')} className={linkButtonClass}>
            {c.backToPassword}
          </button>
        </form>
      )}

      {mode === 'otp_verify' && (
        <form onSubmit={handleOtpVerify} className="space-y-4" noValidate>
          {notice ? <p role="status" className="text-sm text-[#036e13]">{notice}</p> : null}
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
          <button type="button" onClick={() => switchMode('password')} className={linkButtonClass}>
            {c.backToPassword}
          </button>
        </form>
      )}

      {mode === 'signup' && (
        <form onSubmit={handleSignUp} className="space-y-4" noValidate data-auth-mode="signup">
          {notice ? <p role="status" className="text-sm text-[#036e13]">{notice}</p> : null}
          {emailField('signup-email')}
          <div>
            <label htmlFor="signup-password" className={labelClass}>{c.newPassword}</label>
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} ${fieldErrors.password ? inputErrorClass : ''}`}
              aria-invalid={fieldErrors.password ? true : undefined}
            />
            {fieldErrors.password ? <p className={fieldErrorClass}>{fieldErrors.password}</p> : <p className={hintClass}>{c.newPasswordHint}</p>}
          </div>
          <div>
            <label htmlFor="signup-confirm" className={labelClass}>{c.confirmPassword}</label>
            <input
              id="signup-confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className={`${inputClass} ${fieldErrors.confirmation ? inputErrorClass : ''}`}
              aria-invalid={fieldErrors.confirmation ? true : undefined}
            />
            {fieldErrors.confirmation ? <p className={fieldErrorClass}>{fieldErrors.confirmation}</p> : null}
          </div>
          {showPasswordToggle}
          {error ? <p role="alert" className="text-sm text-[#b3261e]">{error}</p> : null}
          <button type="submit" disabled={busy || !normalizedEmail || !password || !confirmation} className={buttonClass}>
            {busy ? c.creating : c.createAccount}
          </button>
          <button type="button" onClick={() => switchMode('password')} className={linkButtonClass}>
            {c.backToSignIn}
          </button>
        </form>
      )}

      {mode === 'forgot' && (
        <form onSubmit={handleForgot} className="space-y-4" noValidate data-auth-mode="forgot">
          {notice ? (
            <div className="space-y-1">
              <p role="status" className="text-sm text-[#036e13]">{notice}</p>
              <Link
                href={`${PASSWORD_RESET_PATH}?email=${encodeURIComponent(normalizedEmail)}`}
                className="inline-block text-sm text-[#1b1c1a] font-medium underline-offset-4 hover:underline"
              >
                {c.haveCode}
              </Link>
            </div>
          ) : null}
          {emailField('forgot-email')}
          {error ? <p role="alert" className="text-sm text-[#b3261e]">{error}</p> : null}
          <button type="submit" disabled={busy || !normalizedEmail} className={buttonClass}>
            {busy ? c.forgotSending : c.forgotSend}
          </button>
          <button type="button" onClick={() => switchMode('password')} className={linkButtonClass}>
            {c.backToSignIn}
          </button>
        </form>
      )}

      {mode === 'password' ? (
        <div className="mt-6 rounded-lg border border-[#e5e5e0] bg-[#fbf9f6] px-3 py-2.5 text-xs text-[#5c5e63] leading-snug">
          <b className="text-[#1b1c1a]">{c.ecoTitle}</b> {c.ecoBody}
        </div>
      ) : null}

      <div className="mt-8 pt-6 border-t border-[#e5e5e0] space-y-2 text-sm">
        {showProLink && mode === 'password' ? (
          <Link href="/login/pro" className="block text-[#036e13] font-medium hover:underline underline-offset-4">
            {c.proLink}
          </Link>
        ) : null}
        {mode !== 'signup' ? (
          <p className="text-[#5c5e63]">
            {c.noAccount}{' '}
            <button type="button" onClick={() => switchMode('signup')} className="text-[#1b1c1a] font-medium underline-offset-4 hover:underline">
              {c.signUp}
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}
