import { NextRequest, NextResponse } from 'next/server';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';
import { CampaignSchema } from '@/lib/validations/campaign';
import { getCampaignStats } from '@/lib/campaigns/stats';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tenant = await requireTenant();
    const supabase = tenant.supabase;

    const { data: campaign, error } = await supabase
      .from('mail_campaigns')
      .select('*')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }

    // Count stats without 1000 row limitation
    const stats = await getCampaignStats(supabase, id);

    return NextResponse.json({
      ...campaign,
      ...stats,
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tenant = await requireTenant();
    requireWrite(tenant);
    const supabase = tenant.supabase;

    const body: unknown = await request.json();

    // Check current status and campaign tenancy
    const { data: existing, error: fetchError } = await supabase
      .from('mail_campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }

    if (existing.status === 'active') {
      return NextResponse.json(
        { error: 'Impossibile modificare una campagna attiva. Metti in PAUSA la campagna prima di apportare modifiche.' },
        { status: 400 }
      );
    }

    const parsed = CampaignSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dati non validi' },
        { status: 400 }
      );
    }

    const updatePayload = {
      ...parsed.data,
      ...(parsed.data.start_at !== undefined ? { start_at: parsed.data.start_at || null } : {}),
    };

    const { data, error } = await supabase
      .from('mail_campaigns')
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tenant = await requireTenant();
    requireWrite(tenant);
    const supabase = tenant.supabase;

    const { data: existing, error: fetchError } = await supabase
      .from('mail_campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }

    if (existing.status === 'active') {
      return NextResponse.json(
        { error: 'Non è possibile eliminare una campagna ATTIVA. Mettila prima in pausa o attendi il completamento.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('mail_campaigns')
      .delete()
      .eq('id', id)
      .eq('organization_id', tenant.organizationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Campagna eliminata con successo' });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
