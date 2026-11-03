'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Passo 1 del wizard: la casella SMTP è quella dell'organizzazione KONTA
 * (Impostazioni mittente). Qui si verifica solo che sia configurata e verificata.
 */
export interface SmtpConfigState {
  useExisting: boolean;
  email: string;
  host: string;
  port: number;
  secure: boolean;
  provider: string;
  providerNotes?: string;
  appPasswordUrl?: string;
  isVerified: boolean;
  smtpConnectionId?: string | null;
}

interface Step1SmtpProps {
  currentUserId?: string | null;
  getSessionToken: () => number;
  data: SmtpConfigState;
  onUpdate: (data: Partial<SmtpConfigState>, callingUserId?: string | null) => void;
  existingEmail?: string;
}

interface SettingsSnapshot {
  from_email: string;
  from_name: string;
  smtp_host: string;
  smtp_port: number;
  is_verified: boolean;
  organization_name: string;
  can_manage: boolean;
}

export default function Step1Smtp({ currentUserId, getSessionToken, data, onUpdate }: Step1SmtpProps) {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<SettingsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const token = getSessionToken();
    const sessionUserId = currentUserId;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/settings', { cache: 'no-store', signal: controller.signal });
        const body = await res.json().catch(() => ({}));
        if (controller.signal.aborted || getSessionToken() !== token) return;
        if (!res.ok) {
          setError(body?.error || 'Impostazioni non disponibili.');
          onUpdate({ isVerified: false }, sessionUserId);
          return;
        }
        const snap = body as SettingsSnapshot;
        setSnapshot(snap);
        onUpdate(
          {
            useExisting: true,
            isVerified: Boolean(snap.is_verified),
            email: snap.from_email || '',
            host: snap.smtp_host || '',
            port: Number(snap.smtp_port) || 465,
            secure: Number(snap.smtp_port) === 465,
            smtpConnectionId: null,
          },
          sessionUserId
        );
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Impostazioni non disponibili.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#5c5e63]">
        <Loader2 className="w-4 h-4 animate-spin" /> Controllo della casella mittente…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 text-sm text-[#b3261e]">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const verified = Boolean(snapshot?.is_verified && data.isVerified);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-4">
        <div className="flex items-start gap-3">
          {verified ? (
            <CheckCircle2 className="w-5 h-5 text-[#036e13] mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#b45309] mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1b1c1a]">
              {verified ? 'Casella mittente verificata' : 'Casella mittente da configurare'}
            </p>
            <p className="text-sm text-[#5c5e63] mt-0.5 truncate">
              {snapshot?.organization_name}
              {snapshot?.from_email ? ` · ${snapshot.from_email}` : ''}
              {snapshot?.smtp_host ? ` · ${snapshot.smtp_host}:${snapshot.smtp_port}` : ''}
            </p>
          </div>
        </div>
      </div>
      {!verified ? (
        <p className="text-sm text-[#5c5e63]">
          {snapshot?.can_manage ? (
            <>
              Configura e verifica la casella in{' '}
              <Link href="/settings" className="text-[#036e13] font-medium hover:underline underline-offset-4">
                Impostazioni mittente
              </Link>
              , poi torna qui.
            </>
          ) : (
            'Chiedi al Titolare o a un Amministratore di configurare la casella in Impostazioni mittente.'
          )}
        </p>
      ) : null}
    </div>
  );
}
