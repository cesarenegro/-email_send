import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const SettingsSchema = z.object({
  from_name: z.string().min(1, 'Il nome mittente è obbligatorio'),
  from_email: z.string().email('Indirizzo email mittente non valido'),
  reply_to: z.string().email('Indirizzo Reply-To non valido').default('info@arkitecna.com'),
});

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: rows } = await admin.from('app_settings').select('key, value');

  const map: Record<string, string> = {};
  if (rows) {
    rows.forEach((r: any) => {
      map[r.key] = r.value;
    });
  }

  return NextResponse.json({
    from_name: map.from_name || process.env.SMTP_FROM_NAME || 'Stefano Martini | ARKITECNA',
    from_email: map.from_email || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'info@arkitecna.com',
    reply_to: map.reply_to || process.env.SMTP_REPLY_TO || map.from_email || process.env.SMTP_FROM_EMAIL || 'info@arkitecna.com',
    smtp_host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    smtp_port: process.env.SMTP_PORT || '465',
    smtp_user: process.env.SMTP_USER || 'cesare@arkitecna.com',
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = SettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Dati non validi' },
      { status: 400 }
    );
  }

  const { from_name, from_email, reply_to } = parsed.data;
  const admin = createAdminClient();

  const updates = [
    { key: 'from_name', value: from_name, updated_at: new Date().toISOString() },
    { key: 'from_email', value: from_email, updated_at: new Date().toISOString() },
    { key: 'reply_to', value: reply_to, updated_at: new Date().toISOString() },
  ];

  for (const item of updates) {
    const { error } = await admin
      .from('app_settings')
      .upsert(item, { onConflict: 'key' });

    if (error) {
      console.error('Error saving app_setting:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Impostazioni mittente aggiornate con successo!',
    settings: {
      from_name,
      from_email,
      reply_to,
    },
  });
}
