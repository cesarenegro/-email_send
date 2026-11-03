import { NextRequest, NextResponse } from 'next/server';
import { requireTenant, tenantErrorResponse } from '@/lib/konta/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tenant = await requireTenant();
    const supabase = tenant.supabase;

    // The campaign must belong to the active organization
    const { data: campaign, error: campError } = await supabase
      .from('mail_campaigns')
      .select('id')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();

    if (campError || !campaign) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status');

    let query = supabase
      .from('mail_campaign_leads')
      .select('*', { count: 'exact' })
      .eq('campaign_id', id)
      .eq('organization_id', tenant.organizationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      leads: data || [],
      total: count || 0,
      offset,
      limit,
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
