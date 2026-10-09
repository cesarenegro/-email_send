import { SupabaseClient } from '@supabase/supabase-js';
import { renderTemplate } from '@/lib/email/render-template';
import { sendEmail } from '@/lib/email/send-email';
import { DateTime } from 'luxon';
import { Newsletter, NewsletterSubscriber } from '@/types/database';

export interface NewsletterDispatchResult {
  status: 'sent' | 'error_handled' | 'no_subscribers' | 'completed' | 'waiting';
  message?: string;
  subscriber?: {
    id: string;
    email: string;
    name?: string | null;
  };
  smtp_message_id?: string | null;
  error?: string;
  next_send_at?: string | null;
}

/**
 * Atomically claims the next eligible subscriber for a newsletter and sends one email immediately.
 * Advances newsletter.next_send_at according to the configured interval.
 */
export async function dispatchNextEmailForNewsletter(
  supabase: SupabaseClient,
  newsletter: Newsletter
): Promise<NewsletterDispatchResult> {
  // 1. Atomically claim one subscriber using PostgreSQL RPC (FOR UPDATE SKIP LOCKED)
  const { data: claimedRows, error: claimError } = await supabase.rpc(
    'claim_next_newsletter_subscriber',
    { p_newsletter_id: newsletter.id }
  );

  if (claimError) {
    throw new Error(`Errore RPC claim subscriber: ${claimError.message}`);
  }

  // 2. If no subscriber was returned, check if newsletter is completed
  if (!claimedRows || claimedRows.length === 0) {
    const { count: remainingCount } = await supabase
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('newsletter_id', newsletter.id)
      .eq('status', 'pending');

    if (!remainingCount || remainingCount === 0) {
      await supabase
        .from('newsletters')
        .update({
          status: 'sent',
          next_send_at: null,
        })
        .eq('id', newsletter.id);

      return {
        status: 'completed',
        message: 'Tutti gli iscritti sono stati processati. Newsletter inviata con successo!',
      };
    }

    return {
      status: 'waiting',
      message: 'Nessun iscritto disponibile al momento.',
    };
  }

  const subscriber: NewsletterSubscriber = claimedRows[0];

  // 3. Render subject and HTML with subscriber placeholders
  const renderedSubject = renderTemplate(newsletter.subject || '', {
    email: subscriber.email,
    name: subscriber.name || '',
  });

  const renderedHtml = renderTemplate(newsletter.html_content || '', {
    email: subscriber.email,
    name: subscriber.name || '',
  });

  let sendResult: any = null;
  let sendError: any = null;

  try {
    sendResult = await sendEmail({
      to: subscriber.email,
      subject: renderedSubject,
      html: renderedHtml,
      userId: newsletter.user_id || undefined,
    });
  } catch (err: any) {
    sendError = err;
  }

  const nowIso = DateTime.utc().toISO()!;

  // 4. Update subscriber state based on send outcome
  if (sendResult && sendResult.messageId) {
    await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'sent',
        sent_at: nowIso,
        smtp_message_id: sendResult.messageId,
        last_error: null,
      })
      .eq('id', subscriber.id);
  } else {
    const errorMessage = sendError ? (sendError.message || String(sendError)) : 'Invio fallito senza messaggio di errore';
    await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'failed',
        last_error: errorMessage,
      })
      .eq('id', subscriber.id);
  }

  // 5. Advance newsletter.next_send_at with interval
  const intervalSeconds = Math.max(30, newsletter.send_interval_seconds || 60);
  const nextSendTime = DateTime.utc().plus({ seconds: intervalSeconds }).toISO()!;

  await supabase
    .from('newsletters')
    .update({
      status: 'sending',
      next_send_at: nextSendTime,
    })
    .eq('id', newsletter.id);

  if (sendError) {
    return {
      status: 'error_handled',
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        name: subscriber.name,
      },
      error: sendError.message || String(sendError),
      next_send_at: nextSendTime,
    };
  }

  return {
    status: 'sent',
    subscriber: {
      id: subscriber.id,
      email: subscriber.email,
      name: subscriber.name,
    },
    smtp_message_id: sendResult?.messageId,
    next_send_at: nextSendTime,
  };
}
