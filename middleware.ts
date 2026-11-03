import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { MAILK_ORG_COOKIE, isUuid } from '@/lib/konta/workspace';

const PUBLIC_PATHS = new Set(['/login', '/login/pro', '/landing', '/faq', '/guida']);

/**
 * Guardia di sessione KONTA.
 * - Senza sessione: solo rotte pubbliche; la radice va alla landing.
 * - Con sessione ma senza organizzazione scelta: va a /workspace (la membership è
 *   riverificata lato server a ogni richiesta da requireTenant; qui si controlla solo
 *   la presenza del cookie per instradare l'utente).
 */
export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  if (host === 'emailbulk.vercel.app' || host === 'mail-k.vercel.app') {
    const url = request.nextUrl.clone();
    url.host = 'mailk.arkai.dev';
    url.port = '';
    url.protocol = 'https';
    return NextResponse.redirect(url, 301);
  }

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/auth') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    if (pathname !== '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'missing_env');
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_PATHS.has(pathname) || pathname.startsWith('/downloads');
  const isApi = pathname.startsWith('/api/');

  if (!user) {
    if (isApi) {
      return NextResponse.json({ error: 'Accesso richiesto.', code: 'SESSION_REQUIRED' }, { status: 401 });
    }
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/landing';
      return NextResponse.redirect(url);
    }
    if (!isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (pathname === '/login' || pathname === '/login/pro') {
    const url = request.nextUrl.clone();
    url.pathname = '/workspace';
    return NextResponse.redirect(url);
  }

  const hasOrg = isUuid(request.cookies.get(MAILK_ORG_COOKIE)?.value);
  const needsOrg = !isPublicRoute && pathname !== '/workspace' && !pathname.startsWith('/api/workspace');
  if (!hasOrg && needsOrg) {
    if (isApi) {
      return NextResponse.json(
        { error: 'Scegli un’organizzazione per continuare.', code: 'ORGANIZATION_REQUIRED' },
        { status: 409 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = '/workspace';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/cron|auth).*)'],
};
