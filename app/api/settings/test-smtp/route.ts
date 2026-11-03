import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenant, requireSettingsManager, tenantErrorResponse } from '@/lib/konta/session';
import { loadSenderSettings, buildTransporterFromSettings, SmtpConfigurationError } from '@/lib/email/transporter';
import { checkRateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Test di connessione SMTP reale con la casella salvata dell'organizzazione
 * (handshake e autenticazione). Aggiorna is_verified / verified_at.
 */
export async function POST() {
  try {
    const tenant = await requireTenant();
    requireSettingsManager(tenant);

    const rate = checkRateLimit(`smtp_test_${tenant.organizationId}`, 5, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ success: false, error: `Troppi test. Riprova tra ${rate.retryAfterSeconds} secondi.` }, { status: 429 });
    }

    const settings = await loadSenderSettings(tenant.organizationId);
    if (!settings || !settings.smtp_host || !settings.smtp_user || !settings.smtp_pass_ciphertext) {
      return NextResponse.json({ success: false, error: 'Casella SMTP non configurata.' }, { status: 400 });
    }

    const admin = createAdminClient();
    try {
      const transporter = await buildTransporterFromSettings(settings, {
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      });
      await transporter.verify();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await admin
        .from('mail_sender_settings')
        .update({ is_verified: false })
        .eq('organization_id', tenant.organizationId);
      const status = err instanceof SmtpConfigurationError ? 400 : 400;
      return NextResponse.json({ success: false, error: humanizeSmtpError(message, settings.smtp_host, settings.smtp_port) }, { status });
    }

    const verifiedAt = new Date().toISOString();
    await admin
      .from('mail_sender_settings')
      .update({ is_verified: true, verified_at: verifiedAt })
      .eq('organization_id', tenant.organizationId);

    return NextResponse.json({ success: true, verified_at: verifiedAt, message: 'Connessione SMTP verificata.' });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

function humanizeSmtpError(message: string, host: string, port: number): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('bad credentials') || lower.includes('535') || lower.includes('eauth')) {
    return 'Autenticazione rifiutata: controlla utente e password (per Gmail/Workspace serve una password per le app).';
  }
  if (lower.includes('enotfound')) return `Server "${host}" non trovato.`;
  if (lower.includes('timeout') || lower.includes('etimedout') || lower.includes('econnreset')) {
    return `Nessuna risposta da ${host}:${port}. Verifica porta e cifratura (465 SSL, 587 STARTTLS).`;
  }
  if (lower.includes('econnrefused')) return `Connessione rifiutata da ${host}:${port}.`;
  if (lower.includes('certificate') || lower.includes('self-signed')) return 'Certificato TLS del server non valido.';
  return `Connessione fallita: ${message}`;
}
