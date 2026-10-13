import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  validateSmtpHostAndPort,
  createSecureSmtpTransportConfig,
  validateSenderCompatibility,
  ALLOWED_SMTP_PORTS,
} from '@/lib/security/ssrf';
import { encryptSecret } from '@/lib/crypto/encryption';
import { checkRateLimit } from '@/lib/security/rate-limit';

const CreateConnectionSchema = z.object({
  name: z.string().min(1, 'Nome connessione obbligatorio').max(100).default('Casella Principale'),
  host: z.string().min(1, 'Host SMTP obbligatorio').max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().min(1, 'Nome utente SMTP obbligatorio').max(255),
  password: z.string().min(1, 'Password SMTP obbligatoria').max(1024),
  from_name: z.string().min(1, 'Nome mittente obbligatorio').max(100),
  from_email: z.string().email('Indirizzo email mittente non valido'),
  reply_to: z.string().email('Indirizzo Reply-To non valido').optional(),
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

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('smtp_connections')
      .select('id, name, host, port, secure, username, from_name, from_email, reply_to, is_verified, verified_at, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message.includes('Could not find the table') || error.code === '42P01') {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  // 1. Rate Limiting Protection (Max 5 creation attempts per minute)
  const rateCheck = checkRateLimit(`smtp_save_${user.id}`, 5, 60000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Troppi tentativi di configurazione. Riprova tra ${rateCheck.retryAfterSeconds} secondi.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const rawPort = Number(body.port);
  const parsed = CreateConnectionSchema.safeParse({
    ...body,
    port: rawPort,
    secure: body.secure === true || body.secure === 'true' || rawPort === 465,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Dati non validi' },
      { status: 400 }
    );
  }

  const {
    name,
    host,
    port,
    username,
    password,
    from_name,
    from_email,
    reply_to,
  } = parsed.data;

  // 2. Port allowlist check
  if (!ALLOWED_SMTP_PORTS.includes(port as any)) {
    return NextResponse.json(
      { error: `Porta ${port} non consentita. Consentite: 25, 465, 587, 2525.` },
      { status: 400 }
    );
  }

  // 3. Sender compatibility validation (enforce From matches authenticated mailbox)
  try {
    validateSenderCompatibility(from_email, username);
  } catch (compatErr: any) {
    return NextResponse.json({ error: compatErr.message }, { status: 400 });
  }

  // 4. Numeric SSRF check & IP Pinning
  let target;
  try {
    target = await validateSmtpHostAndPort(host, port);
  } catch (ssrfErr: any) {
    return NextResponse.json({ error: ssrfErr.message }, { status: 400 });
  }

  // 5. Verify connection before storing using direct IP socket
  const transportConfig = createSecureSmtpTransportConfig({
    target,
    user: username,
    pass: password,
  });

  const testTransporter = nodemailer.createTransport({
    ...transportConfig,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  } as any);

  try {
    await testTransporter.verify();
  } catch (verifyErr: any) {
    return NextResponse.json(
      {
        error: `Verifica SMTP fallita con ${host}:${port}. Controlla username e password: ${verifyErr.message}`,
      },
      { status: 400 }
    );
  }

  // 6. Encrypt password server-side with AES-256-GCM
  let encryptedPassword;
  try {
    encryptedPassword = encryptSecret(password);
  } catch (encErr: any) {
    return NextResponse.json(
      { error: `Errore cifratura credenziali: ${encErr.message}` },
      { status: 500 }
    );
  }

  // 7. Save connection via service_role
  const admin = createAdminClient();
  const insertPayload = {
    user_id: user.id,
    name,
    host: target.host,
    port: target.port,
    secure: target.port === 465,
    username,
    encrypted_password: encryptedPassword,
    from_name,
    from_email,
    reply_to: reply_to || from_email,
    is_verified: true,
    verified_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from('smtp_connections')
    .insert([insertPayload])
    .select('id, name, host, port, secure, username, from_name, from_email, reply_to, is_verified, verified_at, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
