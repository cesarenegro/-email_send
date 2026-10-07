import { DateTime } from 'luxon';
import { CampaignWithStats } from '@/types/database';

export interface CompletionEstimation {
  isCompleted: boolean;
  estimatedDate?: string;
  workingDays: number;
  label: string;
  subLabel?: string;
}

/**
 * Calculates realistic estimated completion date and duration for a campaign
 * considering:
 * - Remaining leads (pending_count)
 * - Sending interval (send_interval_seconds)
 * - Daily sending window (send_window_start to send_window_end)
 * - Daily cap (daily_limit)
 * - Weekend skips (Monday to Friday only)
 * - Campaign status (active, paused, draft, completed)
 */
export function estimateCampaignCompletion(campaign: CampaignWithStats): CompletionEstimation {
  const pending = campaign.pending_count ?? Math.max(0, (campaign.total_leads || 0) - (campaign.sent_count || 0) - (campaign.failed_count || 0));

  if (campaign.status === 'completed' || pending <= 0) {
    return {
      isCompleted: true,
      workingDays: 0,
      label: 'Completata',
    };
  }

  const zone = campaign.timezone || 'Europe/Rome';
  const rawStart = campaign.send_window_start || '09:00';
  const rawEnd = campaign.send_window_end || '18:00';

  const [startH, startM] = rawStart.slice(0, 5).split(':').map((v) => parseInt(v, 10) || 0);
  const [endH, endM] = rawEnd.slice(0, 5).split(':').map((v) => parseInt(v, 10) || 0);

  const windowDurationSec = Math.max(60, (endH * 60 + endM - (startH * 60 + startM)) * 60);
  const intervalSec = Math.max(60, campaign.send_interval_seconds || 240);
  const dailyLimit = Math.max(1, campaign.daily_limit || 80);

  const maxEmailsPerWindow = Math.floor(windowDurationSec / intervalSec);
  const effectiveDailyCapacity = Math.min(dailyLimit, Math.max(1, maxEmailsPerWindow));

  // Determine calculation starting time
  const now = DateTime.now().setZone(zone);
  let cursor: DateTime<boolean> = now;

  if (campaign.status === 'active' && campaign.next_send_at) {
    const nextDt = DateTime.fromISO(campaign.next_send_at, { zone });
    if (nextDt.isValid && nextDt > now) {
      cursor = nextDt;
    }
  }

  function advanceToNextWindow(dt: DateTime<boolean>): DateTime<boolean> {
    let next = dt.plus({ days: 1 }).set({ hour: startH, minute: startM, second: 0, millisecond: 0 });
    while (next.weekday > 5) {
      next = next.plus({ days: 1 });
    }
    return next;
  }

  // Align cursor inside window and on a weekday
  let currentDt: DateTime<boolean> = cursor;
  if (currentDt.weekday > 5) {
    while (currentDt.weekday > 5) {
      currentDt = currentDt.plus({ days: 1 });
    }
    currentDt = currentDt.set({ hour: startH, minute: startM, second: 0, millisecond: 0 });
  } else {
    const dayStart = currentDt.set({ hour: startH, minute: startM, second: 0, millisecond: 0 });
    const dayEnd = currentDt.set({ hour: endH, minute: endM, second: 0, millisecond: 0 });

    if (currentDt < dayStart) {
      currentDt = dayStart;
    } else if (currentDt >= dayEnd) {
      currentDt = advanceToNextWindow(currentDt);
    }
  }

  let remaining = pending;
  let workingDays = 0;

  while (remaining > 0) {
    workingDays++;
    const todayEnd = currentDt.set({ hour: endH, minute: endM, second: 0, millisecond: 0 });
    const secondsLeftToday = Math.max(0, todayEnd.diff(currentDt, 'seconds').seconds);
    const capacityTodayByTime = Math.floor(secondsLeftToday / intervalSec);
    const capacityToday = Math.min(effectiveDailyCapacity, capacityTodayByTime);

    if (remaining <= capacityToday && capacityToday > 0) {
      currentDt = currentDt.plus({ seconds: remaining * intervalSec });
      remaining = 0;
      break;
    } else {
      const sentToday = Math.max(1, capacityToday);
      remaining -= sentToday;
      currentDt = advanceToNextWindow(currentDt);
    }

    // Safety guard against infinite loops
    if (workingDays > 500) break;
  }

  const formattedDate = currentDt.toFormat('dd/MM/yyyy HH:mm');
  const daysText = `${workingDays} ${workingDays === 1 ? 'giorno lav.' : 'gg lavorativi'}`;

  if (campaign.status === 'active') {
    return {
      isCompleted: false,
      estimatedDate: formattedDate,
      workingDays,
      label: formattedDate,
      subLabel: `~${daysText}`,
    };
  }

  return {
    isCompleted: false,
    estimatedDate: formattedDate,
    workingDays,
    label: `~${daysText}`,
    subLabel: campaign.status === 'paused' ? 'In pausa' : 'Bozza',
  };
}
