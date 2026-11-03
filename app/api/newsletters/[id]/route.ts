import { NextRequest, NextResponse } from 'next/server';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';
import { getNewsletterStats } from '@/lib/newsletters/stats';

/**
 * Colonne di mail_newsletters modificabili via PATCH. Le colonne di tenancy e di audit
 * (id, organization_id, created_by, created_at, updated_at) non sono mai accettate dal client.
 */
const EDITABLE_NEWSLETTER_FIELDS = [
  'title',
  'subject',
  'html_content',
  'status',
  'scheduled_at',
  'timezone',
  'send_interval_seconds',
  'next_send_at',
] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await requireTenant();
    const supabase = tenant.supabase;

    const { data: newsletter, error } = await supabase
      .from('mail_newsletters')
      .select('*')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();

    if (error || !newsletter) {
      return NextResponse.json({ error: 'Newsletter non trovata' }, { status: 404 });
    }

    const stats = await getNewsletterStats(supabase, id);

    return NextResponse.json({
      ...newsletter,
      ...stats,
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await requireTenant();
    requireWrite(tenant);
    const supabase = tenant.supabase;

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;

    if (typeof input.html_content === 'string' && /data:image\/[a-zA-Z+]+;base64,/i.test(input.html_content)) {
      return NextResponse.json(
        { error: 'Non è consentito salvare immagini Base64. Convertile in immagini caricate su storage prima del salvataggio.' },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = {};
    for (const field of EDITABLE_NEWSLETTER_FIELDS) {
      if (field in input) updatePayload[field] = input[field];
    }

    const { data: existing, error: fetchError } = await supabase
      .from('mail_newsletters')
      .select('id')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Newsletter non trovata' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('mail_newsletters')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await requireTenant();
    requireWrite(tenant);
    const supabase = tenant.supabase;

    const { data: deleted, error } = await supabase
      .from('mail_newsletters')
      .delete()
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Newsletter non trovata' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
