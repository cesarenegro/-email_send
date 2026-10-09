import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeNextSendTime, isAllowedWeekday } from '@/lib/scheduling/next-send-time';
import { hasReachedDailyLimit } from '@/lib/scheduling/daily-limit';
import { dispatchNextEmailForCampaign } from '@/lib/email/dispatcher';
import { DateTime } from 'luxon';
import { Campaign } from '@/types/database';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Up to 60 seconds runtime on Vercel

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  // 1. Validate CRON_SECRET
  const expectedSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization')?.trim();

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err: any) {
    return NextResponse.json({ error: 'Supabase admin client error: ' + err.message }, { status: 500 });
  }

  const nowIso = DateTime.utc().toISO()!;

  // 2. Check if a scheduled newsletter is due or currently sending
  const { data: dueNewsletters, error: newsletterError } = await supabase
    .from('newsletters')
    .select('*')
    .or(`and(status.eq.scheduled,scheduled_at.lte.${nowIso}),and(status.eq.sending,next_send_at.lte.${nowIso})`)
    .order('created_at', { ascending: true })
    .limit(1);

  if (newsletterError) {
    console.warn('Error checking due newsletters:', newsletterError.message);
  } else if (dueNewsletters && dueNewsletters.length > 0) {
    const { dispatchNextEmailForNewsletter } = await import('@/lib/email/newsletter-dispatcher');
    try {
      const result = await dispatchNextEmailForNewsletter(supabase, dueNewsletters[0]);
      return NextResponse.json({
        ...result,
        type: 'newsletter',
        newsletter_id: dueNewsletters[0].id,
      });
    } catch (err: any) {
      console.error('Error during newsletter cron dispatch:', err);
      return NextResponse.json({ error: err.message, type: 'newsletter' }, { status: 500 });
    }
  }

  // 3. Find the oldest active campaign that is due for sending
  const { data: campaigns, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .lte('next_send_at', nowIso)
    .order('next_send_at', { ascending: true })
    .limit(1);

  if (campaignError) {
    console.error('Error fetching due campaigns:', campaignError);
    return NextResponse.json({ error: campaignError.message }, { status: 500 });
  }

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ status: 'idle', message: 'No campaigns currently due' });
  }

  const campaign: Campaign = campaigns[0];

  // 3. Validate current local time (window & weekday)
  const currentSlot = computeNextSendTime(DateTime.now(), {
    timezone: campaign.timezone,
    send_window_start: campaign.send_window_start,
    send_window_end: campaign.send_window_end,
  });

  const nowLuxon = DateTime.now().setZone(campaign.timezone);

  // If now is outside allowed window/day, postpone next_send_at
  if (currentSlot.diff(nowLuxon, 'minutes').minutes > 1) {
    const postponedUtc = currentSlot.toUTC().toISO();
    await supabase
      .from('campaigns')
      .update({ next_send_at: postponedUtc })
      .eq('id', campaign.id);

    return NextResponse.json({
      status: 'postponed',
      reason: 'Outside sending window or weekday',
      next_send_at: postponedUtc,
    });
  }

  // 4. Validate daily limit
  const limitReached = await hasReachedDailyLimit(
    supabase,
    campaign.id,
    campaign.daily_limit,
    campaign.timezone
  );

  if (limitReached) {
    // Postpone to next valid weekday morning
    const tomorrow = nowLuxon.plus({ days: 1 }).startOf('day');
    const nextSlot = computeNextSendTime(tomorrow, {
      timezone: campaign.timezone,
      send_window_start: campaign.send_window_start,
      send_window_end: campaign.send_window_end,
    });
    const postponedUtc = nextSlot.toUTC().toISO();

    await supabase
      .from('campaigns')
      .update({ next_send_at: postponedUtc })
      .eq('id', campaign.id);

    return NextResponse.json({
      status: 'daily_limit_reached',
      limit: campaign.daily_limit,
      next_send_at: postponedUtc,
    });
  }

  // 5. Dispatch next email atomically
  try {
    const result = await dispatchNextEmailForCampaign(supabase, campaign);
    return NextResponse.json({
      ...result,
      campaign_id: campaign.id,
    });
  } catch (err: any) {
    console.error('Error during cron dispatch:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
