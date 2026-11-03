import { NextRequest, NextResponse } from 'next/server';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await requireTenant();
    requireWrite(tenant);
    const supabase = tenant.supabase;

    const { data: updated, error } = await supabase
      .from('mail_newsletters')
      .update({
        status: 'paused',
        next_send_at: null,
      })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: 'Newsletter non trovata' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
