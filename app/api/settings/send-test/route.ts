import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/send-email';
import { isValidEmail } from '@/lib/csv/validate-lead';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to } = body;

    if (!to || !isValidEmail(to)) {
      return NextResponse.json(
        { error: 'Indirizzo email di test non valido' },
        { status: 400 }
      );
    }

    const testSubject = '[ARKITECNA MAILER] Test di invio SMTP';
    const testHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1A1A1E;">
        <h2 style="color: #1A1A1E;">Test SMTP Confermato</h2>
        <p>Questo messaggio conferma che il server SMTP Hostinger è configurato e funzionante correttamente.</p>
        <hr style="border: none; border-top: 1px solid #D8D2C8; margin: 20px 0;" />
        <p style="color: #666666; font-size: 13px;">Inviato da ARKITECNA MAILER alle ${new Date().toISOString()}</p>
      </div>
    `;

    const result = await sendEmail({
      to,
      subject: testSubject,
      html: testHtml,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: `Email di test inviata con successo a ${to}!`,
    });
  } catch (error: any) {
    console.error('Send test email error:', error);
    return NextResponse.json(
      { error: error.message || "Errore durante l'invio dell'email di test" },
      { status: 500 }
    );
  }
}
