import { NextResponse } from 'next/server';
import { requireTenant, tenantErrorResponse } from '@/lib/konta/session';
import { KcrmError, listKcrmSegments } from '@/lib/konta/kcrm-client';

export const dynamic = 'force-dynamic';

/** Segmenti K-CRM dell'organizzazione attiva (letti dall'API di K-CRM). */
export async function GET() {
  try {
    const tenant = await requireTenant();
    const segments = await listKcrmSegments(tenant.organizationId);
    return NextResponse.json({ segments });
  } catch (err) {
    if (err instanceof KcrmError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status === 401 ? 401 : err.status === 403 ? 403 : 503 });
    }
    return tenantErrorResponse(err);
  }
}
