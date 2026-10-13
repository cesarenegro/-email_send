import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { validateSmtpHostAndPort, createSecureSmtpTransportConfig, ALLOWED_SMTP_PORTS } from '@/lib/security/ssrf';
import { checkRateLimit } from '@/lib/security/rate-limit';

const VerifySmtpSchema = z.object({
  host: z.string().min(1, 'Host SMTP obbligatorio').max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().min(1, 'Nome utente / email obbligatorio').max(255),
  pass: z.string().min(1, 'Password obbligatoria').max(1024),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Mandatory Explicit Session Authentication
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { success: false, error: 'Autenticazione richiesta per verificare le connessioni SMTP' },
        { status: 401 }
      );
    }

    // 2. Rate Limiting Protection (Max 5 checks per minute per user)
    const rateCheck = checkRateLimit(`smtp_verify_${authUser.id}`, 5, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Troppi tentativi di verifica. Riprova tra ${rateCheck.retryAfterSeconds} secondi.`,
        },
        { status: 429 }
      );
    }

    // 3. Parse & Validate Payload
    const body = await request.json().catch(() => ({}));
    const rawPort = Number(body.port);
    const parsed = VerifySmtpSchema.safeParse({
      ...body,
      port: rawPort,
      secure: body.secure === true || body.secure === 'true' || rawPort === 465,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Dati non validi' },
        { status: 400 }
      );
    }

    const { host, port, user, pass } = parsed.data;

    // 4. Port Allowlist Check
    if (!ALLOWED_SMTP_PORTS.includes(port as any)) {
      return NextResponse.json(
        {
          success: false,
          error: `Porta ${port} non ammessa. Sono consentite esclusivamente le porte SMTP standard (25, 465, 587, 2525).`,
        },
        { status: 400 }
      );
    }

    // 5. Numeric SSRF & DNS Validation
    let target;
    try {
      target = await validateSmtpHostAndPort(host, port);
    } catch (ssrfErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: ssrfErr.message || 'Destinazione host non valida o bloccata per sicurezza.',
        },
        { status: 400 }
      );
    }

    // 6. Create Transient Transport directly connected to the validated IP (anti DNS rebinding)
    const transportConfig = createSecureSmtpTransportConfig({
      target,
      user,
      pass,
    });

    // Enforce shorter timeouts for transient interactive verification
    const verificationTransport = nodemailer.createTransport({
      ...transportConfig,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    } as any);

    // 7. Execute SMTP handshake verification
    try {
      await verificationTransport.verify();
      return NextResponse.json({
        success: true,
        message: 'Connessione e autenticazione SMTP verificate con successo!',
        host: target.host,
        port: target.port,
        validatedIp: target.validatedIp,
        user,
      });
    } catch (verifyErr: any) {
      const errStr = (verifyErr.message || '').toLowerCase();
      const code = verifyErr.code || '';
      const responseCode = verifyErr.responseCode || 0;

      let humanMessage = 'Impossibile connettersi al server SMTP.';

      if (
        responseCode === 535 ||
        errStr.includes('invalid login') ||
        errStr.includes('bad credentials') ||
        errStr.includes('username and password not accepted') ||
        code === 'EAUTH'
      ) {
        humanMessage =
          'Autenticazione fallita: nome utente o password non corretti. Se usi Gmail, Google Workspace o Yahoo, assicurati di aver generato una "Password per le app" con 2FA attivo.';
      } else if (code === 'ENOTFOUND') {
        humanMessage = `Server non trovato: l'indirizzo "${host}" non è raggiungibile.`;
      } else if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || errStr.includes('timeout')) {
        humanMessage = `Tempo di connessione scaduto verso ${host}:${port}. Verifica che la porta e il tipo di cifratura SSL/TLS corrispondano (es. 465 SSL, 587 STARTTLS).`;
      } else if (code === 'ECONNREFUSED') {
        humanMessage = `Connessione rifiutata da ${host} sulla porta ${port}.`;
      } else if (errStr.includes('self-signed') || errStr.includes('certificate')) {
        humanMessage = 'Errore di sicurezza certificato SSL/TLS del server di posta.';
      } else {
        humanMessage = `Errore di connessione: ${verifyErr.message || 'Verifica i parametri inseriti'}`;
      }

      return NextResponse.json(
        {
          success: false,
          error: humanMessage,
          code,
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Errore del server durante la verifica' },
      { status: 500 }
    );
  }
}
