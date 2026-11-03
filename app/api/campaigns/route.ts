import { NextRequest, NextResponse } from 'next/server';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';
import { CampaignSchema } from '@/lib/validations/campaign';
import { enrichCampaignsWithStats } from '@/lib/campaigns/stats';
import type { Campaign } from '@/types/database';

export async function GET() {
  try {
    const tenant = await requireTenant();
    const supabase = tenant.supabase;

    const { data: campaigns, error } = await supabase
      .from('mail_campaigns')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch count stats for each campaign accurately
    const campaignsWithStats = await enrichCampaignsWithStats(supabase, (campaigns || []) as Campaign[]);

    return NextResponse.json(campaignsWithStats);
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    requireWrite(tenant);
    const supabase = tenant.supabase;

    const body: unknown = await request.json();

    const parsed = CampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }

    const insertPayload = {
      ...parsed.data,
      start_at: parsed.data.start_at || null,
      organization_id: tenant.organizationId,
      created_by: tenant.user.id,
    };

    const { data, error } = await supabase
      .from('mail_campaigns')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
