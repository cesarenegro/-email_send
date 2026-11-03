import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';
import { syncBouncesFromImap } from '@/lib/email/imap-bounce-client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tenant = await requireTenant();
    requireWrite(tenant);

    // Verify campaign exists in the active organization
    const { data: campaign, error: campErr } = await tenant.supabase
      .from('mail_campaigns')
      .select('id, name')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();

    if (campErr || !campaign) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }

    try {
      const result = await syncBouncesFromImap(createAdminClient(), tenant.organizationId, {
        campaignId: id,
        limitMessages: 150,
      });

      return NextResponse.json({
        success: result.success,
        campaignId: id,
        bouncesDetected: result.bouncesDetected,
        leadsUpdated: result.leadsUpdated,
        updatedLeads: result.updatedLeads,
        errors: result.errors,
        message: result.leadsUpdated > 0
          ? `Sincronizzazione completata: ${result.leadsUpdated} lead aggiornati come rimbalzati/falliti.`
          : `Nessun nuovo rimbalzo rilevato per questa campagna.`,
      });
    } catch (err) {
      console.error('Error during campaign bounce sync:', err);
      const message = err instanceof Error ? err.message : '';
      return NextResponse.json(
        { error: message || 'Errore durante la sincronizzazione dei rimbalzi' },
        { status: 500 }
      );
    }
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
