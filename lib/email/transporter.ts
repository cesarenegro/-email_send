import nodemailer, { type Transporter } from 'nodemailer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateSmtpHostAndPort, createSecureSmtpTransportConfig } from '@/lib/security/ssrf';
import { getDefaultSecretBox } from '@/lib/crypto/secret-box';
import type { SenderSettings } from '@/types/database';

export interface SenderIdentity {
  fromName: string;
  fromEmail: string;
  replyTo: string;
}

export interface ResolvedTransportContext {
  transporter: Transporter;
  senderIdentity: SenderIdentity;
  organizationId: string;
}

export class SmtpConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmtpConfigurationError';
  }
}

export class SmtpDatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmtpDatabaseError';
  }
}

export const SENDER_SETTINGS_SECRET_COLUMNS =
  'id, organization_id, from_name, from_email, reply_to, preferred_timezone, send_window_start, send_window_end, ' +
  'smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_ciphertext, imap_host, imap_port, imap_user, ' +
  'imap_pass_ciphertext, imap_uid_validity, imap_last_uid, imap_synced_at, key_version, is_verified, verified_at, ' +
  'updated_by, created_at, updated_at';

/**
 * Legge le impostazioni mittente di un'organizzazione con la chiave segreta
 * (unico punto in cui i testi cifrati escono dal database). Solo lato server.
 */
export async function loadSenderSettings(
  organizationId: string,
  supabaseClient?: SupabaseClient
): Promise<SenderSettings | null> {
  const supabase = supabaseClient || createAdminClient();
  const { data, error } = await supabase
    .from('mail_sender_settings')
    .select(SENDER_SETTINGS_SECRET_COLUMNS)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error) {
    throw new SmtpDatabaseError(`Lettura impostazioni mittente fallita: ${error.message}`);
  }
  return (data as SenderSettings | null) ?? null;
}

export function senderIdentityOf(settings: SenderSettings): SenderIdentity {
  return {
    fromName: settings.from_name || settings.from_email,
    fromEmail: settings.from_email,
    replyTo: settings.reply_to || settings.from_email,
  };
}

/**
 * Risolve il trasporto SMTP verificato dell'organizzazione.
 * Nessun ripiego su credenziali di ambiente: se l'organizzazione non ha una casella
 * verificata, l'invio è rifiutato (SmtpConfigurationError).
 */
export async function resolveOrganizationTransport(
  organizationId: string,
  supabaseClient?: SupabaseClient
): Promise<ResolvedTransportContext> {
  const settings = await loadSenderSettings(organizationId, supabaseClient);
  if (!settings || !settings.smtp_host || !settings.smtp_user || !settings.smtp_pass_ciphertext) {
    throw new SmtpConfigurationError(
      'Casella SMTP non configurata per questa organizzazione. Configurala in Impostazioni prima di inviare.'
    );
  }
  if (!settings.from_email) {
    throw new SmtpConfigurationError('Indirizzo mittente mancante nelle impostazioni dell’organizzazione.');
  }
  if (!settings.is_verified) {
    throw new SmtpConfigurationError('La casella SMTP dell’organizzazione non è stata verificata. Esegui il test in Impostazioni.');
  }

  const transporter = await buildTransporterFromSettings(settings);
  return {
    transporter,
    senderIdentity: senderIdentityOf(settings),
    organizationId,
  };
}

/**
 * Costruisce un trasporto Nodemailer dalle impostazioni (decifratura server-side,
 * controllo SSRF numerico e IP pinning anti-rebinding con SNI preservato).
 */
export async function buildTransporterFromSettings(
  settings: Pick<SenderSettings, 'smtp_host' | 'smtp_port' | 'smtp_user' | 'smtp_pass_ciphertext' | 'key_version'>,
  overrides?: { connectionTimeout?: number; greetingTimeout?: number; socketTimeout?: number }
): Promise<Transporter> {
  const box = getDefaultSecretBox();
  if (settings.key_version !== box.keyVersion) {
    throw new SmtpConfigurationError(`Credenziali cifrate con key_version ${settings.key_version}, chiave attuale v${box.keyVersion}.`);
  }
  let pass: string;
  try {
    pass = box.decrypt(settings.smtp_pass_ciphertext || '');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new SmtpConfigurationError(`Impossibile decifrare la password SMTP: ${message}`);
  }
  return buildTransporterFromPlain({
    host: settings.smtp_host,
    port: Number(settings.smtp_port),
    user: settings.smtp_user,
    pass,
    ...overrides,
  });
}

export async function buildTransporterFromPlain(input: {
  host: string;
  port: number;
  user: string;
  pass: string;
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
}): Promise<Transporter> {
  const target = await validateSmtpHostAndPort(input.host, input.port);
  const transportConfig = createSecureSmtpTransportConfig({ target, user: input.user, pass: input.pass });
  return nodemailer.createTransport({
    ...transportConfig,
    ...(input.connectionTimeout ? { connectionTimeout: input.connectionTimeout } : {}),
    ...(input.greetingTimeout ? { greetingTimeout: input.greetingTimeout } : {}),
    ...(input.socketTimeout ? { socketTimeout: input.socketTimeout } : {}),
  } as Parameters<typeof nodemailer.createTransport>[0]);
}
