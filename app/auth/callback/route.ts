import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as any;
  const rawNext = searchParams.get('next') ?? '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  // Determine the canonical base URL taking into account reverse proxies / Vercel
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const redirectBase = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  const targetUrl = new URL(next, redirectBase).toString();

  // Create response instance FIRST so that all cookies exchanged during PKCE/OTP
  // are attached directly as Set-Cookie headers on this exact HTTP response!
  const response = NextResponse.redirect(targetUrl);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${redirectBase}/login?error=missing_env`);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
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

  // Flow 1: PKCE code exchange (OAuth Google, Facebook, LinkedIn, etc.)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    console.error('[Auth Callback] exchangeCodeForSession error:', error.message);
  }

  // Flow 2: Token hash verification (OTP / Magiclink / Signup confirmation)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return response;
    }
    console.error('[Auth Callback] verifyOtp error:', error.message);
  }

  // Fallback: If verification failed or code expired
  return NextResponse.redirect(`${redirectBase}/login?error=auth_callback_failed`);
}
