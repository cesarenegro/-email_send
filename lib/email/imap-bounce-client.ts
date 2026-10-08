import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { SupabaseClient } from '@supabase/supabase-js';
import { parseBounceContent } from './bounce-parser';

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
}

export async function syncBouncesFromImap(
  supabase: SupabaseClient,
  options: BounceSyncOptions = {}
): Promise<BounceSyncResult> {
  const host = process.env.IMAP_HOST || 'imap.hostinger.com';
  const port = Number(process.env.IMAP_PORT || '993');
  const secure = process.env.IMAP_SECURE !== 'false';
  const user = process.env.IMAP_USER || process.env.SMTP_USER;
  const pass = process.env.IMAP_PASS || process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('Credenziali IMAP non configurate nelle variabili d\'ambiente (IMAP_USER / SMTP_USER).');
  }

  const result: BounceSyncResult = {
    success: true,
    bouncesDetected: 0,
    leadsUpdated: 0,
    updatedLeads: [],
    errors: [],
  };

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: { user, pass },
    logger: false,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX', { readOnly: true });

    try {
      const status = await client.status('INBOX', { messages: true });
      const totalMessages = (status && typeof status === 'object' && typeof status.messages === 'number')
        ? status.messages
        : 0;

      if (totalMessages === 0) {
        return result;
      }

      // Check the most recent messages (default last 100 messages)
      const windowSize = options.limitMessages || 100;
      const fromSeq = Math.max(1, totalMessages - windowSize + 1);
      const toSeq = totalMessages;

      // 1. Fetch envelopes FIRST to find potential bounces
      const candidateUids: number[] = [];
      for await (const msg of client.fetch(`${fromSeq}:${toSeq}`, {
        uid: true,
        envelope: true,
      })) {
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

      // 2. Inspect candidate bounce messages
      for (const uid of candidateUids) {
        try {
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

          // 3. Find matching lead in database
          let query = supabase
            .from('campaign_leads')
            .select('id, campaign_id, email, status, last_error')
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
          for (const lead of matchedLeads) {
            // Only update if not already marked with this bounce error
            const formattedError = `Bounce: ${bounceInfo.reason}`;
            if (lead.status === 'failed' && lead.last_error === formattedError) {
              continue;
            }

            const { error: updateErr } = await supabase
              .from('campaign_leads')
              .update({
                status: 'failed',
                last_error: formattedError,
              })
              .eq('id', lead.id);

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

              // Log error event in email_logs
              await supabase.from('email_logs').insert({
                campaign_id: lead.campaign_id,
                campaign_lead_id: lead.id,
                event_type: 'error',
                error_message: formattedError,
              });
            }
          }
        } catch (msgErr: any) {
          result.errors.push(`Errore parsing messaggio UID ${uid}: ${msgErr.message}`);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (connErr: any) {
    result.success = false;
    result.errors.push(`Errore connessione IMAP: ${connErr.message}`);
  }

  return result;
}
