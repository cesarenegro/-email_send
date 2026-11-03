import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';
import { dispatchNextEmailForNewsletter } from '@/lib/email/newsletter-dispatcher';
import type { Newsletter } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await requireTenant();
    requireWrite(tenant);

    // Load the newsletter through the user's client, scoped to the active organization
    const { data: newsletterRow, error: nlError } = await tenant.supabase
      .from('mail_newsletters')
      .select('*')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();

    if (nlError || !newsletterRow) {
      return NextResponse.json({ error: 'Newsletter non trovata' }, { status: 404 });
    }
    const newsletter = newsletterRow as Newsletter;

    const adminSupabase = createAdminClient();

    try {
      const result = await dispatchNextEmailForNewsletter(adminSupabase, newsletter);

      if (result.status === 'sent') {
        return NextResponse.json({
          success: true,
          status: 'sent',
          subscriber: result.subscriber,
          smtp_message_id: result.smtp_message_id,
          message: `Newsletter inviata con successo a ${result.subscriber?.email}!`,
        });
      }

      if (result.status === 'error_configuration') {
        return NextResponse.json({
          success: false,
          status: 'error_configuration',
          error: result.error || result.message,
          message: result.message || 'Configurazione SMTP newsletter non valida',
        }, { status: 400 });
      }

      if (result.status === 'error_transient') {
        return NextResponse.json({
          success: false,
          status: 'error_transient',
          error: result.error || result.message,
          message: result.message || 'Errore transitorio durante l\'invio della newsletter.',
        }, { status: 500 });
      }

      if (result.status === 'error_handled') {
        return NextResponse.json({
          success: false,
          status: 'error_handled',
          subscriber: result.subscriber,
          error: result.error,
          message: `Tentativo fallito per ${result.subscriber?.email}: ${result.error}`,
        });
      }

      return NextResponse.json({
        success: true,
        status: result.status,
        message: result.message || 'Elaborazione newsletter completata.',
      });
    } catch (err) {
      console.error('Error during manual newsletter send-now:', err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
