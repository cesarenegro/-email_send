import { NextRequest, NextResponse } from 'next/server';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tenant = await requireTenant();
    requireWrite(tenant);
    const supabase = tenant.supabase;

    const { data: updated, error } = await supabase
      .from('mail_campaigns')
      .update({
        status: 'paused',
      })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
