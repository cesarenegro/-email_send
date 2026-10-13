import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSmtpTransporter } from '@/lib/email/transporter';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const transporter = await getSmtpTransporter({ userId: user.id });
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
