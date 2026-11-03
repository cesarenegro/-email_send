import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUser, listActiveMemberships, readActiveOrganizationCookie } from '@/lib/konta/session';
import { MAILK_ORG_COOKIE, isUuid } from '@/lib/konta/workspace';
import { isLeadResearchEnabled } from '@/lib/konta/env';

export const dynamic = 'force-dynamic';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Organizzazioni KONTA in cui l'utente è membro attivo, più quella attualmente scelta. */
export async function GET() {
  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Accesso richiesto.', code: 'SESSION_REQUIRED' }, { status: 401 });
  }

  try {
    const memberships = await listActiveMemberships(supabase, user.id);
    const active = await readActiveOrganizationCookie();
    const activeMembership = memberships.find((m) => m.organization_id === active) || null;
    return NextResponse.json({
      user,
      memberships,
      active_organization_id: activeMembership?.organization_id ?? null,
      lead_research_enabled: isLeadResearchEnabled(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Sceglie lo spazio di lavoro: verifica la membership e scrive il cookie httpOnly. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Accesso richiesto.', code: 'SESSION_REQUIRED' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const organizationId = body?.organization_id;
  if (!isUuid(organizationId)) {
    return NextResponse.json({ error: 'organization_id non valido.' }, { status: 400 });
  }

  const memberships = await listActiveMemberships(supabase, user.id);
  const membership = memberships.find((m) => m.organization_id === organizationId);
  if (!membership) {
    return NextResponse.json(
      { error: 'Non sei membro attivo di questa organizzazione.', code: 'PERMISSION_DENIED' },
      { status: 403 }
    );
  }

  const store = await cookies();
  store.set(MAILK_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  });

  return NextResponse.json({ ok: true, membership });
}

/** Azzera la scelta dello spazio di lavoro (non chiude la sessione). */
export async function DELETE() {
  const store = await cookies();
  store.set(MAILK_ORG_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return NextResponse.json({ ok: true });
}
