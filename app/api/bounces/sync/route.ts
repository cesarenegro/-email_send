import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';
import { syncBouncesFromImap } from '@/lib/email/imap-bounce-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    requireWrite(tenant);

    let campaignId: string | undefined;
    let limitMessages = 150;

    try {
      const body: unknown = await request.json();
      if (body && typeof body === 'object') {
        const { campaignId: rawCampaignId, limitMessages: rawLimit } = body as {
          campaignId?: unknown;
          limitMessages?: unknown;
        };
        if (typeof rawCampaignId === 'string' && rawCampaignId) campaignId = rawCampaignId;
        if (rawLimit !== undefined && rawLimit !== null && rawLimit !== '') {
          const parsedLimit = Number(rawLimit);
          if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
            limitMessages = Math.min(500, Math.floor(parsedLimit));
          }
        }
      }
    } catch {
      // Body is optional
    }

    // If a campaign is requested, it must belong to the active organization
    if (campaignId) {
      const { data: campaign, error: campErr } = await tenant.supabase
        .from('mail_campaigns')
        .select('id')
        .eq('id', campaignId)
        .eq('organization_id', tenant.organizationId)
        .maybeSingle();

      if (campErr || !campaign) {
        return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
      }
    }

    try {
      const result = await syncBouncesFromImap(createAdminClient(), tenant.organizationId, {
        campaignId,
        limitMessages,
      });

      return NextResponse.json({
        success: result.success,
        bouncesDetected: result.bouncesDetected,
        leadsUpdated: result.leadsUpdated,
        updatedLeads: result.updatedLeads,
        errors: result.errors,
        message: result.leadsUpdated > 0
          ? `Sincronizzazione completata: ${result.leadsUpdated} contatti aggiornati come falliti/rimbalzati.`
          : `Nessun nuovo rimbalzo rilevato nelle caselle email.`,
      });
    } catch (err) {
      console.error('Error during organization bounce sync:', err);
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
