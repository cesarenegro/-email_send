import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenant, requireSettingsManager, tenantErrorResponse } from '@/lib/konta/session';
import { toPublicSenderSettings } from '@/lib/konta/sender-settings';
import { getDefaultSecretBox } from '@/lib/crypto/secret-box';
import { loadSenderSettings, buildTransporterFromPlain, SmtpConfigurationError } from '@/lib/email/transporter';
import { ALLOWED_SMTP_PORTS, validateSenderCompatibility } from '@/lib/security/ssrf';
import { checkRateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const timeField = z
  .string()
  .transform((v) => (v && v.length >= 5 ? v.slice(0, 5) : v))
  .pipe(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato ora non valido (HH:mm)'));

const SettingsSchema = z.object({
  from_name: z.string().trim().min(1, 'Nome mittente obbligatorio').max(120),
  from_email: z.string().trim().email('Email mittente non valida'),
  reply_to: z.string().trim().email('Reply-To non valido').or(z.literal('')).default(''),
  preferred_timezone: z
    .string()
    .trim()
    .refine((tz) => DateTime.now().setZone(tz).isValid, { message: 'Fuso orario non valido' })
    .default('Europe/Rome'),
  send_window_start: timeField.default('09:00'),
  send_window_end: timeField.default('18:00'),
  smtp_host: z.string().trim().max(255).default(''),
  smtp_port: z.coerce.number().int().default(465),
  smtp_user: z.string().trim().max(255).default(''),
  /** Vuota o assente = conserva la password già salvata. */
  smtp_password: z.string().max(1024).optional(),
  imap_host: z.string().trim().max(255).default(''),
  imap_port: z.coerce.number().int().min(1).max(65535).default(993),
  imap_user: z.string().trim().max(255).default(''),
  imap_password: z.string().max(1024).optional(),
});

/** Impostazioni mittente dell'organizzazione attiva (senza segreti). */
export async function GET() {
  try {
    const tenant = await requireTenant();
    const row = await loadSenderSettings(tenant.organizationId);
    return NextResponse.json({
      ...toPublicSenderSettings(tenant.organizationId, row),
      can_manage: tenant.canManageSettings,
      organization_name: tenant.organizationName,
      role: tenant.role,
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

/**
 * Salva le impostazioni mittente dell'organizzazione (solo O/A).
 * Se è presente una casella SMTP completa, la connessione viene verificata dal vivo
 * prima del salvataggio e la password è cifrata (AES-256-GCM) con la chiave dell'ecosistema.
 */
export async function PUT(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    requireSettingsManager(tenant);

    const rate = checkRateLimit(`settings_save_${tenant.organizationId}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: `Troppi salvataggi. Riprova tra ${rate.retryAfterSeconds} secondi.` }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = SettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }
    const input = parsed.data;

    const existing = await loadSenderSettings(tenant.organizationId);
    const box = getDefaultSecretBox();

    const smtpConfigured = Boolean(input.smtp_host && input.smtp_user);
    let smtpPassCiphertext = existing?.smtp_pass_ciphertext ?? null;
    let isVerified = false;
    let verifiedAt: string | null = null;

    if (smtpConfigured) {
      if (!(ALLOWED_SMTP_PORTS as readonly number[]).includes(input.smtp_port)) {
        return NextResponse.json({ error: `Porta ${input.smtp_port} non consentita (25, 465, 587, 2525).` }, { status: 400 });
      }
      try {
        validateSenderCompatibility(input.from_email, input.smtp_user);
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
      }

      let plainPassword: string | null = null;
      if (input.smtp_password && input.smtp_password.length > 0) {
        plainPassword = input.smtp_password;
      } else if (existing?.smtp_pass_ciphertext && existing.key_version === box.keyVersion) {
        plainPassword = box.decrypt(existing.smtp_pass_ciphertext);
      }
      if (!plainPassword) {
        return NextResponse.json({ error: 'Password SMTP obbligatoria per la prima configurazione.' }, { status: 400 });
      }

      try {
        const transporter = await buildTransporterFromPlain({
          host: input.smtp_host,
          port: input.smtp_port,
          user: input.smtp_user,
          pass: plainPassword,
          connectionTimeout: 8000,
          greetingTimeout: 8000,
          socketTimeout: 10000,
        });
        await transporter.verify();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `Verifica SMTP fallita: ${message}` }, { status: 400 });
      }

      smtpPassCiphertext = box.encrypt(plainPassword);
      isVerified = true;
      verifiedAt = new Date().toISOString();
    } else {
      smtpPassCiphertext = null;
    }

    let imapPassCiphertext = existing?.imap_pass_ciphertext ?? null;
    if (input.imap_password && input.imap_password.length > 0) {
      imapPassCiphertext = box.encrypt(input.imap_password);
    } else if (!input.imap_host) {
      imapPassCiphertext = null;
    }

    const admin = createAdminClient();
    const payload = {
      organization_id: tenant.organizationId,
      from_name: input.from_name,
      from_email: input.from_email.toLowerCase(),
      reply_to: (input.reply_to || input.from_email).toLowerCase(),
      preferred_timezone: input.preferred_timezone,
      send_window_start: input.send_window_start,
      send_window_end: input.send_window_end,
      smtp_host: smtpConfigured ? input.smtp_host : '',
      smtp_port: input.smtp_port,
      smtp_secure: input.smtp_port === 465,
      smtp_user: smtpConfigured ? input.smtp_user : '',
      smtp_pass_ciphertext: smtpPassCiphertext,
      imap_host: input.imap_host,
      imap_port: input.imap_port,
      imap_user: input.imap_user,
      imap_pass_ciphertext: imapPassCiphertext,
      // Casella IMAP diversa: il segnalibro della vecchia casella non vale più.
      ...(existing && (existing.imap_host !== input.imap_host || existing.imap_user !== input.imap_user)
        ? { imap_uid_validity: null, imap_last_uid: null, imap_synced_at: null }
        : {}),
      key_version: box.keyVersion,
      is_verified: isVerified,
      verified_at: verifiedAt,
      updated_by: tenant.user.id,
    };

    const { error } = await admin.from('mail_sender_settings').upsert(payload, { onConflict: 'organization_id' });
    if (error) {
      return NextResponse.json({ error: `Salvataggio fallito: ${error.message}` }, { status: 500 });
    }

    const saved = await loadSenderSettings(tenant.organizationId);
    return NextResponse.json({
      ...toPublicSenderSettings(tenant.organizationId, saved),
      can_manage: true,
      organization_name: tenant.organizationName,
      role: tenant.role,
      message: smtpConfigured ? 'Impostazioni salvate: casella SMTP verificata.' : 'Impostazioni salvate.',
    });
  } catch (err) {
    if (err instanceof SmtpConfigurationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return tenantErrorResponse(err);
  }
}
