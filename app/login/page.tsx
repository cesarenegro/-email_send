'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password' | 'reset_password'>('signin');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check URL params for reset password callback
  useEffect(() => {
    const view = searchParams.get('view');
    const type = searchParams.get('type');
    if (view === 'reset-password' || type === 'recovery') {
      setMode('reset_password');
    }
  }, [searchParams]);

  // Also check URL hash for access_token type=recovery
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setMode('reset_password');
    }
  }, []);

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
      setError(err.message || 'Credenziali non valide');
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
      setError('Le password inserite non coincidono');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            onboarding_completed: false,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        // Immediate login
        router.push('/');
        router.refresh();
      } else if (data.user && !data.session) {
        // Email confirmation required by Supabase settings
        setSuccessMsg(
          'Account creato con successo! Ti abbiamo inviato una email di conferma. Clicca sul link ricevuto per accedere.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione');
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
      const cleanEmail = email.trim().toLowerCase();
      const redirectUrl = `${window.location.origin}/login?view=reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (resetError) throw resetError;

      setSuccessMsg(
        'Ti abbiamo inviato un’email con il link sicuro per reimpostare la tua password. Controlla la tua casella di posta.'
      );
    } catch (err: any) {
      setError(err.message || 'Impossibile inviare l’email di recupero password');
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
      setError('Le password non coincidono');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccessMsg('Password aggiornata con successo! Reindirizzamento in corso...');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Errore durante l’aggiornamento della password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1A1A1E] text-white mb-4 shadow-sm">
          <Mail className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">ARKITECNA MAILER</h2>
        <p className="mt-1 text-xs text-[#666666]">
          {mode === 'signin' && 'Accesso alla piattaforma di invio email'}
          {mode === 'signup' && 'Registrazione nuovo account utente'}
          {mode === 'forgot_password' && 'Recupera la tua password di accesso'}
          {mode === 'reset_password' && 'Imposta una nuova password sicura'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FFFFFF] py-8 px-6 border border-[#D8D2C8] rounded-xl sm:px-10 shadow-sm space-y-6">
          {/* Messages */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE 1: SIGN IN */}
          {mode === 'signin' && (
            <form className="space-y-4" onSubmit={handleSignIn}>
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1E]">Email</label>
                <div className="mt-1 relative">
                  <input
                    type="email"
                    required
                    placeholder="nome@arkitecna.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#1A1A1E]">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setSuccessMsg(null);
                      setMode('forgot_password');
                    }}
                    className="text-xs text-[#666666] hover:text-[#1A1A1E] hover:underline"
                  >
                    Password dimenticata?
                  </button>
                </div>
                <div className="mt-1 relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#1A1A1E] hover:bg-[#333333] transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accedi'}
                </button>
              </div>

              <div className="text-center pt-2 border-t border-[#D8D2C8]/60">
                <span className="text-xs text-[#666666]">Sei un nuovo collaboratore? </span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setMode('signup');
                  }}
                  className="text-xs font-semibold text-[#1A1A1E] hover:underline"
                >
                  Crea account
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: SIGN UP */}
          {mode === 'signup' && (
            <form className="space-y-4" onSubmit={handleSignUp}>
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1E]">Nome e Cognome</label>
                <div className="mt-1 relative">
                  <input
                    type="text"
                    required
                    placeholder="es. Mario Rossi"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1E]">Email Aziendale</label>
                <div className="mt-1 relative">
                  <input
                    type="email"
                    required
                    placeholder="mario.rossi@arkitecna.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1E]">Crea Password</label>
                <div className="mt-1 relative">
                  <input
                    type="password"
                    required
                    placeholder="Almeno 6 caratteri"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1E]">Conferma Password</label>
                <div className="mt-1 relative">
                  <input
                    type="password"
                    required
                    placeholder="Ripeti la password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#1A1A1E] hover:bg-[#333333] transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrati e Inizia'}
                </button>
              </div>

              <div className="text-center pt-2 border-t border-[#D8D2C8]/60">
                <span className="text-xs text-[#666666]">Hai già un account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setMode('signin');
                  }}
                  className="text-xs font-semibold text-[#1A1A1E] hover:underline"
                >
                  Accedi
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: FORGOT PASSWORD */}
          {mode === 'forgot_password' && (
            <form className="space-y-4" onSubmit={handleForgotPassword}>
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1E]">La tua Email</label>
                <div className="mt-1 relative">
                  <input
                    type="email"
                    required
                    placeholder="inserisci la tua email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                  />
                </div>
                <p className="text-[11px] text-[#666666] mt-1.5 leading-relaxed">
                  Ti invieremo un link sicuro via email per impostare una nuova password.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#1A1A1E] hover:bg-[#333333] transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invia Link di Recupero'}
                </button>
              </div>

              <div className="text-center pt-2 border-t border-[#D8D2C8]/60">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setMode('signin');
                  }}
                  className="inline-flex items-center text-xs font-semibold text-[#1A1A1E] hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Torna all&apos;accesso
                </button>
              </div>
            </form>
          )}

          {/* MODE 4: RESET PASSWORD */}
          {mode === 'reset_password' && (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div className="p-3 bg-[#FAF9F6] border border-[#D8D2C8] rounded-lg text-xs text-[#1A1A1E] flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Link di recupero verificato. Inserisci la nuova password.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1E]">Nuova Password</label>
                <div className="mt-1 relative">
                  <input
                    type="password"
                    required
                    placeholder="Minimo 6 caratteri"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1E]">Conferma Nuova Password</label>
                <div className="mt-1 relative">
                  <input
                    type="password"
                    required
                    placeholder="Ripeti la nuova password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#1A1A1E] hover:bg-[#333333] transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aggiorna Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#1A1A1E]" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
