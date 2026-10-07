import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeNextSendTime } from '@/lib/scheduling/next-send-time';
import { DateTime } from 'luxon';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const { data: campaign, error: fetchError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !campaign) {
    return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
  }

  // Next valid slot starting from now
  const nextSlot = computeNextSendTime(DateTime.now(), {
    timezone: campaign.timezone,
    send_window_start: campaign.send_window_start,
    send_window_end: campaign.send_window_end,
  });

  const nextSendIso = nextSlot.toUTC().toISO();

  const { data: updated, error } = await supabase
    .from('campaigns')
    .update({
      status: 'active',
      next_send_at: nextSendIso,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
