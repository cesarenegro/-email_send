import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send-email';
import { isValidEmail } from '@/lib/csv/validate-lead';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { to, smtp_connection_id } = body;

    if (!to || !isValidEmail(to)) {
      return NextResponse.json(
        { error: 'Indirizzo email di test non valido' },
        { status: 400 }
      );
    }

    const testSubject = '[MAIL-K] Test di invio SMTP verificato';
    const testHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1A1A1E;">
        <h2 style="color: #1A1A1E;">Test SMTP Confermato</h2>
        <p>Questo messaggio conferma che il server SMTP per il tuo account è configurato e funzionante con successo.</p>
        <hr style="border: none; border-top: 1px solid #D8D2C8; margin: 20px 0;" />
        <p style="color: #666666; font-size: 13px;">Inviato da MAIL-K per l'account ${user.email} alle ${new Date().toISOString()}</p>
      </div>
    `;

    // Strictly isolated send: uses user's verified SMTP connection, zero fallback to admin credentials
    const result = await sendEmail({
      to,
      subject: testSubject,
      html: testHtml,
      userId: user.id,
      smtpConnectionId: smtp_connection_id || null,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      fromEmail: result.fromEmail,
      message: `Email di test inviata con successo da ${result.fromEmail} a ${to}!`,
    });
  } catch (error: any) {
    console.error('Send test email error:', error);
    return NextResponse.json(
      { error: error.message || "Errore durante l'invio dell'email di test" },
      { status: 400 }
    );
  }
}
