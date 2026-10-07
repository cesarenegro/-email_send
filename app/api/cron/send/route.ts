import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeNextSendTime, computeSubsequentSendTime, isAllowedWeekday } from '@/lib/scheduling/next-send-time';
import { hasReachedDailyLimit } from '@/lib/scheduling/daily-limit';
import { renderTemplate } from '@/lib/email/render-template';
import { sendEmail } from '@/lib/email/send-email';
import { DateTime } from 'luxon';
import { Campaign, CampaignLead } from '@/types/database';

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
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

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

  // 2. Find the oldest active campaign that is due for sending
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

  // 5. Atomically claim one lead using PostgreSQL RPC (FOR UPDATE SKIP LOCKED)
  const { data: claimedRows, error: claimError } = await supabase.rpc(
    'claim_next_campaign_lead',
    { p_campaign_id: campaign.id }
  );

  if (claimError) {
    console.error('Error claiming lead via RPC:', claimError);
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  // 6. If no lead was returned, check if campaign is completed
  if (!claimedRows || claimedRows.length === 0) {
    const { count: remainingCount } = await supabase
      .from('campaign_leads')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)
      .in('status', ['pending', 'retry', 'sending']);

    if (!remainingCount || remainingCount === 0) {
      await supabase
        .from('campaigns')
        .update({
          status: 'completed',
          next_send_at: null,
        })
        .eq('id', campaign.id);

      return NextResponse.json({
        status: 'completed',
        message: 'Campaign has no more eligible leads. Marked as completed.',
      });
    }

    // Leads might be in retry state with future retry_at
    const subsequent = computeSubsequentSendTime(new Date(), {
      timezone: campaign.timezone,
      send_window_start: campaign.send_window_start,
      send_window_end: campaign.send_window_end,
      send_interval_seconds: campaign.send_interval_seconds,
    });

    await supabase
      .from('campaigns')
      .update({ next_send_at: subsequent })
      .eq('id', campaign.id);

    return NextResponse.json({
      status: 'waiting',
      message: 'No leads immediately due for claim; retries may be pending.',
      next_send_at: subsequent,
    });
  }

  const lead: CampaignLead = claimedRows[0];

  // 7. Render subject and HTML
  const renderedSubject = renderTemplate(campaign.subject_template, {
    company_name: lead.company_name,
    email: lead.email,
  });

  const renderedHtml = renderTemplate(campaign.html_template, {
    company_name: lead.company_name,
    email: lead.email,
  });

  let sendResult: any = null;
  let sendError: any = null;

  try {
    sendResult = await sendEmail({
      to: lead.email,
      subject: renderedSubject,
      html: renderedHtml,
    });
  } catch (err: any) {
    sendError = err;
    console.error('Error sending email to lead ' + lead.email + ':', err);
  }

  const nowTimestamp = DateTime.utc().toISO()!;

  // 8. Handle result
  if (!sendError && sendResult) {
    // SUCCESS
    await supabase
      .from('campaign_leads')
      .update({
        status: 'sent',
        sent_at: nowTimestamp,
        smtp_message_id: sendResult.messageId || null,
        last_error: null,
      })
      .eq('id', lead.id);

    await supabase.from('email_logs').insert({
      campaign_id: campaign.id,
      campaign_lead_id: lead.id,
      event_type: 'sent',
      smtp_message_id: sendResult.messageId || null,
    });
  } else {
    // ERROR - Retry Policy
    const errorMessage = sendError?.message || 'Unknown SMTP error';
    const isPermanent = /invalid address|syntax error|recipient rejected/i.test(errorMessage);
    const attempts = lead.attempts || 1;

    if (attempts >= 3 || isPermanent) {
      await supabase
        .from('campaign_leads')
        .update({
          status: 'failed',
          retry_at: null,
          last_error: errorMessage,
        })
        .eq('id', lead.id);
    } else {
      const retryAt = DateTime.utc().plus({ minutes: 15 }).toISO();
      await supabase
        .from('campaign_leads')
        .update({
          status: 'retry',
          retry_at: retryAt,
          last_error: errorMessage,
        })
        .eq('id', lead.id);
    }

    await supabase.from('email_logs').insert({
      campaign_id: campaign.id,
      campaign_lead_id: lead.id,
      event_type: 'error',
      error_message: errorMessage,
    });
  }

  // 9. Advance campaign next_send_at
  const nextSendAt = computeSubsequentSendTime(new Date(), {
    timezone: campaign.timezone,
    send_window_start: campaign.send_window_start,
    send_window_end: campaign.send_window_end,
    send_interval_seconds: campaign.send_interval_seconds,
  });

  await supabase
    .from('campaigns')
    .update({ next_send_at: nextSendAt })
    .eq('id', campaign.id);

  return NextResponse.json({
    status: sendError ? 'error_handled' : 'sent',
    campaign_id: campaign.id,
    lead_id: lead.id,
    recipient: lead.email,
    next_send_at: nextSendAt,
  });
}
