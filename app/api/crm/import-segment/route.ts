import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';
import { KcrmError } from '@/lib/konta/kcrm-client';
import { importSegment } from '@/lib/konta/import-segment';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  target: z.enum(['campaign', 'newsletter']),
  target_id: z.string().uuid(),
  segment_id: z.string().uuid(),
});

/** Importa un segmento K-CRM in una campagna (non attiva) o in una newsletter (non in invio). */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    requireWrite(tenant);

    const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Parametri non validi.' }, { status: 400 });
    }
    const { target, target_id, segment_id } = parsed.data;

    const parentTable = target === 'campaign' ? 'mail_campaigns' : 'mail_newsletters';
    const { data: parent, error } = await tenant.supabase
      .from(parentTable)
      .select('id, status')
      .eq('id', target_id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();
    if (error || !parent) {
      return NextResponse.json({ error: target === 'campaign' ? 'Campagna non trovata' : 'Newsletter non trovata' }, { status: 404 });
    }
    const status = (parent as { status: string }).status;
    if ((target === 'campaign' && status === 'active') || (target === 'newsletter' && status === 'sending')) {
      return NextResponse.json({ error: 'Metti in pausa prima di importare.' }, { status: 400 });
    }

    const result = await importSegment(tenant, { kind: target, id: target_id }, segment_id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof KcrmError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status === 404 ? 404 : err.status === 403 ? 403 : 503 });
    }
    return tenantErrorResponse(err);
  }
}
