import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSmtpTransporter } from '@/lib/email/transporter';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { smtp_connection_id } = body;

    const isPrimaryAdmin = user.email === 'cesare@arkitecna.com';
    const transporter = await getSmtpTransporter({
      userId: user.id,
      smtpConnectionId: smtp_connection_id || null,
      allowAdminFallback: isPrimaryAdmin,
    });
    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: 'Connessione SMTP verificata con successo per il tuo account!',
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
