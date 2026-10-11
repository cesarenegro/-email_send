'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password' | 'reset_password'>('signin');

  // Input states - initialized completely empty (no mock data)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check URL params for reset password callback or auth error
  useEffect(() => {
    const view = searchParams.get('view');
    const type = searchParams.get('type');
    const err = searchParams.get('error');

    if (view === 'reset-password' || type === 'recovery') {
      setMode('reset_password');
    }
    if (err === 'missing_env') {
      setError('Configurazione Supabase mancante. Configura le variabili d’ambiente.');
    } else if (err === 'auth_callback_failed') {
      setError('Verifica del link non riuscita o token di conferma scaduto. Riprova ad accedere o richiedi una nuova email.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setMode('reset_password');
    }
  }, []);

  // OAuth Google & Facebook handler
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
      setError(err.message || `Errore durante l'accesso con ${provider}`);
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

    if (password !== confirmPassword) {
      setError('Le password inserite non coincidono.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();
      const appOrigin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || 'https://emailbulk.vercel.app';

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${appOrigin}/auth/callback`,
          data: {
            full_name: fullName.trim(),
            onboarding_completed: false,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        router.push('/');
        router.refresh();
      } else {
        setSuccessMsg('Account creato con successo! Controlla la tua inbox per confermare l’email prima di accedere.');
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

      setSuccessMsg('Link sicuro inviato via email per reimpostare la tua password.');
    } catch (err: any) {
      setError(err.message || 'Impossibile inviare l’email di recupero.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setError('Le password non coincidono.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccessMsg('Password aggiornata con successo! Accesso alla console in corso...');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Errore durante l’aggiornamento della password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#fbf9f6] text-[#1b1c1a] antialiased flex flex-col">
      <main className="w-full flex-1 flex flex-col lg:flex-row min-h-screen">
        {/* LEFT PANEL: Architectural Luxury Editorial Presentation (46% width on desktop) */}
        <section className="relative lg:w-[46%] xl:w-[44%] bg-[#1c1e1c] text-[#f2f0ed] flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden">
          {/* Architectural Monolith Background Image with Depth Gradient */}
          <div className="absolute inset-0 z-0">
            <div
              className="w-full h-full bg-cover bg-center opacity-30 mix-blend-luminosity scale-105 transform transition duration-1000 ease-out"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAN0vyyAhA6vrioIuD6QUZakgzPMzPByNPxJvYICjkHMq8N4kAc7oXOhTvYBryxXRHavpL9gAPkqc5zn9UsMDhPaStuanzdsY4HZmAZyDPpSTiQ1NjXDuiOlKsuRKVquQ3l42s3gT2R9fLq-QJoRrwlkUUM63Gb6NWgCXYdnzIafhd2pCkxgyHcpaF4E-b1BIlPfsicXRZoBhhHXGYIN_SdYjGooxzRzt0R1DuqVW75DqhTImc4Eq5H')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#151715]/95 via-[#1c1e1c]/80 to-[#121312]/95" />
          </div>

          {/* Geometric Blueprint Lines SVG */}
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern height="48" id="arch-grid-pattern" patternUnits="userSpaceOnUse" width="48">
                  <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#99f98d" strokeWidth="0.75" />
                </pattern>
              </defs>
              <rect fill="url(#arch-grid-pattern)" height="100%" width="100%" />
            </svg>
          </div>

          {/* Left Header: Brand Logo & Title */}
          <div className="relative z-10 space-y-12">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl overflow-hidden backdrop-blur-md border border-white/20 shadow-md">
                <img src="/icon.png" alt="MAIL-K" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-headline-md text-xl tracking-[0.18em] font-bold text-white uppercase">{t.common.appName}</span>
                  <span className="font-label-sm text-[10px] tracking-wider text-[#99f98d] bg-[#5cb855]/20 border border-[#5cb855]/30 uppercase px-2 py-0.5 rounded-full font-semibold">
                    DISPATCH
                  </span>
                </div>
                <p className="font-label-sm text-xs text-[#c5c7c0] uppercase tracking-[0.2em] mt-0.5">{t.common.appTagline}</p>
              </div>
            </div>

            {/* Editorial Vision Statement */}
            <div className="space-y-6 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-[#5cb855] animate-pulse" />
                <span className="font-label-sm text-xs uppercase tracking-widest text-[#7edc74] font-medium">{t.auth.monolithVisionBadge}</span>
              </div>
              <h1 className="font-headline-xl text-3xl sm:text-4xl xl:text-[42px] text-white leading-[1.25] tracking-tight">
                {t.auth.monolithVisionTitle}
              </h1>
              <p className="font-body-lg text-base text-[#c5c7c0]/90 leading-relaxed max-w-lg">
                {t.auth.monolithVisionSubtitle}
              </p>
            </div>
          </div>

          {/* Left Bottom: Technical Trust & Telemetry Panel */}
          <div className="relative z-10 pt-10 mt-8 space-y-4 max-w-xl">
            {/* DKIM / SPF Live Status Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-lg transition duration-200 hover:bg-white/[0.08]">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2.5">
                  <span className="material-symbols-outlined text-[#7edc74] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified_user
                  </span>
                  <span className="font-label-md text-xs uppercase tracking-wider text-white font-semibold">{t.auth.dkimCardTitle}</span>
                </div>
                <span className="font-label-sm text-[11px] px-2.5 py-1 rounded-full bg-[#5cb855]/25 text-[#99f98d] font-semibold tracking-wide border border-[#5cb855]/30">
                  {t.auth.dkimCardStatus}
                </span>
              </div>
              <div className="pt-3 flex items-center justify-between text-xs sm:text-sm">
                <span className="text-[#c5c7c0] font-medium">{t.auth.dkimSignature}</span>
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855]"></span>
                  {t.auth.dkimAligned}
                </span>
              </div>
              <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden mt-2.5">
                <div className="bg-[#5cb855] h-full rounded-full w-full shadow-[0_0_8px_rgba(92,184,85,0.6)]" />
              </div>
            </div>

            {/* Telemetry Stats Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-label-sm text-[11px] uppercase tracking-wider text-[#c5c7c0]">{t.auth.throttleRateTitle}</span>
                  <span className="w-2 h-2 rounded-full bg-[#5cb855]" />
                </div>
                <p className="font-title-sm text-sm sm:text-base text-white font-semibold mt-1">{t.auth.throttleRateValue}</p>
                <p className="font-label-sm text-[11px] text-[#c5c7c0] mt-0.5">{t.auth.throttleRateSubtitle}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-label-sm text-[11px] uppercase tracking-wider text-[#c5c7c0]">{t.auth.deliverabilityTitle}</span>
                  <span className="font-label-sm text-[10px] text-[#99f98d] uppercase tracking-wider font-semibold">{t.auth.deliverabilityStatus}</span>
                </div>
                <p className="font-metric-num text-2xl text-[#7edc74] font-bold leading-none mt-1">98.4%</p>
                <p className="font-label-sm text-[11px] text-[#c5c7c0] mt-1.5">{t.auth.deliverabilityRating}</p>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: Authentication Console (54% width on desktop) */}
        <section className="lg:w-[54%] xl:w-[56%] bg-[#fbf9f6] flex flex-col justify-center items-center p-8 sm:p-12 lg:p-16 xl:p-24 overflow-y-auto">
          <div className="w-full max-w-[540px] space-y-7 my-auto">
            {/* Top Security Status Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-[#eae8e5]">
              <span className="font-label-sm text-xs tracking-wider uppercase text-[#5c5e63] font-semibold">
                {t.auth.gatewayStatus}
              </span>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-[#036e13] font-medium bg-[#efeeeb] px-3 py-1 rounded-full border border-[#bfcab8]/30">
                  <span className="material-symbols-outlined text-sm font-semibold">lock</span>
                  {t.auth.tlsBadge}
                </span>
                <LanguageSwitcher variant="transparent" />
              </div>
            </div>

            {/* Heading & Context Subtext */}
            <div className="space-y-1.5">
              <h2 className="font-headline-lg text-3xl sm:text-[34px] font-semibold text-[#1b1c1a] tracking-tight leading-snug">
                {mode === 'signin' && t.auth.signInTitle}
                {mode === 'signup' && t.auth.signUpTitle}
                {mode === 'forgot_password' && t.auth.forgotPasswordTitle}
                {mode === 'reset_password' && t.auth.resetPasswordTitle}
              </h2>
              <p className="font-body-lg text-sm sm:text-base text-[#5c5e63] leading-relaxed">
                {t.auth.subtext}
              </p>
            </div>

            {/* Messages */}
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

            {/* PRIMARY: Social Login / Signup Buttons (Google & Facebook) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Google Button */}
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                disabled={loading}
                className="flex items-center justify-center space-x-3 px-4 py-3 rounded-xl bg-white border border-[#bfcab8]/50 shadow-xs hover:border-[#1b1c1a] hover:shadow-sm transition-all duration-150 text-[#1b1c1a] font-title-sm text-sm group cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"></path>
                </svg>
                <span className="font-semibold whitespace-nowrap text-xs sm:text-sm">{t.auth.googleButton}</span>
              </button>

              {/* Facebook Button */}
              <button
                type="button"
                onClick={() => handleOAuth('facebook')}
                disabled={loading}
                className="flex items-center justify-center space-x-3 px-4 py-3 rounded-xl bg-white border border-[#bfcab8]/50 shadow-xs hover:border-[#1877F2] hover:shadow-sm transition-all duration-150 text-[#1b1c1a] font-title-sm text-sm group cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 text-[#1877F2] fill-current shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
                </svg>
                <span className="font-semibold whitespace-nowrap text-xs sm:text-sm">{t.auth.facebookButton}</span>
              </button>
            </div>

            {/* Elegant Divider */}
            <div className="relative flex items-center justify-center py-1">
              <div className="w-full h-px bg-[#e4e2df]"></div>
              <span className="absolute px-4 bg-[#fbf9f6] font-label-sm text-[11px] tracking-widest uppercase text-[#5c5e63] font-semibold">
                {t.auth.orDivider}
              </span>
            </div>

            {/* MODE 1: SIGN IN */}
            {mode === 'signin' && (
              <form className="space-y-4" onSubmit={handleSignIn}>
                <div className="space-y-1.5">
                  <label className="font-label-md text-xs uppercase tracking-wider text-[#1b1c1a] font-semibold" htmlFor="login-email">
                    {t.auth.emailLabel}
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[#5c5e63] text-xl pointer-events-none">mail</span>
                    <input
                      id="login-email"
                      type="email"
                      required
                      placeholder={t.auth.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 bg-white border border-[#bfcab8]/60 rounded-xl font-body-lg text-sm text-[#1b1c1a] focus:outline-none focus:border-[#036e13] focus:ring-2 focus:ring-[#036e13]/20 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-xs uppercase tracking-wider text-[#1b1c1a] font-semibold" htmlFor="login-pwd">
                      {t.auth.passwordLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setSuccessMsg(null);
                        setMode('forgot_password');
                      }}
                      className="text-xs text-[#036e13] hover:underline font-medium"
                    >
                      {t.auth.forgotPasswordLink}
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[#5c5e63] text-xl pointer-events-none">lock</span>
                    <input
                      id="login-pwd"
                      type="password"
                      required
                      placeholder={t.auth.passwordPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 bg-white border border-[#bfcab8]/60 rounded-xl font-body-lg text-sm text-[#1b1c1a] focus:outline-none focus:border-[#036e13] focus:ring-2 focus:ring-[#036e13]/20 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-[#5cb855] hover:bg-[#036e13] active:scale-[0.99] text-white font-title-sm text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>{t.auth.signInButton}</span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2 flex items-center justify-center gap-2 text-xs text-[#5c5e63]">
                    <span>{t.auth.noAccountPrompt}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setSuccessMsg(null);
                        setMode('signup');
                      }}
                      className="font-semibold text-[#036e13] hover:underline"
                    >
                      {t.auth.createAccountLink}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* MODE 2: SIGN UP */}
            {mode === 'signup' && (
              <form className="space-y-3.5" onSubmit={handleSignUp}>
                <div>
                  <label className="block text-xs font-semibold text-[#1b1c1a] uppercase tracking-wider mb-1">
                    {t.auth.fullNameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.auth.fullNamePlaceholder}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-[#bfcab8]/60 rounded-xl text-sm text-[#1b1c1a] focus:outline-none focus:ring-2 focus:ring-[#036e13]/20 focus:border-[#036e13]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1b1c1a] uppercase tracking-wider mb-1">
                    {t.auth.emailLabel}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={t.auth.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-[#bfcab8]/60 rounded-xl text-sm text-[#1b1c1a] focus:outline-none focus:ring-2 focus:ring-[#036e13]/20 focus:border-[#036e13]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1b1c1a] uppercase tracking-wider mb-1">
                    {t.auth.passwordLabel}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder={t.auth.confirmPasswordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-[#bfcab8]/60 rounded-xl text-sm text-[#1b1c1a] focus:outline-none focus:ring-2 focus:ring-[#036e13]/20 focus:border-[#036e13]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1b1c1a] uppercase tracking-wider mb-1">
                    {t.auth.confirmPasswordLabel}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder={t.auth.confirmPasswordPlaceholder}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-[#bfcab8]/60 rounded-xl text-sm text-[#1b1c1a] focus:outline-none focus:ring-2 focus:ring-[#036e13]/20 focus:border-[#036e13]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-[#5cb855] hover:bg-[#036e13] text-white font-title-sm text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{t.auth.signUpButton}</span>}
                  </button>
                </div>

                <div className="text-center pt-2 border-t border-[#eae8e5]">
                  <span className="text-xs text-[#5c5e63]">{t.auth.hasAccountPrompt} </span>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setSuccessMsg(null);
                      setMode('signin');
                    }}
                    className="text-xs font-semibold text-[#036e13] hover:underline"
                  >
                    {t.auth.signInLink}
                  </button>
                </div>
              </form>
            )}

            {/* MODE 3: FORGOT PASSWORD */}
            {mode === 'forgot_password' && (
              <form className="space-y-4" onSubmit={handleForgotPassword}>
                <div>
                  <label className="block text-xs font-semibold text-[#1b1c1a] uppercase tracking-wider mb-1">
                    {t.auth.emailLabel}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={t.auth.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-[#bfcab8]/60 rounded-xl text-sm text-[#1b1c1a] focus:outline-none focus:ring-2 focus:ring-[#036e13]/20 focus:border-[#036e13]"
                  />
                  <p className="text-xs text-[#5c5e63] mt-1.5 leading-relaxed">
                    {t.auth.resetEmailSent}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-[#1b1c1a] hover:bg-[#30312f] text-white font-title-sm text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{t.auth.sendResetLinkButton}</span>}
                  </button>
                </div>

                <div className="text-center pt-2 border-t border-[#eae8e5]">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setSuccessMsg(null);
                      setMode('signin');
                    }}
                    className="text-xs font-semibold text-[#036e13] hover:underline"
                  >
                    {t.auth.backToSignIn}
                  </button>
                </div>
              </form>
            )}

            {/* MODE 4: RESET PASSWORD */}
            {mode === 'reset_password' && (
              <form className="space-y-4" onSubmit={handleResetPassword}>
                <div className="p-3 bg-[#ecf8eb] border border-[#5cb855]/30 text-[#036e13] text-xs rounded-xl flex items-center space-x-2">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  <span>{t.auth.resetVerified}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1b1c1a] uppercase tracking-wider mb-1">
                    {t.auth.passwordLabel}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder={t.auth.confirmPasswordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-[#bfcab8]/60 rounded-xl text-sm text-[#1b1c1a] focus:outline-none focus:ring-2 focus:ring-[#036e13]/20 focus:border-[#036e13]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1b1c1a] uppercase tracking-wider mb-1">
                    {t.auth.confirmPasswordLabel}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder={t.auth.confirmPasswordPlaceholder}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-[#bfcab8]/60 rounded-xl text-sm text-[#1b1c1a] focus:outline-none focus:ring-2 focus:ring-[#036e13]/20 focus:border-[#036e13]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-[#5cb855] hover:bg-[#036e13] text-white font-title-sm text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{t.auth.updatePasswordButton}</span>}
                  </button>
                </div>
              </form>
            )}

            {/* Compliance & Security Trust Banner */}
            <div className="pt-2 space-y-2">
              <div className="flex items-start space-x-3 text-[#5c5e63] bg-[#f5f3f0] border border-[#bfcab8]/30 p-4 rounded-xl">
                <span className="material-symbols-outlined text-xl text-[#036e13] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                  shield
                </span>
                <p className="font-label-sm text-xs text-[#5c5e63] leading-relaxed">
                  {t.auth.securityFooter}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 text-[#6f7a6b] font-label-sm text-[11px] pt-1">
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
        </section>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbf9f6] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#036e13]" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
