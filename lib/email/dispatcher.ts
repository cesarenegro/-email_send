import { SupabaseClient } from '@supabase/supabase-js';
import { computeSubsequentSendTime } from '@/lib/scheduling/next-send-time';
import { renderTemplate } from '@/lib/email/render-template';
import { sendEmail } from '@/lib/email/send-email';
import { resolveAuthorizedTransportContext, SmtpConfigurationError, SmtpDatabaseError } from '@/lib/email/transporter';
import { DateTime } from 'luxon';
import { Campaign, CampaignLead } from '@/types/database';

export interface DispatchResult {
  status: 'sent' | 'error_handled' | 'no_leads' | 'completed' | 'waiting' | 'error_configuration' | 'error_transient';
  message?: string;
  lead?: {
    id: string;
    email: string;
    company_name?: string | null;
  };
  smtp_message_id?: string | null;
  error?: string;
  next_send_at?: string | null;
}

/**
 * Atomically claims the next eligible lead for a campaign and sends one email immediately.
 * Advances campaign.next_send_at according to the configured interval and sending window.
 */
export async function dispatchNextEmailForCampaign(
  supabase: SupabaseClient,
  campaign: Campaign
): Promise<DispatchResult> {
  // 1. Pre-flight Transport Verification BEFORE claiming any lead
  // Prevents burning recipient retry attempts if SMTP configuration is unusable or unverified
  let verifiedTransport: any;
  try {
    verifiedTransport = await resolveAuthorizedTransportContext({
      userId: campaign.user_id,
      smtpConnectionId: (campaign as any).smtp_connection_id,
      allowAdminFallback: false,
      supabaseClient: supabase,
    });
  } catch (err: any) {
    if (err instanceof SmtpConfigurationError) {
      console.error(`[dispatcher] Campaign ${campaign.id} SMTP config error: ${err.message}`);
      const { error: pauseError } = await supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', campaign.id);

      if (pauseError) {
        console.error(`[dispatcher] Impossibile aggiornare stato a paused per campagna ${campaign.id}: ${pauseError.message}`);
        return {
          status: 'error_configuration',
          message: `Configurazione SMTP non valida: ${err.message}. ATTENZIONE: aggiornamento stato a 'paused' fallito (${pauseError.message}).`,
          error: `${err.message} (Aggiornamento stato fallito: ${pauseError.message})`,
        };
      }

      return {
        status: 'error_configuration',
        message: `Configurazione SMTP non valida: ${err.message}. Campagna sospesa senza consumare tentativi dei destinatari.`,
        error: err.message,
      };
    }

    // Transient DB error
    return {
      status: 'error_transient',
      message: `Errore temporaneo verifica SMTP: ${err.message}`,
      error: err.message,
    };
  }

  // 2. Atomically claim one lead using PostgreSQL RPC (FOR UPDATE SKIP LOCKED)
  const { data: claimedRows, error: claimError } = await supabase.rpc(
    'claim_next_campaign_lead',
    { p_campaign_id: campaign.id }
  );

  if (claimError) {
    throw new Error(`Errore RPC claim lead: ${claimError.message}`);
  }

  // 2. If no lead was returned, check if campaign is completed or waiting for retries
  if (!claimedRows || claimedRows.length === 0) {
    const { count: remainingCount } = await supabase
      .from('campaign_leads')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)
      .in('status', ['pending', 'retry', 'sending']);

    if (!remainingCount || remainingCount === 0) {
      await supabase
        .from('campaigns')
        .update({
          status: 'completed',
          next_send_at: null,
        })
        .eq('id', campaign.id);

      return {
        status: 'completed',
        message: 'Tutti i contatti sono stati processati. Campagna completata.',
      };
    }

    const subsequent = computeSubsequentSendTime(new Date(), {
      timezone: campaign.timezone,
      send_window_start: campaign.send_window_start,
      send_window_end: campaign.send_window_end,
      send_interval_seconds: campaign.send_interval_seconds,
    });

    await supabase
      .from('campaigns')
      .update({ next_send_at: subsequent })
      .eq('id', campaign.id);

    return {
      status: 'waiting',
      message: 'Nessun contatto disponibile al momento; riprove programmate in attesa.',
      next_send_at: subsequent,
    };
  }

  const lead: CampaignLead = claimedRows[0];

  // 3. Render subject and HTML with lead placeholders
  const renderedSubject = renderTemplate(campaign.subject_template || '', {
    company_name: lead.company_name,
    email: lead.email,
  });

  const renderedHtml = renderTemplate(campaign.html_template || '', {
    company_name: lead.company_name,
    email: lead.email,
  });

  let sendResult: any = null;
  let sendError: any = null;

  try {
    sendResult = await sendEmail({
      to: lead.email,
      subject: renderedSubject,
      html: renderedHtml,
      userId: campaign.user_id,
      smtpConnectionId: (campaign as any).smtp_connection_id,
      transportContext: verifiedTransport,
    });
  } catch (err: any) {
    sendError = err;
    console.error(`[dispatcher] Error sending email to ${lead.email}:`, err);
  }

  const nowTimestamp = DateTime.utc().toISO()!;

  // 4. Update lead and email logs
  if (!sendError && sendResult) {
    // SUCCESS
    await supabase
      .from('campaign_leads')
      .update({
        status: 'sent',
        sent_at: nowTimestamp,
        smtp_message_id: sendResult.messageId || null,
        last_error: null,
      })
      .eq('id', lead.id);

    await supabase.from('email_logs').insert({
      campaign_id: campaign.id,
      campaign_lead_id: lead.id,
      event_type: 'sent',
      smtp_message_id: sendResult.messageId || null,
    });
  } else {
    // FAILURE & RETRY LOGIC
    const errorMessage = sendError?.message || 'Errore SMTP sconosciuto';
    const isPermanent = /invalid address|syntax error|recipient rejected/i.test(errorMessage);
    const attempts = (lead.attempts || 0) + 1;

    if (attempts >= 3 || isPermanent) {
      await supabase
        .from('campaign_leads')
        .update({
          status: 'failed',
          retry_at: null,
          last_error: errorMessage,
        })
        .eq('id', lead.id);
    } else {
      const retryAt = DateTime.utc().plus({ minutes: 15 }).toISO();
      await supabase
        .from('campaign_leads')
        .update({
          status: 'retry',
          retry_at: retryAt,
          last_error: errorMessage,
        })
        .eq('id', lead.id);
    }

    await supabase.from('email_logs').insert({
      campaign_id: campaign.id,
      campaign_lead_id: lead.id,
      event_type: 'error',
      error_message: errorMessage,
    });
  }

  // 5. Compute next staggered slot
  const nextSendAt = computeSubsequentSendTime(new Date(), {
    timezone: campaign.timezone,
    send_window_start: campaign.send_window_start,
    send_window_end: campaign.send_window_end,
    send_interval_seconds: campaign.send_interval_seconds,
  });

  await supabase
    .from('campaigns')
    .update({
      status: 'active',
      next_send_at: nextSendAt,
    })
    .eq('id', campaign.id);

  if (sendError) {
    return {
      status: 'error_handled',
      lead: { id: lead.id, email: lead.email, company_name: lead.company_name },
      error: sendError.message,
      next_send_at: nextSendAt,
    };
  }

  return {
    status: 'sent',
    lead: { id: lead.id, email: lead.email, company_name: lead.company_name },
    smtp_message_id: sendResult.messageId || null,
    next_send_at: nextSendAt,
  };
}
