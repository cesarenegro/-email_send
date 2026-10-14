import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const SettingsSchema = z.object({
  from_name: z.string().min(1, 'Il nome mittente è obbligatorio'),
  from_email: z.string().email('Indirizzo email mittente non valido'),
  reply_to: z.string().email('Indirizzo Reply-To non valido').default('cesare@arkitecna.com'),
  preferred_timezone: z.string().optional(),
  send_window_start: z.string().optional(),
  send_window_end: z.string().optional(),
  onboarding_completed: z.boolean().optional(),
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

  // 1. Try to fetch user-specific settings
  const { data: userSet } = await admin
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  // 2. Fetch global app_settings for fallback
  const { data: rows } = await admin.from('app_settings').select('key, value');
  const map: Record<string, string> = {};
  if (rows) {
    rows.forEach((r: any) => {
      map[r.key] = r.value;
    });
  }

  const isPrimaryAdmin = user.email === 'cesare@arkitecna.com';
  const defaultUserDisplayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Utente';

  // 3. Fetch user-specific SMTP connections
  const { data: conns } = await admin
    .from('smtp_connections')
    .select('id, name, host, port, secure, username, from_name, from_email, reply_to, is_verified, verified_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const activeConn = conns?.find((c) => c.is_verified) || conns?.[0] || null;

  return NextResponse.json({
    from_name: userSet?.from_name || (isPrimaryAdmin ? (map.from_name || process.env.SMTP_FROM_NAME || 'Stefano Martini | ARKITECNA') : defaultUserDisplayName),
    from_email: userSet?.from_email || (isPrimaryAdmin ? (map.from_email || process.env.SMTP_FROM_EMAIL || 'cesare@arkitecna.com') : user.email),
    reply_to: userSet?.reply_to || (isPrimaryAdmin ? (map.reply_to || map.from_email || 'cesare@arkitecna.com') : user.email),
    preferred_timezone: userSet?.preferred_timezone || 'Europe/Rome',
    send_window_start: userSet?.send_window_start || '09:00',
    send_window_end: userSet?.send_window_end || '18:00',
    onboarding_completed: userSet?.onboarding_completed ?? isPrimaryAdmin,
    smtp_host: activeConn?.host || (isPrimaryAdmin ? (process.env.SMTP_HOST || 'smtp.hostinger.com') : ''),
    smtp_port: activeConn?.port ? String(activeConn.port) : (isPrimaryAdmin ? (process.env.SMTP_PORT || '465') : '465'),
    smtp_user: activeConn?.username || (isPrimaryAdmin ? (process.env.SMTP_USER || 'cesare@arkitecna.com') : ''),
    smtp_connections: conns || [],
    active_connection: activeConn,
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

  const {
    from_name,
    from_email,
    reply_to,
    preferred_timezone,
    send_window_start,
    send_window_end,
    onboarding_completed,
  } = parsed.data;

  const admin = createAdminClient();

  // 1. Save or update user_settings
  const userPayload: Record<string, any> = {
    user_id: user.id,
    from_name,
    from_email,
    reply_to,
    updated_at: new Date().toISOString(),
  };

  if (preferred_timezone !== undefined) userPayload.preferred_timezone = preferred_timezone;
  if (send_window_start !== undefined) userPayload.send_window_start = send_window_start.slice(0, 5);
  if (send_window_end !== undefined) userPayload.send_window_end = send_window_end.slice(0, 5);
  if (onboarding_completed !== undefined) userPayload.onboarding_completed = onboarding_completed;

  const { error: userError } = await admin
    .from('user_settings')
    .upsert(userPayload, { onConflict: 'user_id' });

  if (userError) {
    console.error('Error saving user_settings:', userError);
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  // 2. If master admin, also sync global app_settings
  if (user.email === 'cesare@arkitecna.com') {
    const globalUpdates = [
      { key: 'from_name', value: from_name, updated_at: new Date().toISOString() },
      { key: 'from_email', value: from_email, updated_at: new Date().toISOString() },
      { key: 'reply_to', value: reply_to, updated_at: new Date().toISOString() },
    ];
    for (const item of globalUpdates) {
      await admin.from('app_settings').upsert(item, { onConflict: 'key' });
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Impostazioni mittente aggiornate con successo!',
    settings: {
      from_name,
      from_email,
      reply_to,
      preferred_timezone,
      onboarding_completed,
    },
  });
}
