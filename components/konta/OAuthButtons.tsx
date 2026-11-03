'use client';

/**
 * MAIL-K — Pulsanti "Continua con Google / Facebook / LinkedIn" del modale di accesso unico
 * (CONTRATTO_ACCOUNT_UNICO.md §5, mock MOCK_modale_accesso_konta.html, schermata 1).
 *
 * PREPARATO, NON MONTATO: va inserito in `LoginForm` solo dopo l'approvazione del mock da parte
 * del proprietario. Ordine fisso: Google, Facebook, LinkedIn, poi il separatore "oppure con l'email".
 */

import React, { useState } from 'react';
import { signInWithProvider } from '@/lib/konta/account-client';
import { WORKSPACE_PATH } from '@/lib/konta/auth-paths';
import { KONTA_OAUTH_PROVIDERS, type KontaOAuthProvider } from '@/lib/konta/entitlements';

const LABELS_EN: Record<KontaOAuthProvider, string> = {
  google: 'Continue with Google',
  facebook: 'Continue with Facebook',
  linkedin_oidc: 'Continue with LinkedIn',
};

function ProviderIcon({ provider }: { provider: KontaOAuthProvider }) {
  if (provider === 'google') {
    return (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] flex-none" aria-hidden="true">
        <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.2z" />
        <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2.1v2.9C4 20.5 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.8 14c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V6.9H2.1A11 11 0 0 0 1 12c0 1.8.4 3.5 1.1 5l3.7-3z" />
        <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 6.9l3.7 2.9c.9-2.6 3.3-4.4 6.2-4.4z" />
      </svg>
    );
  }
  if (provider === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] flex-none" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#1877F2" />
        <path fill="#fff" d="M13.4 19v-6.2h2.1l.3-2.5h-2.4V8.8c0-.7.2-1.2 1.2-1.2H16V5.4c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.7H8.8v2.5h2.1V19h2.5z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] flex-none" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path fill="#fff" d="M7.6 10h2.3v7.5H7.6V10zm1.1-3.6a1.3 1.3 0 1 1 0 2.7 1.3 1.3 0 0 1 0-2.7zM11.3 10h2.2v1c.3-.6 1.1-1.2 2.3-1.2 2.4 0 2.9 1.6 2.9 3.7v4h-2.3v-3.5c0-.9 0-2-1.2-2s-1.4.9-1.4 1.9v3.6h-2.3V10z" />
    </svg>
  );
}

interface OAuthButtonsProps {
  lang: 'it' | 'en';
  /** Percorso interno dopo il callback (default `/workspace`). */
  next?: string;
  disabled?: boolean;
}

export default function OAuthButtons({ lang, next = WORKSPACE_PATH, disabled = false }: OAuthButtonsProps) {
  const [pending, setPending] = useState<KontaOAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(provider: KontaOAuthProvider) {
    setError(null);
    setPending(provider);
    const message = await signInWithProvider(provider, next);
    // Con successo il browser lascia la pagina; si resta qui solo in caso di errore.
    if (message) {
      setError(lang === 'en' ? 'Could not start sign-in with this provider. Try again or use your email.' : message);
      setPending(null);
    }
  }

  const buttonClass =
    'w-full h-11 rounded-lg border border-[#d6d6cf] bg-white text-[#1b1c1a] text-sm font-semibold flex items-center justify-center gap-2.5 hover:bg-[#f5f3f0] hover:border-[#036e13]/40 disabled:opacity-50 disabled:cursor-not-allowed transition';

  return (
    <div>
      <div className="grid gap-2.5">
        {KONTA_OAUTH_PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={buttonClass}
            disabled={disabled || pending !== null}
            onClick={() => start(p.id)}
            data-oauth-provider={p.id}
          >
            <ProviderIcon provider={p.id} />
            {lang === 'en' ? LABELS_EN[p.id] : p.label}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-[#b3261e]">{error}</p> : null}
      <div className="flex items-center gap-3 my-4 text-xs text-[#5c5e63]">
        <span className="flex-1 h-px bg-[#e5e5e0]" />
        {lang === 'en' ? 'or with your email' : 'oppure con l’email'}
        <span className="flex-1 h-px bg-[#e5e5e0]" />
      </div>
    </div>
  );
}
