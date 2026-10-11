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
}

export default function LoginModal({ isOpen, onClose, initialMode = 'signin' }: LoginModalProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const appOrigin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || 'https://emailbulk.vercel.app';

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
          : process.env.NEXT_PUBLIC_APP_URL || 'https://emailbulk.vercel.app';

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

        {/* PRIMARY: Social OAuth Google & Facebook Buttons */}
        <div className="flex flex-col gap-2 mt-1">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={loading}
            className="w-full h-11 px-4 bg-white hover:bg-[#f5f3f0] text-[#1b1c1a] border border-[#bfcab8]/60 rounded-lg shadow-xs flex items-center justify-center gap-2.5 font-label-md text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <svg aria-hidden="true" className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" fill="#4285F4"></path>
              <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.39 7.35 24 12 24z" fill="#34A853"></path>
              <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z" fill="#FBBC05"></path>
              <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.23 0 12 0 7.35 0 3.27 2.61 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335"></path>
            </svg>
            <span>{t.auth.googleButton}</span>
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('facebook')}
            disabled={loading}
            className="w-full h-11 px-4 bg-white hover:bg-[#f5f3f0] text-[#1b1c1a] border border-[#bfcab8]/60 rounded-lg shadow-xs flex items-center justify-center gap-2.5 font-label-md text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <svg aria-hidden="true" className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
            </svg>
            <span>{t.auth.facebookButton}</span>
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
        </div>
      </div>
    </div>
  );
}
