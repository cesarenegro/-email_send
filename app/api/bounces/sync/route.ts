import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncBouncesFromImap } from '@/lib/email/imap-bounce-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    let campaignId: string | undefined;
    let limitMessages = 150;

    try {
      const body = await request.json();
      if (body.campaignId) campaignId = body.campaignId;
      if (body.limitMessages) limitMessages = Number(body.limitMessages);
    } catch {
      // Body is optional
    }

    const result = await syncBouncesFromImap(supabase, {
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
  } catch (err: any) {
    console.error('Error during global bounce sync:', err);
    return NextResponse.json(
      { error: err.message || 'Errore durante la sincronizzazione dei rimbalzi' },
      { status: 500 }
    );
  }
}
