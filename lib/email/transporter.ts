import nodemailer, { type Transporter } from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateSmtpHostAndPort, createSecureSmtpTransportConfig } from '@/lib/security/ssrf';
import { decryptSecret } from '@/lib/crypto/encryption';

export interface SmtpTransporterOptions {
  userId?: string | null;
  smtpConnectionId?: string | null;
  allowAdminFallback?: boolean;
  supabaseClient?: any;
}

export interface SenderIdentity {
  fromName: string;
  fromEmail: string;
  replyTo: string;
}

export interface ResolvedTransportContext {
  transporter: Transporter;
  senderIdentity: SenderIdentity;
  connectionId: string | null;
  isExplicitAdmin: boolean;
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

const PRIMARY_ADMIN_EMAIL = 'cesare@arkitecna.com';

/**
 * Resolves the authorized SMTP connection and sender identity in a single atomic lookup.
 * Eliminates duplicate database queries, guarantees 100% consistency between transporter and From identity,
 * enforces strict tenant isolation, and ensures that admin configuration is ONLY used when explicitly requested.
 */
export async function resolveAuthorizedTransportContext(
  options?: SmtpTransporterOptions
): Promise<ResolvedTransportContext> {
  const { userId, smtpConnectionId, allowAdminFallback, supabaseClient } = options || {};
  const supabase = supabaseClient || createAdminClient();

  // Case 1: An explicit connection ID was requested
  if (smtpConnectionId) {
    if (!userId) {
      throw new SmtpConfigurationError('Impossibile verificare la proprietà della connessione SMTP: userId non fornito.');
    }

    const { data: connection, error: connError } = await supabase
      .from('smtp_connections')
      .select('*')
      .eq('id', smtpConnectionId)
      .maybeSingle();

    if (connError) {
      throw new SmtpDatabaseError(`Connessione SMTP "${smtpConnectionId}" non accessibile o errore database: ${connError.message}`);
    }

    if (!connection) {
      throw new SmtpConfigurationError(`Connessione SMTP "${smtpConnectionId}" non trovata.`);
    }

    // STRICT TENANT ISOLATION: verify connection ownership
    if (connection.user_id !== userId) {
      throw new SmtpConfigurationError('Violazione di sicurezza: tentativo di utilizzare una connessione SMTP appartenente a un altro utente.');
    }

    if (!connection.is_verified) {
      throw new SmtpConfigurationError('La connessione SMTP selezionata non è stata verificata con successo.');
    }

    const transporter = await buildTransporterFromConnection(connection);
    const senderIdentity: SenderIdentity = {
      fromName: connection.from_name,
      fromEmail: connection.from_email,
      replyTo: connection.reply_to || connection.from_email,
    };

    return {
      transporter,
      senderIdentity,
      connectionId: connection.id,
      isExplicitAdmin: false,
    };
  }

  // Case 2: No specific connection ID, but a user ID is provided
  if (userId) {
    // Check if user is primary admin
    const { data: authUserData } = await supabase.auth.admin.getUserById(userId);
    const isPrimaryAdminUser = authUserData?.user?.email === PRIMARY_ADMIN_EMAIL;

    // Search for user's latest verified connection
    try {
      const { data: userConns, error: listError } = await supabase
        .from('smtp_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_verified', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (listError) {
        throw new SmtpDatabaseError(`Errore durante la lettura delle connessioni SMTP: ${listError.message}`);
      }

      if (userConns && userConns.length > 0) {
        const connection = userConns[0];
        const transporter = await buildTransporterFromConnection(connection);
        const senderIdentity: SenderIdentity = {
          fromName: connection.from_name,
          fromEmail: connection.from_email,
          replyTo: connection.reply_to || connection.from_email,
        };

        return {
          transporter,
          senderIdentity,
          connectionId: connection.id,
          isExplicitAdmin: false,
        };
      }
    } catch (dbErr: any) {
      if (dbErr instanceof SmtpDatabaseError) throw dbErr;
      throw new SmtpDatabaseError(`Errore durante la verifica delle connessioni SMTP dell'utente: ${dbErr.message}`);
    }

    // Standard user has NO verified connection -> HARD BLOCK (ZERO FALLBACK)
    // Even if isPrimaryAdminUser is true, require EXPLICIT allowAdminFallback === true
    if (isPrimaryAdminUser && allowAdminFallback === true) {
      const transporter = buildAdminTransporter();
      const senderIdentity = await resolveAdminSenderIdentity(supabase, userId);
      return {
        transporter,
        senderIdentity,
        connectionId: null,
        isExplicitAdmin: true,
      };
    }

    throw new SmtpConfigurationError(
      'Nessuna configurazione SMTP verificata trovata per questo account utente. ' +
      "L'invio è bloccato per garantire l'isolamento della casella mittente. " +
      'Configura e verifica una casella SMTP personale prima di inviare.'
    );
  }

  // Case 3: No userId provided (system cron or maintenance task)
  if (allowAdminFallback === true) {
    const transporter = buildAdminTransporter();
    const senderIdentity = await resolveAdminSenderIdentity(supabase, null);
    return {
      transporter,
      senderIdentity,
      connectionId: null,
      isExplicitAdmin: true,
    };
  }

  throw new SmtpConfigurationError(
    'Richiesta di trasporto SMTP priva di utente o di autorizzazione esplicita. Invio rifiutato.'
  );
}

/**
 * Builds a secure Nodemailer transport from a verified database connection row,
 * applying server-side decryption, numeric SSRF checks, and direct socket IP pinning.
 */
async function buildTransporterFromConnection(connection: any) {
  const host = connection.host;
  const port = Number(connection.port);
  const user = connection.username;

  // 1. Decrypt password server-side
  let pass: string;
  try {
    pass = decryptSecret(connection.encrypted_password);
  } catch (decErr: any) {
    throw new Error(`Impossibile decifrare la password della casella SMTP: ${decErr.message}`);
  }

  // 2. Numeric SSRF check & IP pinning
  const target = await validateSmtpHostAndPort(host, port);

  // 3. Create transport pinned directly to validatedIp (anti-rebinding) with TLS SNI preserved
  const transportConfig = createSecureSmtpTransportConfig({
    target,
    user,
    pass,
  });

  return nodemailer.createTransport(transportConfig as any);
}

/**
 * Builds the explicit admin transporter from environment variables.
 * ONLY callable when allowAdminFallback is explicitly granted, never as implicit fallback.
 */
function buildAdminTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = Number(process.env.SMTP_PORT || '465');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    throw new Error('Credenziali SMTP amministratore non configurate nelle variabili di ambiente.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  } as any);
}

/**
 * Resolves sender identity for explicit admin / system tasks.
 */
async function resolveAdminSenderIdentity(supabase: any, adminUserId?: string | null): Promise<SenderIdentity> {
  if (adminUserId) {
    const { data: userSet } = await supabase
      .from('user_settings')
      .select('from_name, from_email, reply_to')
      .eq('user_id', adminUserId)
      .maybeSingle();

    if (userSet && userSet.from_email) {
      return {
        fromName: userSet.from_name || 'Stefano Martini | ARKITECNA',
        fromEmail: userSet.from_email,
        replyTo: userSet.reply_to || userSet.from_email,
      };
    }
  }

  return {
    fromName: process.env.SMTP_FROM_NAME || 'Stefano Martini | ARKITECNA',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || PRIMARY_ADMIN_EMAIL,
    replyTo: process.env.SMTP_REPLY_TO || PRIMARY_ADMIN_EMAIL,
  };
}

/**
 * Convenience wrapper returning only the transporter.
 */
export async function getSmtpTransporter(options?: SmtpTransporterOptions): Promise<Transporter> {
  const ctx = await resolveAuthorizedTransportContext(options);
  return ctx.transporter;
}

/**
 * Convenience wrapper returning only the sender identity.
 */
export async function getSenderIdentity(
  userId?: string | null,
  smtpConnectionId?: string | null,
  allowAdminFallback?: boolean
): Promise<SenderIdentity> {
  const ctx = await resolveAuthorizedTransportContext({
    userId,
    smtpConnectionId,
    allowAdminFallback,
  });
  return ctx.senderIdentity;
}
