import { NextRequest, NextResponse } from 'next/server';
import { requireTenant, requireSettingsManager, tenantErrorResponse } from '@/lib/konta/session';
import { sendEmail } from '@/lib/email/send-email';
import { isValidEmail } from '@/lib/csv/validate-lead';
import { checkRateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

/** Invia una email di prova con la casella SMTP verificata dell'organizzazione. */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    requireSettingsManager(tenant);

    const rate = checkRateLimit(`smtp_send_test_${tenant.organizationId}`, 3, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: `Troppi invii di prova. Riprova tra ${rate.retryAfterSeconds} secondi.` }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const to = typeof body?.to === 'string' ? body.to.trim() : '';
    if (!to || !isValidEmail(to)) {
      return NextResponse.json({ error: 'Indirizzo di prova non valido.' }, { status: 400 });
    }

    const result = await sendEmail({
      to,
      subject: '[MAIL-K] Email di prova',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1b1c1a;">
          <p>Questa email conferma che la casella SMTP di <strong>${escapeHtml(tenant.organizationName)}</strong> è configurata e funzionante.</p>
          <p style="color:#5c5e63;font-size:13px;">Inviata da MAIL-K il ${new Date().toISOString()}</p>
        </div>`,
      organizationId: tenant.organizationId,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      fromEmail: result.fromEmail,
      message: `Email di prova inviata da ${result.fromEmail} a ${to}.`,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'SmtpConfigurationError') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return tenantErrorResponse(err);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c);
}
