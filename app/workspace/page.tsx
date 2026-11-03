'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { KONTA_ROLE_LABELS, writeStoredOrganizationId, readStoredOrganizationId, type KontaRole } from '@/lib/konta/workspace';
import { ACCOUNT_PASSWORD_PATH, AUTH_ERROR_QUERY_PARAM, KCRM_ONBOARDING_URL, LOGIN_PATH } from '@/lib/konta/auth-paths';
import { decideMailkRoute, fetchKontaEntitlements } from '@/lib/konta/account-client';

interface MembershipItem {
  organization_id: string;
  role: KontaRole;
  name: string;
}

interface WorkspaceResponse {
  user: { id: string; email: string };
  memberships: MembershipItem[];
  active_organization_id: string | null;
}

const COPY = {
  it: {
    title: 'Scegli l’organizzazione',
    subtitle: 'Lo spazio di lavoro di MAIL-K è l’azienda KONTA.',
    loading: 'Caricamento…',
    none: 'Nessuna organizzazione KONTA attiva per questo account.',
    noneHint: 'Crea la tua azienda in K-CRM oppure chiedi al titolare un invito: l’organizzazione vale anche per MAIL-K.',
    createOrg: 'Crea la tua azienda in K-CRM',
    account: 'Account',
    signOut: 'Esci',
    error: 'Impossibile leggere le organizzazioni.',
    current: 'Attuale',
  },
  en: {
    title: 'Choose your organization',
    subtitle: 'MAIL-K’s workspace is your KONTA company.',
    loading: 'Loading…',
    none: 'No active KONTA organization for this account.',
    noneHint: 'Create your company in K-CRM or ask the owner for an invitation: the organization also works in MAIL-K.',
    createOrg: 'Create your company in K-CRM',
    account: 'Account',
    signOut: 'Sign out',
    error: 'Could not load organizations.',
    current: 'Current',
  },
} as const;

export default function WorkspacePage() {
  const router = useRouter();
  const { locale } = useTranslation();
  const c = COPY[locale === 'en' ? 'en' : 'it'];

  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  const select = useCallback(
    async (organizationId: string) => {
      setSelecting(organizationId);
      setError(null);
      try {
        const res = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organization_id: organizationId }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body?.error || c.error);
          setSelecting(null);
          return;
        }
        writeStoredOrganizationId(organizationId);
        router.replace('/');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : c.error);
        setSelecting(null);
      }
    },
    [router, c.error]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/workspace', { cache: 'no-store' });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        const body = (await res.json()) as WorkspaceResponse & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error || c.error);
          return;
        }
        // Account KONTA unico (CONTRATTO §4): abilitazioni dopo il login. Senza organizzazioni resta lo stato
        // vuoto con il link all'onboarding K-CRM; `revoked` torna al login con messaggio; gli altri stati
        // entrano (la sola consultazione è applicata dal server). Senza risposta della RPC nulla cambia.
        if (body.memberships.length > 0) {
          const decision = decideMailkRoute(await fetchKontaEntitlements());
          if (cancelled) return;
          if (decision?.kind === 'denied') {
            await fetch('/api/workspace', { method: 'DELETE' }).catch(() => undefined);
            writeStoredOrganizationId(null);
            await createClient().auth.signOut().catch(() => undefined);
            window.location.href = `${LOGIN_PATH}?${AUTH_ERROR_QUERY_PARAM}=access_revoked`;
            return;
          }
        }
        setData(body);
        // Una sola organizzazione: entra direttamente.
        if (body.memberships.length === 1) {
          void select(body.memberships[0].organization_id);
          return;
        }
        // Scelta precedente ancora valida: riusala senza chiedere.
        const stored = readStoredOrganizationId();
        if (stored && !body.active_organization_id && body.memberships.some((m) => m.organization_id === stored)) {
          void select(stored);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : c.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, select, c.error]);

  async function signOut() {
    try {
      await fetch('/api/workspace', { method: 'DELETE' });
      writeStoredOrganizationId(null);
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      window.location.href = '/login';
    }
  }

  return (
    <div className="min-h-screen bg-[#fbf9f6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <span className="font-headline-md text-sm font-bold tracking-wider uppercase text-[#1b1c1a]">MAIL-K</span>
          <h1 className="font-headline-md text-2xl text-[#1b1c1a] mt-4">{c.title}</h1>
          <p className="mt-1 text-sm text-[#5c5e63]">{c.subtitle}</p>
        </div>

        {!data && !error ? <p className="text-sm text-[#5c5e63]">{c.loading}</p> : null}
        {error ? <p role="alert" className="text-sm text-[#b3261e] mb-4">{error}</p> : null}

        {data && data.memberships.length === 0 ? (
          <div className="rounded-xl border border-[#e5e5e0] bg-white p-5">
            <p className="text-sm text-[#1b1c1a]">{c.none}</p>
            <p className="text-sm text-[#5c5e63] mt-1">{c.noneHint}</p>
            <a
              href={KCRM_ONBOARDING_URL}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#1b1c1a] px-4 text-sm font-semibold text-[#f2f0ed] hover:bg-[#30312f] transition"
            >
              {c.createOrg}
            </a>
          </div>
        ) : null}

        {data && data.memberships.length > 0 ? (
          <ul className="space-y-2">
            {data.memberships.map((m) => {
              const isCurrent = m.organization_id === data.active_organization_id;
              const busy = selecting === m.organization_id;
              return (
                <li key={m.organization_id}>
                  <button
                    type="button"
                    disabled={selecting !== null}
                    onClick={() => select(m.organization_id)}
                    className="w-full text-left rounded-xl border border-[#e5e5e0] bg-white px-5 py-4 hover:border-[#036e13] hover:shadow-[0_1px_8px_rgba(0,0,0,0.05)] disabled:opacity-60 transition flex items-center justify-between gap-4"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-[#1b1c1a]">{m.name}</span>
                      <span className="block text-xs text-[#5c5e63] mt-0.5">{KONTA_ROLE_LABELS[m.role] || m.role}</span>
                    </span>
                    <span className="text-xs text-[#5c5e63]">
                      {busy ? '…' : isCurrent ? c.current : <span className="material-symbols-outlined text-[18px] align-middle">arrow_forward</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="mt-8 pt-6 border-t border-[#e5e5e0] flex items-center justify-between text-sm">
          <a href={ACCOUNT_PASSWORD_PATH} className="text-[#5c5e63] truncate hover:text-[#1b1c1a] underline-offset-4 hover:underline" title={c.account}>
            {data?.user.email ?? ''}
          </a>
          <button type="button" onClick={signOut} className="text-[#5c5e63] hover:text-[#1b1c1a] underline-offset-4 hover:underline">
            {c.signOut}
          </button>
        </div>
      </div>
    </div>
  );
}
