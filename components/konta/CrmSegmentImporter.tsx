'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface Props {
  target: 'campaign' | 'newsletter';
  targetId: string;
  onImported: () => void;
}

interface Segment {
  id: string;
  name: string;
}

/** Importa i destinatari da un segmento K-CRM (consensi e revoche gestiti da K-CRM). */
export default function CrmSegmentImporter({ target, targetId, onImported }: Props) {
  const { locale } = useTranslation();
  const en = locale === 'en';
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [segmentId, setSegmentId] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/crm/segments', { cache: 'no-store' });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setSegments([]);
          setNote({ ok: false, text: body?.error || (en ? 'K-CRM unavailable' : 'K-CRM non disponibile') });
          return;
        }
        const list = (body.segments || []) as Segment[];
        setSegments(list);
        if (list.length > 0) setSegmentId(list[0].id);
      } catch {
        if (!cancelled) {
          setSegments([]);
          setNote({ ok: false, text: en ? 'K-CRM unavailable' : 'K-CRM non disponibile' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [en]);

  async function run() {
    if (!segmentId) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/crm/import-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, target_id: targetId, segment_id: segmentId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote({ ok: false, text: body?.error || (en ? 'Import failed' : 'Import non riuscito') });
        return;
      }
      const text = en
        ? `${body.imported} imported · ${body.duplicates} already present · ${body.excluded} excluded by K-CRM`
        : `${body.imported} importati · ${body.duplicates} già presenti · ${body.excluded} esclusi da K-CRM`;
      setNote({ ok: true, text });
      onImported();
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : en ? 'Import failed' : 'Import non riuscito' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3">
      <p className="text-sm font-semibold text-[#1b1c1a]">{en ? 'Import from K-CRM segment' : 'Importa da segmento K-CRM'}</p>
      {segments === null ? (
        <p className="text-sm text-[#5c5e63]">{en ? 'Loading…' : 'Caricamento…'}</p>
      ) : segments.length === 0 ? (
        !note ? <p className="text-sm text-[#5c5e63]">{en ? 'No segments in K-CRM.' : 'Nessun segmento in K-CRM.'}</p> : null
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
            className="h-10 min-w-[220px] px-3 rounded-lg border border-[#e5e5e0] bg-white text-sm text-[#1b1c1a]"
          >
            {segments.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={run}
            disabled={busy || !segmentId}
            className="h-10 px-4 rounded-lg bg-[#1b1c1a] text-[#f2f0ed] text-sm font-semibold hover:bg-[#30312f] disabled:opacity-50"
          >
            {busy ? (en ? 'Importing…' : 'Importazione…') : en ? 'Import' : 'Importa'}
          </button>
        </div>
      )}
      {note ? <p role="status" className={`text-sm ${note.ok ? 'text-[#036e13]' : 'text-[#b3261e]'}`}>{note.text}</p> : null}
    </div>
  );
}
