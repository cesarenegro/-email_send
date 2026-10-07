import { DateTime } from 'luxon';
import { SupabaseClient } from '@supabase/supabase-js';

export async function hasReachedDailyLimit(
  supabase: SupabaseClient,
  campaignId: string,
  dailyLimit: number,
  timezone: string = 'Europe/Rome'
): Promise<boolean> {
  const now = DateTime.now().setZone(timezone);
  const startOfDayUtc = now.startOf('day').toUTC().toISO();
  const endOfDayUtc = now.endOf('day').toUTC().toISO();

  const { count, error } = await supabase
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('event_type', 'sent')
    .gte('created_at', startOfDayUtc)
    .lte('created_at', endOfDayUtc);

  if (error) {
    console.error('Error checking daily limit:', error);
    return false;
  }

  return (count ?? 0) >= dailyLimit;
}
