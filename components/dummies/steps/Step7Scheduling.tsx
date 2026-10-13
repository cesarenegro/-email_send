'use client';

import React from 'react';
import { Clock, Calendar, ShieldCheck, Globe, Info } from 'lucide-react';
import { SUPPORTED_TIMEZONES, getTimezoneConfig } from '@/lib/constants/timezones';
import { estimateCampaignCompletion } from '@/lib/scheduling/estimate-completion';
import { DateTime } from 'luxon';

export interface SchedulingState {
  startMode: 'immediate' | 'scheduled';
  scheduledDate: string; // ISO string or datetime-local
  timezone: string;
  sendIntervalSeconds: number; // default 240 (4 mins)
  dailyLimit: number; // default 80
}

interface Step7SchedulingProps {
  data: SchedulingState;
  onUpdate: (data: Partial<SchedulingState>) => void;
  leadCount: number;
}

export default function Step7Scheduling({ data, onUpdate, leadCount }: Step7SchedulingProps) {
  // Use real calculation algorithm
  const estimation = estimateCampaignCompletion({
    id: 'dummy',
    name: 'Draft',
    subject_template: '',
    html_template: '',
    status: 'active',
    next_send_at: data.startMode === 'scheduled' && data.scheduledDate
      ? DateTime.fromISO(data.scheduledDate, { zone: data.timezone || 'Europe/Rome' }).toUTC().toISO()
      : null,
    timezone: data.timezone || 'Europe/Rome',
    send_window_start: '09:00',
    send_window_end: '18:00',
    send_interval_seconds: data.sendIntervalSeconds || 240,
    daily_limit: data.dailyLimit || 80,
    pending_count: leadCount,
    total_leads: leadCount,
    sent_count: 0,
    failed_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any);

  const localTime = (() => {
    try {
      return DateTime.now().setZone(data.timezone || 'Europe/Rome').toFormat('HH:mm');
    } catch {
      return '';
    }
  })();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1B1C1A]">7. Programmazione e durata stimata</h3>
        <p className="text-xs text-[#5C5E63] mt-1">
          Scegli quando far partire la spedizione. Ti mostriamo la stima calcolata sul rispetto dei limiti antispam.
        </p>
      </div>

      <div className="bg-white p-5 rounded-xl border border-[#D8D2C8] shadow-xs space-y-5">
        {/* Start choice */}
        <div>
          <label className="block text-xs font-semibold text-[#1B1C1A] uppercase tracking-wider mb-2">
            Quando vuoi iniziare?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onUpdate({ startMode: 'immediate' })}
              className={`p-3 text-left rounded-xl border transition-all ${
                data.startMode === 'immediate'
                  ? 'border-[#036E13] bg-emerald-50/50 ring-1 ring-[#036E13]'
                  : 'border-[#D8D2C8] bg-white hover:bg-[#FAF9F6]'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs text-[#1B1C1A]">
                <Clock className="w-4 h-4 text-[#036E13]" />
                <span>Subito (alla conferma)</span>
              </div>
              <p className="text-[11px] text-[#5C5E63] mt-1">
                La prima email partirà immediatamente nella prima finestra lavorativa disponibile.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onUpdate({ startMode: 'scheduled' })}
              className={`p-3 text-left rounded-xl border transition-all ${
                data.startMode === 'scheduled'
                  ? 'border-[#036E13] bg-emerald-50/50 ring-1 ring-[#036E13]'
                  : 'border-[#D8D2C8] bg-white hover:bg-[#FAF9F6]'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs text-[#1B1C1A]">
                <Calendar className="w-4 h-4 text-[#036E13]" />
                <span>In una data e ora precisa</span>
              </div>
              <p className="text-[11px] text-[#5C5E63] mt-1">
                Pianifica la partenza per un giorno o un orario futuro a tua scelta.
              </p>
            </button>
          </div>

          {data.startMode === 'scheduled' && (
            <div className="mt-3 p-3 bg-[#FAF9F6] rounded-lg border border-[#D8D2C8] space-y-2">
              <label className="block text-xs font-semibold text-[#1B1C1A]">Data e Ora di Avvio:</label>
              <input
                type="datetime-local"
                value={data.scheduledDate}
                onChange={(e) => onUpdate({ scheduledDate: e.target.value })}
                className="px-3 py-1.5 text-xs bg-white border border-[#D8D2C8] rounded-lg text-[#1B1C1A]"
              />
            </div>
          )}
        </div>

        {/* Timezone */}
        <div className="pt-3 border-t border-[#E5E5E0]">
          <label className="block text-xs font-semibold text-[#1B1C1A] uppercase tracking-wider mb-1.5">
            Fuso Orario di Riferimento
          </label>
          <div className="flex items-center gap-2">
            <select
              value={data.timezone}
              onChange={(e) => onUpdate({ timezone: e.target.value })}
              className="px-3 py-1.5 text-xs bg-white border border-[#D8D2C8] rounded-lg font-medium text-[#1B1C1A] focus:outline-none focus:ring-1 focus:ring-[#036E13]"
            >
              {SUPPORTED_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.utcOffset})
                </option>
              ))}
            </select>
            <span className="text-xs text-[#5C5E63] font-mono">
              (Ora locale attuale: <strong>{localTime}</strong>)
            </span>
          </div>
        </div>

        {/* Realistic Duration Calculation Card */}
        <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#D8D2C8] space-y-3">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-[#1B1C1A]">
            <ShieldCheck className="w-4 h-4 text-[#036E13]" />
            <span>Regole di Tutela e Calcolo di Durata</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-white rounded border border-[#E5E5E0]">
              <span className="text-[11px] text-[#5C5E63] block">Destinatari:</span>
              <span className="font-bold text-[#1B1C1A]">{leadCount} contatti</span>
            </div>
            <div className="p-2.5 bg-white rounded border border-[#E5E5E0]">
              <span className="text-[11px] text-[#5C5E63] block">Cadenza invio:</span>
              <span className="font-bold text-[#1B1C1A]">1 ogni 4 minuti</span>
            </div>
            <div className="p-2.5 bg-white rounded border border-[#E5E5E0]">
              <span className="text-[11px] text-[#5C5E63] block">Finestra oraria:</span>
              <span className="font-bold text-[#1B1C1A]">Lun-Ven, 09:00 - 18:00</span>
            </div>
            <div className="p-2.5 bg-white rounded border border-[#E5E5E0]">
              <span className="text-[11px] text-[#5C5E63] block">Limite giornaliero:</span>
              <span className="font-bold text-[#1B1C1A]">max 80 email / giorno</span>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1 text-emerald-950">
            <div className="font-bold text-sm text-emerald-900 flex items-center justify-between">
              <span>Durata Stimata: ~{estimation.workingDays} {estimation.workingDays === 1 ? 'giorno lavorativo' : 'giorni lavorativi'}</span>
              {estimation.estimatedDate && (
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  Fine prevista: {estimation.estimatedDate}
                </span>
              )}
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Questa stima tiene conto del ritmo naturale e della chiusura nel fine settimana. Eventuali pause manuali o rallentamenti temporanei del gestore di posta possono allungare i tempi di completamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
