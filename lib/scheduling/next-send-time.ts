import { DateTime } from 'luxon';

export interface ScheduleConfig {
  timezone?: string;
  send_window_start?: string; // HH:mm format, e.g. "09:00"
  send_window_end?: string;   // HH:mm format, e.g. "18:00"
  send_interval_seconds?: number;
}

/**
 * Checks whether a given DateTime falls on Monday through Friday.
 * Luxon weekday: 1 = Monday, ..., 7 = Sunday.
 */
export function isAllowedWeekday(dt: DateTime): boolean {
  return dt.weekday >= 1 && dt.weekday <= 5;
}

/**
 * Advances the date to the next valid weekday (Monday - Friday).
 * If already on a weekday, leaves the date unchanged.
 */
export function advanceToWeekday(dt: DateTime<boolean>): DateTime<boolean> {
  let current: DateTime<boolean> = dt;
  while (!isAllowedWeekday(current)) {
    current = current.plus({ days: 1 }).startOf('day');
  }
  return current;
}

/**
 * Parses "HH:mm" or "HH:mm:ss" into hour and minute integers.
 */
function parseTime(timeStr: string = '09:00'): { hour: number; minute: number } {
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10) || 0;
  const minute = parseInt(parts[1], 10) || 0;
  return { hour, minute };
}

/**
 * Computes the next valid slot for a campaign, strictly respecting:
 * 1. Campaign timezone (default: Europe/Rome)
 * 2. Allowed weekdays (Monday - Friday)
 * 3. Daily sending window (e.g. 09:00 - 18:00)
 */
export function computeNextSendTime(
  baseTime: DateTime<boolean> | Date | string = DateTime.utc(),
  config: ScheduleConfig = {}
): DateTime<boolean> {
  const zone = config.timezone || 'Europe/Rome';
  const windowStart = parseTime(config.send_window_start || '09:00');
  const windowEnd = parseTime(config.send_window_end || '18:00');

  // Convert base time to campaign timezone
  let dt: DateTime<boolean> = (
    typeof baseTime === 'string'
      ? DateTime.fromISO(baseTime, { zone })
      : baseTime instanceof Date
      ? DateTime.fromJSDate(baseTime, { zone })
      : baseTime.setZone(zone)
  );

  if (!dt.isValid) {
    dt = DateTime.now().setZone(zone);
  }

  // 1. Ensure dt is on an allowed weekday
  if (!isAllowedWeekday(dt)) {
    return advanceToWeekday(dt).set({
      hour: windowStart.hour,
      minute: windowStart.minute,
      second: 0,
      millisecond: 0,
    });
  }

  // Define window boundaries for the current day
  const todayStart = dt.set({
    hour: windowStart.hour,
    minute: windowStart.minute,
    second: 0,
    millisecond: 0,
  });

  const todayEnd = dt.set({
    hour: windowEnd.hour,
    minute: windowEnd.minute,
    second: 0,
    millisecond: 0,
  });

  // If time is before the window opens today
  if (dt < todayStart) {
    return todayStart;
  }

  // If time is after the window closes today
  if (dt >= todayEnd) {
    const nextDay = dt.plus({ days: 1 }).startOf('day');
    const nextWeekday = advanceToWeekday(nextDay);
    return nextWeekday.set({
      hour: windowStart.hour,
      minute: windowStart.minute,
      second: 0,
      millisecond: 0,
    });
  }

  // Within window on an allowed weekday
  return dt;
}

/**
 * Computes the subsequent send time after an email attempt (success or error).
 * Adds send_interval_seconds (minimum 60s) to now, then normalizes to window.
 */
export function computeSubsequentSendTime(
  fromTime: DateTime | Date = new Date(),
  config: ScheduleConfig = {}
): string {
  const intervalSeconds = Math.max(60, config.send_interval_seconds || 240);
  const zone = config.timezone || 'Europe/Rome';

  const base = (
    fromTime instanceof Date
      ? DateTime.fromJSDate(fromTime, { zone })
      : fromTime.setZone(zone)
  ).plus({ seconds: intervalSeconds });

  const nextSlot = computeNextSendTime(base, config);
  return nextSlot.toUTC().toISO()!;
}
