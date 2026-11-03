import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';
import { resolveOrganizationTransport, SmtpConfigurationError } from '@/lib/email/transporter';
import type { Newsletter } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await requireTenant();
    requireWrite(tenant);
    const supabase = tenant.supabase;

    const { data: newsletterRow, error: fetchError } = await supabase
      .from('mail_newsletters')
      .select('*')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();

    if (fetchError || !newsletterRow) {
      return NextResponse.json({ error: 'Newsletter non trovata' }, { status: 404 });
    }
    const newsletter = newsletterRow as Newsletter;

    // Pre-flight check: verified SMTP mailbox of the organization
    try {
      await resolveOrganizationTransport(tenant.organizationId);
    } catch (transportErr) {
      const message = transportErr instanceof Error ? transportErr.message : String(transportErr);
      if (transportErr instanceof SmtpConfigurationError) {
        return NextResponse.json(
          { error: `Configurazione invio non valida o non verificata: ${message}` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Errore database durante verifica configurazione invio: ${message}` },
        { status: 500 }
      );
    }

    // Check if there are pending subscribers
    const { count: pendingCount } = await supabase
      .from('mail_newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('newsletter_id', id)
      .eq('organization_id', tenant.organizationId)
      .eq('status', 'pending');

    if (!pendingCount || pendingCount === 0) {
      return NextResponse.json(
        { error: 'Nessun destinatario in attesa. Importa una lista di iscritti prima di avviare.' },
        { status: 400 }
      );
    }

    const now = DateTime.utc();
    let newStatus: string = 'sending';
    let nextSendAt: string = now.toISO();

    // If newsletter has a future scheduled_at, keep as scheduled
    if (newsletter.scheduled_at) {
      const scheduledTime = DateTime.fromISO(newsletter.scheduled_at);
      if (scheduledTime > now) {
        newStatus = 'scheduled';
        nextSendAt = scheduledTime.toUTC().toISO() || now.toISO();
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('mail_newsletters')
      .update({
        status: newStatus,
        next_send_at: nextSendAt,
      })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
