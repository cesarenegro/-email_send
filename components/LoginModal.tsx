'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'forgot_password';
  initialEmail?: string;
}

export default function LoginModal({ isOpen, onClose, initialMode = 'signin', initialEmail = '' }: LoginModalProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOAuth = async (provider: 'google' | 'facebook' | 'linkedin_oidc') => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const appOrigin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || 'https://mailk.arkai.dev';

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${appOrigin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || `Errore durante l'autenticazione con ${provider}`);
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) throw signInError;

      if (data.session) {
        onClose();
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Credenziali non valide o accesso non autorizzato.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const appOrigin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || 'https://mailk.arkai.dev';

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${appOrigin}/auth/callback`,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        onClose();
        router.push('/');
        router.refresh();
      } else {
        setSuccessMsg('Account creato! Controlla la tua inbox per confermare l’email.');
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const supabase = createClient();
      const appOrigin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || 'https://emailbulk.vercel.app';

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${appOrigin}/login?view=reset-password`,
      });

      if (resetError) throw resetError;

      setSuccessMsg('Email di recupero inviata.');
    } catch (err: any) {
      setError(err.message || 'Impossibile inviare l’email di recupero.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1c1e1c]/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="relative w-full max-w-[480px] bg-white rounded-xl shadow-2xl border border-[#e5e5e0] overflow-hidden p-6 sm:p-8 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Controls: Language Switcher and Close Button */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <LanguageSwitcher variant="transparent" />
          <button
            aria-label="Chiudi modale"
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5c5e63] hover:text-[#1b1c1a] hover:bg-[#eae8e5] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-1 pt-1">
          {/* Monogram Badge */}
          <div className="relative flex items-center justify-center w-14 h-14 rounded-xl overflow-hidden shadow-sm mb-1 border border-[#eae8e5]">
            <img src="/icon.png" alt="MAIL-K" className="w-full h-full object-cover" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#5cb855] ring-2 ring-white shadow-sm flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            </span>
          </div>

          <h2 className="font-headline-md text-2xl font-bold text-[#1b1c1a]">
            {mode === 'signin' && `${t.auth.signInTitle}`}
            {mode === 'signup' && `${t.auth.signUpTitle}`}
            {mode === 'forgot_password' && `${t.auth.forgotPasswordTitle}`}
          </h2>
          <p className="font-body-md text-xs text-[#5c5e63] max-w-sm">
            {t.auth.subtext}
          </p>
        </div>

        {/* Error / Success Feedback */}
        {error && (
          <div className="p-3 bg-[#ffdad6] border border-[#ffb4ab] text-[#ba1a1a] text-xs rounded-lg flex items-center space-x-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-[#ecf8eb] border border-[#5cb855]/30 text-[#036e13] text-xs rounded-lg flex items-center space-x-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* PRIMARY: Social OAuth Google, Facebook & LinkedIn Circular Buttons */}
        <div className="flex items-center justify-center gap-5 sm:gap-6 my-2">
          {/* Google Button */}
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={loading}
            title={t.auth.googleButton}
            aria-label={t.auth.googleButton}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white hover:bg-[#f8f9fa] border border-[#d8d2c8] hover:border-[#4285F4] shadow-xs hover:shadow-md flex items-center justify-center transition-all duration-200 ease-out hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 group"
          >
            <svg aria-hidden="true" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
          </button>

          {/* Facebook Button */}
          <button
            type="button"
            onClick={() => handleOAuth('facebook')}
            disabled={loading}
            title={t.auth.facebookButton}
            aria-label={t.auth.facebookButton}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#1877F2] hover:bg-[#166fe5] border border-[#1877F2] shadow-xs hover:shadow-md flex items-center justify-center transition-all duration-200 ease-out hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 group"
          >
            <svg aria-hidden="true" className="w-7 h-7 sm:w-8 sm:h-8 fill-white shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>

          {/* LinkedIn Button */}
          <button
            type="button"
            onClick={() => handleOAuth('linkedin_oidc')}
            disabled={loading}
            title={t.auth.linkedinButton}
            aria-label={t.auth.linkedinButton}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#0A66C2] hover:bg-[#08549e] border border-[#0A66C2] shadow-xs hover:shadow-md flex items-center justify-center transition-all duration-200 ease-out hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 group"
          >
            <svg aria-hidden="true" className="w-7 h-7 sm:w-8 sm:h-8 fill-white shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.63 1.63 0 1 0 0-3.26 1.63 1.63 0 0 0 0 3.26m1.4 9.74v-8.37H5.06v8.37z" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="w-full h-px bg-[#eae8e5]"></div>
          <span className="absolute bg-white px-2.5 font-label-sm text-[10px] text-[#6f7a6b] uppercase tracking-wider whitespace-nowrap">
            {t.auth.orDivider}
          </span>
        </div>

        {/* Forms */}
        {mode === 'signin' && (
          <form className="flex flex-col gap-3" onSubmit={handleSignIn}>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-[11px] text-[#1b1c1a] font-semibold uppercase tracking-wider" htmlFor="modal-email">
                {t.auth.emailLabel}
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#6f7a6b] text-[18px]">mail</span>
                <input
                  id="modal-email"
                  type="email"
                  required
                  placeholder={t.auth.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-[#f5f3f0] focus:bg-white text-[#1b1c1a] font-body-md text-sm rounded-lg border border-transparent focus:border-[#036e13] focus:ring-1 focus:ring-[#036e13] outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="font-label-sm text-[11px] text-[#1b1c1a] font-semibold uppercase tracking-wider" htmlFor="modal-pwd">
                  {t.auth.passwordLabel}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setMode('forgot_password');
                  }}
                  className="font-label-sm text-[11px] text-[#036e13] hover:underline"
                >
                  {t.auth.forgotPasswordLink}
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#6f7a6b] text-[18px]">lock</span>
                <input
                  id="modal-pwd"
                  type="password"
                  required
                  placeholder={t.auth.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-[#f5f3f0] focus:bg-white text-[#1b1c1a] font-body-md text-sm rounded-lg border border-transparent focus:border-[#036e13] focus:ring-1 focus:ring-[#036e13] outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-1 bg-[#5cb855] hover:bg-[#036e13] text-white font-label-md text-xs uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{t.auth.signInButton}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form className="flex flex-col gap-3" onSubmit={handleSignUp}>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-[11px] text-[#1b1c1a] font-semibold uppercase tracking-wider">
                {t.auth.fullNameLabel}
              </label>
              <input
                type="text"
                required
                placeholder={t.auth.fullNamePlaceholder}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-11 px-3 bg-[#f5f3f0] focus:bg-white text-[#1b1c1a] font-body-md text-sm rounded-lg border border-transparent focus:border-[#036e13] focus:ring-1 focus:ring-[#036e13] outline-none transition-all shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-[11px] text-[#1b1c1a] font-semibold uppercase tracking-wider">
                {t.auth.emailLabel}
              </label>
              <input
                type="email"
                required
                placeholder={t.auth.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3 bg-[#f5f3f0] focus:bg-white text-[#1b1c1a] font-body-md text-sm rounded-lg border border-transparent focus:border-[#036e13] focus:ring-1 focus:ring-[#036e13] outline-none transition-all shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-[11px] text-[#1b1c1a] font-semibold uppercase tracking-wider">
                {t.auth.passwordLabel}
              </label>
              <input
                type="password"
                required
                placeholder={t.auth.confirmPasswordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3 bg-[#f5f3f0] focus:bg-white text-[#1b1c1a] font-body-md text-sm rounded-lg border border-transparent focus:border-[#036e13] focus:ring-1 focus:ring-[#036e13] outline-none transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-1 bg-[#5cb855] hover:bg-[#036e13] text-white font-label-md text-xs uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{t.auth.signUpButton}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        )}

        {mode === 'forgot_password' && (
          <form className="flex flex-col gap-3" onSubmit={handleForgotPassword}>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-[11px] text-[#1b1c1a] font-semibold uppercase tracking-wider">
                {t.auth.emailLabel}
              </label>
              <input
                type="email"
                required
                placeholder={t.auth.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3 bg-[#f5f3f0] focus:bg-white text-[#1b1c1a] font-body-md text-sm rounded-lg border border-transparent focus:border-[#036e13] focus:ring-1 focus:ring-[#036e13] outline-none transition-all shadow-inner"
              />
              <p className="text-[11px] text-[#5c5e63] mt-1">
                {t.auth.resetEmailSent}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-1 bg-[#1b1c1a] hover:bg-[#30312f] text-white font-label-md text-xs uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{t.auth.sendResetLinkButton}</span>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                setMode('signin');
              }}
              className="text-xs text-[#5c5e63] hover:text-[#1b1c1a] hover:underline text-center mt-1"
            >
              {t.auth.backToSignIn}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="flex flex-col items-center text-center gap-1.5 pt-2 border-t-0 bg-[#f5f3f0] -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-4">
          <p className="font-body-md text-xs text-[#5c5e63]">
            {mode === 'signin' ? (
              <>
                {t.auth.noAccountPrompt}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setMode('signup');
                  }}
                  className="font-semibold text-[#036e13] hover:underline ml-1"
                >
                  {t.auth.createAccountLink}
                </button>
              </>
            ) : (
              <>
                {t.auth.hasAccountPrompt}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setMode('signin');
                  }}
                  className="font-semibold text-[#036e13] hover:underline ml-1"
                >
                  {t.auth.signInLink}
                </button>
              </>
            )}
          </p>
          <div className="flex items-center justify-center gap-1 text-[#6f7a6b] font-label-sm text-[10px]">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            <span>{t.auth.securityFooter}</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-[#6f7a6b] font-label-sm text-[10px] mt-0.5">
            <a
              href="https://arkai.dev/app/PPmailk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1b1c1a] hover:underline"
            >
              Privacy Policy
            </a>
            <span>•</span>
            <a
              href="https://arkai.dev/app/TSmailk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1b1c1a] hover:underline"
            >
              Termini di Servizio
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
