import { NextRequest, NextResponse } from 'next/server';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';
import { NewsletterSchema } from '@/lib/validations/newsletter';
import { enrichNewslettersWithStats } from '@/lib/newsletters/stats';
import type { Newsletter } from '@/types/database';

export async function GET() {
  try {
    const tenant = await requireTenant();
    const supabase = tenant.supabase;

    const { data: newsletters, error } = await supabase
      .from('mail_newsletters')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const newslettersWithStats = await enrichNewslettersWithStats(supabase, (newsletters || []) as Newsletter[]);

    return NextResponse.json(newslettersWithStats);
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
    const parsed = NewsletterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }

    const newsletterFields = parsed.data;
    const isScheduled = !!newsletterFields.scheduled_at;

    const insertPayload = {
      ...newsletterFields,
      organization_id: tenant.organizationId,
      created_by: tenant.user.id,
      status: isScheduled ? 'scheduled' : 'draft',
      next_send_at: isScheduled ? newsletterFields.scheduled_at : null,
    };

    const { data, error } = await supabase
      .from('mail_newsletters')
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
