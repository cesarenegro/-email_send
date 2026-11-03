import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Callback di autenticazione KONTA: verifica del link ricevuto via email
 * (codice OTP / magic link) e scambio PKCE. I cookie di sessione vengono
 * scritti sulla stessa risposta di redirect (nessun doppio login).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const rawNext = searchParams.get('next') ?? '/workspace';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/workspace';

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const redirectBase = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;
  const targetUrl = new URL(next, redirectBase).toString();

  const response = NextResponse.redirect(targetUrl);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    return NextResponse.redirect(`${redirectBase}/login?error=missing_env`);
  }

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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
    console.error('[Auth Callback] exchangeCodeForSession:', error.message);
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return response;
    console.error('[Auth Callback] verifyOtp:', error.message);
  }

  return NextResponse.redirect(`${redirectBase}/login?error=auth_callback_failed`);
}
