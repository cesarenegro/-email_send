'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface Item {
  id: string;
  name: string;
  status: string;
  next_send_at: string | null;
  total: number;
  sent: number;
}

export interface HubData {
  organizationName: string;
  canWrite: boolean;
  sender: { configured: boolean; verified: boolean; fromEmail: string };
  sentToday: number;
  errorsToday: number;
  queued: number;
  bounces30d: number;
  nextDue: string | null;
  campaigns: Item[];
  newsletters: Item[];
}

const COPY = {
  it: {
    sentToday: 'Inviate oggi',
    errorsToday: 'Errori oggi',
    queued: 'In coda',
    bounces: 'Rimbalzi 30 gg',
    nextSend: 'Prossimo invio',
    none: '—',
    senderOk: 'Mittente verificato',
    senderTodo: 'Mittente da configurare',
    senderUnverified: 'Mittente da verificare',
    configure: 'Impostazioni',
    campaigns: 'Campagne in corso',
    newsletters: 'Newsletter in programma',
    newCampaign: 'Nuova campagna',
    newNewsletter: 'Nuova newsletter',
    emptyCampaigns: 'Nessuna campagna in corso.',
    emptyNewsletters: 'Nessuna newsletter in programma.',
    all: 'Tutte',
    status: { active: 'Attiva', paused: 'In pausa', scheduled: 'Programmata', sending: 'In invio' } as Record<string, string>,
    noWorkspace: 'Scegli un’organizzazione per continuare.',
    choose: 'Scegli',
  },
  en: {
    sentToday: 'Sent today',
    errorsToday: 'Errors today',
    queued: 'Queued',
    bounces: 'Bounces 30 d',
    nextSend: 'Next send',
    none: '—',
    senderOk: 'Sender verified',
    senderTodo: 'Sender not configured',
    senderUnverified: 'Sender not verified',
    configure: 'Settings',
    campaigns: 'Running campaigns',
    newsletters: 'Scheduled newsletters',
    newCampaign: 'New campaign',
    newNewsletter: 'New newsletter',
    emptyCampaigns: 'No running campaigns.',
    emptyNewsletters: 'No scheduled newsletters.',
    all: 'All',
    status: { active: 'Active', paused: 'Paused', scheduled: 'Scheduled', sending: 'Sending' } as Record<string, string>,
    noWorkspace: 'Choose an organization to continue.',
    choose: 'Choose',
  },
} as const;

function formatWhen(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(locale === 'en' ? 'en-GB' : 'it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function Hub({ data }: { data: HubData | null }) {
  const { locale } = useTranslation();
  const c = COPY[locale === 'en' ? 'en' : 'it'];

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-sm text-[#5c5e63]">
          {c.noWorkspace}{' '}
          <Link href="/workspace" className="text-[#036e13] font-medium hover:underline underline-offset-4">{c.choose}</Link>
        </p>
      </div>
    );
  }

  const metrics: Array<{ label: string; value: string; tone?: 'bad' }> = [
    { label: c.sentToday, value: String(data.sentToday) },
    { label: c.errorsToday, value: String(data.errorsToday), tone: data.errorsToday > 0 ? 'bad' : undefined },
    { label: c.queued, value: String(data.queued) },
    { label: c.bounces, value: String(data.bounces30d), tone: data.bounces30d > 0 ? 'bad' : undefined },
  ];

  const senderLabel = data.sender.verified ? c.senderOk : data.sender.configured ? c.senderUnverified : c.senderTodo;
  const nextWhen = formatWhen(data.nextDue, locale);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-3xl text-[#1b1c1a]">{data.organizationName}</h1>
          <p className="mt-1 text-sm text-[#5c5e63] flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${data.sender.verified ? 'bg-[#5cb855]' : 'bg-[#f59e0b]'}`} />
            <span>{senderLabel}{data.sender.verified && data.sender.fromEmail ? ` · ${data.sender.fromEmail}` : ''}</span>
            {!data.sender.verified ? (
              <Link href="/settings" className="text-[#036e13] font-medium hover:underline underline-offset-4">{c.configure}</Link>
            ) : null}
          </p>
        </div>
        {data.canWrite ? (
          <div className="flex gap-2">
            <Link href="/campaigns/new" className="h-10 px-4 rounded-lg bg-[#1b1c1a] text-[#f2f0ed] text-sm font-semibold hover:bg-[#30312f] flex items-center">
              {c.newCampaign}
            </Link>
            <Link href="/newsletters/new" className="h-10 px-4 rounded-lg border border-[#e5e5e0] bg-white text-[#1b1c1a] text-sm font-semibold hover:bg-[#f5f3f0] flex items-center">
              {c.newNewsletter}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-[#e5e5e0] bg-white px-4 py-3">
            <p className="text-xs text-[#5c5e63]">{m.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${m.tone === 'bad' ? 'text-[#b3261e]' : 'text-[#1b1c1a]'}`}>{m.value}</p>
          </div>
        ))}
        <div className="rounded-xl border border-[#e5e5e0] bg-white px-4 py-3 col-span-2 md:col-span-1">
          <p className="text-xs text-[#5c5e63]">{c.nextSend}</p>
          <p className="mt-1 text-sm font-semibold text-[#1b1c1a]">{nextWhen ?? c.none}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <List title={c.campaigns} empty={c.emptyCampaigns} allHref="/campaigns" allLabel={c.all} hrefBase="/campaigns" items={data.campaigns} statusLabels={c.status} locale={locale} />
        <List title={c.newsletters} empty={c.emptyNewsletters} allHref="/newsletters" allLabel={c.all} hrefBase="/newsletters" items={data.newsletters} statusLabels={c.status} locale={locale} />
      </div>
    </div>
  );
}

function List({
  title,
  empty,
  allHref,
  allLabel,
  hrefBase,
  items,
  statusLabels,
  locale,
}: {
  title: string;
  empty: string;
  allHref: string;
  allLabel: string;
  hrefBase: string;
  items: Item[];
  statusLabels: Record<string, string>;
  locale: string;
}) {
  return (
    <section className="rounded-xl border border-[#e5e5e0] bg-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#e5e5e0]">
        <h2 className="text-sm font-semibold text-[#1b1c1a]">{title}</h2>
        <Link href={allHref} className="text-xs text-[#5c5e63] hover:text-[#1b1c1a]">{allLabel}</Link>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-[#5c5e63]">{empty}</p>
      ) : (
        <ul className="divide-y divide-[#e5e5e0]">
          {items.map((it) => {
            const pct = it.total > 0 ? Math.round((it.sent / it.total) * 100) : 0;
            const when = formatWhen(it.next_send_at, locale);
            return (
              <li key={it.id}>
                <Link href={`${hrefBase}/${it.id}`} className="block px-5 py-3 hover:bg-[#fbf9f6]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-[#1b1c1a] truncate">{it.name}</span>
                    <span className="text-xs text-[#5c5e63] shrink-0">{statusLabels[it.status] || it.status}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-[#f5f3f0] overflow-hidden">
                      <div className="h-full bg-[#5cb855]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-[#5c5e63] shrink-0">
                      {it.sent}/{it.total}{when ? ` · ${when}` : ''}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
