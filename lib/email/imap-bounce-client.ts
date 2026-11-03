import dns from 'node:dns';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { SupabaseClient } from '@supabase/supabase-js';
import { parseBounceContent } from './bounce-parser';
import { loadSenderSettings } from '@/lib/email/transporter';
import { getDefaultSecretBox } from '@/lib/crypto/secret-box';
import { isPrivateOrReservedIp } from '@/lib/security/ssrf';
import type { SenderSettings } from '@/types/database';

export interface BounceSyncOptions {
  campaignId?: string;
  limitMessages?: number;
}

export interface BounceSyncResult {
  success: boolean;
  bouncesDetected: number;
  leadsUpdated: number;
  updatedLeads: Array<{
    email: string;
    campaign_id: string;
    lead_id: string;
    reason: string;
  }>;
  errors: string[];
  /** 'incremental' = solo messaggi nuovi dopo il segnalibro; 'window' = ultimi N messaggi. */
  mode: 'incremental' | 'window';
  /** Messaggi esaminati (intestazioni) in questa lettura. */
  messagesScanned: number;
}

/** Massimo di messaggi nuovi esaminati in una sola lettura incrementale. */
const MAX_NEW_MESSAGES = 500;

export interface OrganizationImapConfig {
  /** Nome host configurato dall'organizzazione (usato per SNI e verifica del certificato). */
  host: string;
  /** IP pubblico verificato a cui connettere il socket (anti DNS rebinding). */
  connectIp: string;
  port: number;
  user: string;
  pass: string;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Verifica che l'host IMAP dell'organizzazione risolva solo verso indirizzi pubblici
 * (stessa politica SSRF del trasporto SMTP) e restituisce l'IP a cui connettersi.
 */
async function resolvePublicImapIp(rawHost: string): Promise<string> {
  const host = rawHost.trim().toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localdomain') ||
    host.includes('metadata.google')
  ) {
    throw new Error(`Host IMAP "${rawHost}" non consentito: destinazione locale o riservata.`);
  }

  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(host, { all: true });
  } catch (err) {
    throw new Error(`Impossibile risolvere l'host IMAP "${rawHost}": ${errorMessage(err)}`);
  }
  if (!addresses || addresses.length === 0) {
    throw new Error(`Nessun indirizzo IP associato all'host IMAP "${rawHost}".`);
  }
  for (const addr of addresses) {
    if (isPrivateOrReservedIp(addr.address)) {
      throw new Error(
        `Host IMAP "${rawHost}" risolto verso un indirizzo IP non consentito (${addr.address}). Connessione bloccata per protezione SSRF.`
      );
    }
  }
  return addresses[0].address;
}

/**
 * Ricava la configurazione IMAP di un'organizzazione dalle impostazioni mittente:
 * host/porta IMAP; credenziali IMAP se entrambe presenti, altrimenti ripiego su quelle SMTP.
 * Le password sono decifrate solo qui, lato server.
 */
export async function resolveOrganizationImapConfig(
  settings: SenderSettings | null
): Promise<OrganizationImapConfig> {
  const host = settings?.imap_host?.trim() || '';
  if (!settings || !host) {
    throw new Error('Casella IMAP non configurata per questa organizzazione.');
  }

  let user: string;
  let ciphertext: string;
  if (settings.imap_user?.trim() && settings.imap_pass_ciphertext) {
    user = settings.imap_user.trim();
    ciphertext = settings.imap_pass_ciphertext;
  } else if (settings.smtp_user?.trim() && settings.smtp_pass_ciphertext) {
    user = settings.smtp_user.trim();
    ciphertext = settings.smtp_pass_ciphertext;
  } else {
    throw new Error('Credenziali IMAP non configurate per questa organizzazione (utente o password mancanti).');
  }

  const box = getDefaultSecretBox();
  if (settings.key_version !== box.keyVersion) {
    throw new Error(
      `Credenziali cifrate con key_version ${settings.key_version}, chiave attuale v${box.keyVersion}. Reinserisci la password in Impostazioni.`
    );
  }

  let pass: string;
  try {
    pass = box.decrypt(ciphertext);
  } catch (err) {
    throw new Error(`Impossibile decifrare la password della casella IMAP: ${errorMessage(err)}`);
  }

  const connectIp = await resolvePublicImapIp(host);

  return {
    host,
    connectIp,
    port: Number(settings.imap_port) || 993,
    user,
    pass,
  };
}

/** Client ImapFlow TLS verso l'IP verificato, con SNI e verifica del certificato sul nome host. */
export function createOrganizationImapClient(
  config: OrganizationImapConfig,
  timeoutMs = 15000
): ImapFlow {
  return new ImapFlow({
    host: config.connectIp,
    port: config.port,
    secure: true,
    servername: config.host,
    tls: {
      servername: config.host,
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
    auth: { user: config.user, pass: config.pass },
    logger: false,
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
  });
}

export async function syncBouncesFromImap(
  adminClient: SupabaseClient,
  organizationId: string,
  options: BounceSyncOptions = {}
): Promise<BounceSyncResult> {
  const settings = await loadSenderSettings(organizationId, adminClient);
  const imapConfig = await resolveOrganizationImapConfig(settings);

  const result: BounceSyncResult = {
    success: true,
    bouncesDetected: 0,
    leadsUpdated: 0,
    updatedLeads: [],
    errors: [],
    mode: 'window',
    messagesScanned: 0,
  };

  const client = createOrganizationImapClient(imapConfig, 15000);

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX', { readOnly: true });

    try {
      // Guardia difensiva: la protezione di \Seen si basa sull'apertura in sola lettura (EXAMINE)
      // e sul recupero dei contenuti tramite BODY.PEEK[], senza alterare flag o marcare le email come lette.
      // Procedi solo se la libreria conferma che la casella è aperta in modalità read-only.
      // Questa verifica riduce i rischi applicativi lato client senza garantire in modo assoluto
      // il comportamento di server IMAP remoti o configurazioni esterne.
      if (!client.mailbox || client.mailbox.readOnly !== true) {
        throw new Error('Accesso IMAP non confermato in modalità read-only: sincronizzazione interrotta per sicurezza.');
      }

      // Segnalibro: con UIDVALIDITY invariata si leggono solo i messaggi con UID > ultimo esaminato.
      // La lettura limitata a una campagna non usa né sposta il segnalibro.
      const mailbox = client.mailbox;
      const uidValidity = mailbox && mailbox.uidValidity != null ? Number(mailbox.uidValidity) : null;
      const highestUid = mailbox && typeof mailbox.uidNext === 'number' ? mailbox.uidNext - 1 : null;
      const useCursor = !options.campaignId && uidValidity !== null && highestUid !== null;
      const cursorValid =
        useCursor &&
        settings?.imap_uid_validity != null &&
        Number(settings.imap_uid_validity) === uidValidity &&
        settings?.imap_last_uid != null;

      let range: string | null = null;
      let rangeIsUid = false;
      if (cursorValid) {
        result.mode = 'incremental';
        const last = Number(settings!.imap_last_uid);
        if (highestUid! > last) {
          const from = Math.max(last + 1, highestUid! - MAX_NEW_MESSAGES + 1);
          range = `${from}:${highestUid}`;
          rangeIsUid = true;
          if (highestUid! - last > MAX_NEW_MESSAGES) {
            result.errors.push(`Più di ${MAX_NEW_MESSAGES} messaggi nuovi: esaminati solo i più recenti.`);
          }
        }
      } else {
        const status = await client.status('INBOX', { messages: true });
        const totalMessages = status && typeof status.messages === 'number' ? status.messages : 0;
        if (totalMessages > 0) {
          const windowSize = options.limitMessages || 100;
          range = `${Math.max(1, totalMessages - windowSize + 1)}:${totalMessages}`;
        }
      }

      // 1. Intestazioni dei soli messaggi da esaminare, per trovare i possibili rimbalzi
      const candidateUids: number[] = [];
      if (range) {
        for await (const msg of client.fetch(range, { uid: true, envelope: true }, { uid: rangeIsUid })) {
          result.messagesScanned++;
          if (rangeIsUid && settings?.imap_last_uid != null && msg.uid <= Number(settings.imap_last_uid)) continue;
          const fromAddr = (msg.envelope?.from?.[0]?.address || '').toLowerCase();
          const fromName = (msg.envelope?.from?.[0]?.name || '').toLowerCase();
          const subject = (msg.envelope?.subject || '').toLowerCase();

          const isBounceSender =
            fromAddr.includes('mailer-daemon') ||
            fromAddr.includes('postmaster') ||
            fromName.includes('mail delivery');

          const isBounceSubject =
            subject.includes('undelivered') ||
            subject.includes('undeliverable') ||
            subject.includes('delivery status') ||
            subject.includes('mail delivery failed') ||
            subject.includes('failure notice') ||
            subject.includes('returned to sender');

          if (isBounceSender || isBounceSubject) {
            candidateUids.push(msg.uid);
          }
        }
      }

      // 2. Inspect candidate bounce messages
      for (const uid of candidateUids) {
        try {
          // Download del messaggio completo: con { source: true } ImapFlow richiede BODY.PEEK[],
          // preservando lo stato \Seen delle email analizzate.
          const fullMsg = await client.fetchOne(uid.toString(), {
            source: true,
          }, { uid: true });

          if (!fullMsg || !fullMsg.source) continue;

          const parsed = await simpleParser(fullMsg.source);

          // Aggregate text from message body and attachments (like delivery-status reports)
          let combinedText = parsed.text || '';
          if (parsed.attachments && parsed.attachments.length > 0) {
            for (const att of parsed.attachments) {
              if (att.content) {
                const attText = att.content.toString('utf-8');
                combinedText += `\n--- ATTACHMENT ---\n${attText}`;
              }
            }
          }

          const bounceInfo = parseBounceContent(combinedText);
          if (!bounceInfo || !bounceInfo.email) continue;

          result.bouncesDetected++;

          // 3. Find matching lead in database (only inside this organization)
          let query = adminClient
            .from('mail_campaign_leads')
            .select('id, campaign_id, email, status, last_error')
            .eq('organization_id', organizationId)
            .eq('email', bounceInfo.email);

          if (options.campaignId) {
            query = query.eq('campaign_id', options.campaignId);
          }

          const { data: matchedLeads, error: leadFindErr } = await query;

          if (leadFindErr) {
            result.errors.push(`Errore DB query per ${bounceInfo.email}: ${leadFindErr.message}`);
            continue;
          }

          if (!matchedLeads || matchedLeads.length === 0) {
            continue;
          }

          // 4. Update each matched lead to 'failed' with the bounce reason
          for (const lead of matchedLeads as Array<{
            id: string;
            campaign_id: string;
            email: string;
            status: string;
            last_error: string | null;
          }>) {
            // Only update if not already marked with this bounce error
            const formattedError = `Bounce: ${bounceInfo.reason}`;
            if (lead.status === 'failed' && lead.last_error === formattedError) {
              continue;
            }

            const { error: updateErr } = await adminClient
              .from('mail_campaign_leads')
              .update({
                status: 'failed',
                last_error: formattedError,
              })
              .eq('id', lead.id)
              .eq('organization_id', organizationId);

            if (updateErr) {
              result.errors.push(`Errore aggiornamento lead ${lead.id}: ${updateErr.message}`);
            } else {
              result.leadsUpdated++;
              result.updatedLeads.push({
                email: lead.email,
                campaign_id: lead.campaign_id,
                lead_id: lead.id,
                reason: formattedError,
              });

              // Log error event in mail_email_logs
              const { error: logErr } = await adminClient.from('mail_email_logs').insert({
                organization_id: organizationId,
                campaign_id: lead.campaign_id,
                campaign_lead_id: lead.id,
                event_type: 'error',
                error_message: formattedError,
              });
              if (logErr) {
                result.errors.push(`Errore registrazione log per lead ${lead.id}: ${logErr.message}`);
              }

              // Record the bounce
              const { error: bounceErr } = await adminClient.from('mail_bounces').insert({
                organization_id: organizationId,
                campaign_id: lead.campaign_id,
                campaign_lead_id: lead.id,
                email: lead.email,
                reason: bounceInfo.reason || '',
                bounce_type: 'hard',
                source: 'imap',
              });
              if (bounceErr) {
                result.errors.push(`Errore registrazione bounce per lead ${lead.id}: ${bounceErr.message}`);
              }
            }
          }
        } catch (msgErr) {
          result.errors.push(`Errore parsing messaggio UID ${uid}: ${errorMessage(msgErr)}`);
        }
      }

      // 5. Sposta il segnalibro (anche se singoli messaggi hanno dato errore, per non rileggerli all'infinito)
      if (useCursor) {
        const { error: cursorErr } = await adminClient
          .from('mail_sender_settings')
          .update({
            imap_uid_validity: uidValidity,
            imap_last_uid: highestUid,
            imap_synced_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId);
        if (cursorErr) {
          result.errors.push(`Segnalibro IMAP non salvato: ${cursorErr.message}`);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (connErr) {
    result.success = false;
    result.errors.push(`Errore sincronizzazione IMAP: ${errorMessage(connErr)}`);
  } finally {
    try {
      if (client.usable) {
        await client.logout();
      }
    } catch {
      // Ignora errori di chiusura socket se già disconnesso
    }
  }

  return result;
}
