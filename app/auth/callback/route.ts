import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import {
  AUTH_ERROR_QUERY_PARAM,
  AUTH_NOTICE_QUERY_PARAM,
  LOGIN_PATH,
  PASSWORD_RESET_PATH,
  classifyAuthProviderError,
  safeNextPath,
  type AuthCallbackErrorCode,
} from '@/lib/konta/auth-paths';

/**
 * Callback di autenticazione KONTA: link via email (OTP/magic link, conferma registrazione,
 * recupero password) e scambio PKCE. I cookie di sessione vengono scritti sulla stessa
 * risposta di redirect (nessun doppio login).
 *
 * - `type=recovery` atterra sempre su `/login/reset` (scelta della nuova password).
 * - `type=signup|email` aggiunge `auth_notice=email_confirmed` alla destinazione.
 * - Errori → `/login?auth_error=<codice>` (stessi codici di K-CRM).
 */

const OTP_TYPES: ReadonlySet<string> = new Set<EmailOtpType>(['signup', 'recovery', 'email', 'email_change', 'invite', 'magiclink']);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const rawType = searchParams.get('type');
  const type = rawType && OTP_TYPES.has(rawType) ? (rawType as EmailOtpType) : null;
  const next = safeNextPath(searchParams.get('next'));

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const redirectBase = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  const failure = (reason: AuthCallbackErrorCode) => {
    const url = new URL(LOGIN_PATH, redirectBase);
    url.searchParams.set(AUTH_ERROR_QUERY_PARAM, reason);
    const res = NextResponse.redirect(url, { status: 303 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  };

  // Errore già segnalato da Supabase nel reindirizzo (es. otp_expired).
  const providerError = searchParams.get('error_code') ?? searchParams.get('error');
  if (providerError) {
    return failure(classifyAuthProviderError(searchParams.get('error_description') ?? undefined, providerError));
  }
  if (!code && !(token_hash && type)) {
    return failure('link_invalid');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !publishableKey) {
    return failure('auth_unavailable');
  }

  const target = new URL(next, redirectBase);
  if (type === 'recovery') target.pathname = PASSWORD_RESET_PATH;
  if (type === 'signup' || type === 'email') target.searchParams.set(AUTH_NOTICE_QUERY_PARAM, 'email_confirmed');

  const response = NextResponse.redirect(target, { status: 303 });
  response.headers.set('Cache-Control', 'no-store');

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            path: options?.path || '/',
            sameSite: options?.sameSite || 'lax',
          });
        });
      },
    },
  });

  try {
    const result = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: token_hash as string });
    if (result.error || !result.data.session) {
      console.error('[Auth Callback]', result.error?.message ?? 'nessuna sessione');
      return failure(classifyAuthProviderError(result.error?.message, result.error?.code ?? null));
    }
    return response;
  } catch (err) {
    console.error('[Auth Callback]', err instanceof Error ? err.message : err);
    return failure('exchange_failed');
  }
}
