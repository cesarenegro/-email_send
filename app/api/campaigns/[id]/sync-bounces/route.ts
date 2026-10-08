import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncBouncesFromImap } from '@/lib/email/imap-bounce-client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = createAdminClient();

    // Verify campaign exists
    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('id', id)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 });
    }

    const result = await syncBouncesFromImap(supabase, {
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
  } catch (err: any) {
    console.error('Error during campaign bounce sync:', err);
    return NextResponse.json(
      { error: err.message || 'Errore durante la sincronizzazione dei rimbalzi' },
      { status: 500 }
    );
  }
}
