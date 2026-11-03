import type { SupabaseClient } from '@supabase/supabase-js';
import { renderTemplate } from '@/lib/email/render-template';
import { sendEmail } from '@/lib/email/send-email';
import {
  resolveOrganizationTransport,
  SmtpConfigurationError,
  type ResolvedTransportContext,
} from '@/lib/email/transporter';
import { DateTime } from 'luxon';
import type { Newsletter, NewsletterSubscriber } from '@/types/database';

export interface NewsletterDispatchResult {
  status: 'sent' | 'error_handled' | 'no_subscribers' | 'completed' | 'waiting' | 'error_configuration' | 'error_transient';
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
 * Reclama atomicamente il prossimo iscritto della newsletter e invia UNA email
 * con la casella SMTP dell'organizzazione proprietaria. Aggiorna next_send_at.
 */
export async function dispatchNextEmailForNewsletter(
  supabase: SupabaseClient,
  newsletter: Newsletter
): Promise<NewsletterDispatchResult> {
  let verifiedTransport: ResolvedTransportContext;
  try {
    verifiedTransport = await resolveOrganizationTransport(newsletter.organization_id, supabase);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof SmtpConfigurationError) {
      console.error(`[newsletter-dispatcher] Newsletter ${newsletter.id} configurazione SMTP non valida: ${message}`);
      const { error: pauseError } = await supabase
        .from('mail_newsletters')
        .update({ status: 'paused' })
        .eq('id', newsletter.id)
        .eq('organization_id', newsletter.organization_id);

      if (pauseError) {
        return {
          status: 'error_configuration',
          message: `Configurazione SMTP newsletter non valida: ${message}. Aggiornamento a 'paused' fallito (${pauseError.message}).`,
          error: `${message} (Aggiornamento fallito: ${pauseError.message})`,
        };
      }
      return {
        status: 'error_configuration',
        message: `Configurazione SMTP newsletter non valida: ${message}. Newsletter sospesa senza consumare iscritti.`,
        error: message,
      };
    }
    return {
      status: 'error_transient',
      message: `Errore temporaneo verifica SMTP newsletter: ${message}`,
      error: message,
    };
  }

  const { data: claimedRows, error: claimError } = await supabase.rpc('mail_claim_next_newsletter_subscriber', {
    p_newsletter_id: newsletter.id,
  });

  if (claimError) {
    throw new Error(`Errore RPC claim subscriber: ${claimError.message}`);
  }

  if (!claimedRows || claimedRows.length === 0) {
    const { count: remainingCount } = await supabase
      .from('mail_newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('newsletter_id', newsletter.id)
      .eq('status', 'pending');

    if (!remainingCount || remainingCount === 0) {
      await supabase.from('mail_newsletters').update({ status: 'sent', next_send_at: null }).eq('id', newsletter.id);
      return { status: 'completed', message: 'Tutti gli iscritti sono stati processati. Newsletter inviata.' };
    }

    return { status: 'waiting', message: 'Nessun iscritto disponibile al momento.' };
  }

  const subscriber: NewsletterSubscriber = claimedRows[0];

  const renderedSubject = renderTemplate(newsletter.subject || '', {
    email: subscriber.email,
    name: subscriber.name || '',
  });
  const renderedHtml = renderTemplate(newsletter.html_content || '', {
    email: subscriber.email,
    name: subscriber.name || '',
  });

  let sendResult: Awaited<ReturnType<typeof sendEmail>> | null = null;
  let sendError: Error | null = null;

  try {
    sendResult = await sendEmail({
      to: subscriber.email,
      subject: renderedSubject,
      html: renderedHtml,
      organizationId: newsletter.organization_id,
      transportContext: verifiedTransport,
    });
  } catch (err) {
    sendError = err instanceof Error ? err : new Error(String(err));
  }

  const nowIso = DateTime.utc().toISO()!;

  if (sendResult && sendResult.messageId) {
    await supabase
      .from('mail_newsletter_subscribers')
      .update({ status: 'sent', sent_at: nowIso, smtp_message_id: sendResult.messageId, last_error: null })
      .eq('id', subscriber.id);
    await supabase.from('mail_email_logs').insert({
      organization_id: newsletter.organization_id,
      newsletter_id: newsletter.id,
      subscriber_id: subscriber.id,
      event_type: 'sent',
      smtp_message_id: sendResult.messageId,
    });
  } else {
    const errorMessage = sendError ? sendError.message : 'Invio fallito senza messaggio di errore';
    await supabase
      .from('mail_newsletter_subscribers')
      .update({ status: 'failed', last_error: errorMessage })
      .eq('id', subscriber.id);
    await supabase.from('mail_email_logs').insert({
      organization_id: newsletter.organization_id,
      newsletter_id: newsletter.id,
      subscriber_id: subscriber.id,
      event_type: 'error',
      error_message: errorMessage,
    });
  }

  const intervalSeconds = Math.max(30, newsletter.send_interval_seconds || 60);
  const nextSendTime = DateTime.utc().plus({ seconds: intervalSeconds }).toISO()!;

  await supabase.from('mail_newsletters').update({ status: 'sending', next_send_at: nextSendTime }).eq('id', newsletter.id);

  if (sendError) {
    return {
      status: 'error_handled',
      subscriber: { id: subscriber.id, email: subscriber.email, name: subscriber.name },
      error: sendError.message,
      next_send_at: nextSendTime,
    };
  }

  return {
    status: 'sent',
    subscriber: { id: subscriber.id, email: subscriber.email, name: subscriber.name },
    smtp_message_id: sendResult?.messageId,
    next_send_at: nextSendTime,
  };
}
