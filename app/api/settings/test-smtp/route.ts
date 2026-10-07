import { NextResponse } from 'next/server';
import { getSmtpTransporter } from '@/lib/email/transporter';

export async function POST() {
  try {
    const transporter = getSmtpTransporter();
    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: 'Connessione SMTP verificata con successo!',
    });
  } catch (error: any) {
    console.error('SMTP test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Impossibile connettersi al server SMTP',
      },
      { status: 400 }
    );
  }
}
