import { NextRequest, NextResponse } from 'next/server';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';
import { computeNextSendTime } from '@/lib/scheduling/next-send-time';
import type { Campaign } from '@/types/database';
import { DateTime } from 'luxon';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tenant = await requireTenant();
    requireWrite(tenant);
    const supabase = tenant.supabase;

    const { data: campaignRow, error: fetchError } = await supabase
      .from('mail_campaigns')
      .select('*')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();

    if (fetchError || !campaignRow) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }
    const campaign = campaignRow as Campaign;

    // Next valid slot starting from now
    const nextSlot = computeNextSendTime(DateTime.now(), {
      timezone: campaign.timezone,
      send_window_start: campaign.send_window_start,
      send_window_end: campaign.send_window_end,
    });

    const nextSendIso = nextSlot.toUTC().toISO();

    const { data: updated, error } = await supabase
      .from('mail_campaigns')
      .update({
        status: 'active',
        next_send_at: nextSendIso,
      })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
