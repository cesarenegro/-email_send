import type { SupabaseClient } from '@supabase/supabase-js';
import { computeSubsequentSendTime } from '@/lib/scheduling/next-send-time';
import { renderTemplate } from '@/lib/email/render-template';
import { sendEmail } from '@/lib/email/send-email';
import {
  resolveOrganizationTransport,
  SmtpConfigurationError,
  type ResolvedTransportContext,
} from '@/lib/email/transporter';
import { DateTime } from 'luxon';
import type { Campaign, CampaignLead } from '@/types/database';
import { checkConsent } from '@/lib/konta/consent';

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
 * Reclama atomicamente il prossimo destinatario della campagna e invia UNA email
 * con la casella SMTP dell'organizzazione proprietaria. Aggiorna next_send_at.
 * `supabase` deve essere il client con chiave segreta (RPC riservata a service_role).
 */
export async function dispatchNextEmailForCampaign(
  supabase: SupabaseClient,
  campaign: Campaign
): Promise<DispatchResult> {
  // 1. Verifica preventiva del trasporto PRIMA di reclamare un destinatario
  let verifiedTransport: ResolvedTransportContext;
  try {
    verifiedTransport = await resolveOrganizationTransport(campaign.organization_id, supabase);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof SmtpConfigurationError) {
      console.error(`[dispatcher] Campagna ${campaign.id} configurazione SMTP non valida: ${message}`);
      const { error: pauseError } = await supabase
        .from('mail_campaigns')
        .update({ status: 'paused' })
        .eq('id', campaign.id)
        .eq('organization_id', campaign.organization_id);

      if (pauseError) {
        return {
          status: 'error_configuration',
          message: `Configurazione SMTP non valida: ${message}. Aggiornamento a 'paused' fallito (${pauseError.message}).`,
          error: `${message} (Aggiornamento stato fallito: ${pauseError.message})`,
        };
      }
      return {
        status: 'error_configuration',
        message: `Configurazione SMTP non valida: ${message}. Campagna sospesa senza consumare tentativi dei destinatari.`,
        error: message,
      };
    }
    return {
      status: 'error_transient',
      message: `Errore temporaneo verifica SMTP: ${message}`,
      error: message,
    };
  }

  // 2. Claim atomico (FOR UPDATE SKIP LOCKED)
  const { data: claimedRows, error: claimError } = await supabase.rpc('mail_claim_next_campaign_lead', {
    p_campaign_id: campaign.id,
  });

  if (claimError) {
    throw new Error(`Errore RPC claim lead: ${claimError.message}`);
  }

  if (!claimedRows || claimedRows.length === 0) {
    const { count: remainingCount } = await supabase
      .from('mail_campaign_leads')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)
      .in('status', ['pending', 'retry', 'sending']);

    if (!remainingCount || remainingCount === 0) {
      await supabase
        .from('mail_campaigns')
        .update({ status: 'completed', next_send_at: null })
        .eq('id', campaign.id);

      return { status: 'completed', message: 'Tutti i contatti sono stati processati. Campagna completata.' };
    }

    const subsequent = computeSubsequentSendTime(new Date(), {
      timezone: campaign.timezone,
      send_window_start: campaign.send_window_start,
      send_window_end: campaign.send_window_end,
      send_interval_seconds: campaign.send_interval_seconds,
    });

    await supabase.from('mail_campaigns').update({ next_send_at: subsequent }).eq('id', campaign.id);

    return {
      status: 'waiting',
      message: 'Nessun contatto disponibile al momento; riprove programmate in attesa.',
      next_send_at: subsequent,
    };
  }

  const lead: CampaignLead = claimedRows[0];

  // 2-bis. Consenso K-CRM: chi ha revocato il marketing non riceve nulla (fail-closed se non verificabile).
  const consent = await checkConsent(supabase, campaign.organization_id, lead.email, ['marketing']);
  if (consent !== 'allowed') {
    const suppressed = consent === 'suppressed';
    const reason = suppressed ? 'Consenso marketing revocato in K-CRM' : 'Consenso non verificabile: invio rinviato';
    await supabase
      .from('mail_campaign_leads')
      .update(
        suppressed
          ? { status: 'failed', retry_at: null, last_error: reason }
          : { status: 'retry', retry_at: DateTime.utc().plus({ minutes: 15 }).toISO(), last_error: reason }
      )
      .eq('id', lead.id);
    await supabase.from('mail_email_logs').insert({
      organization_id: campaign.organization_id,
      campaign_id: campaign.id,
      campaign_lead_id: lead.id,
      event_type: 'error',
      error_message: reason,
    });
    return {
      status: 'error_handled',
      lead: { id: lead.id, email: lead.email, company_name: lead.company_name },
      error: reason,
      next_send_at: campaign.next_send_at,
    };
  }

  // 3. Rendering dei segnaposto
  const renderedSubject = renderTemplate(campaign.subject_template || '', {
    company_name: lead.company_name,
    email: lead.email,
  });
  const renderedHtml = renderTemplate(campaign.html_template || '', {
    company_name: lead.company_name,
    email: lead.email,
  });

  let sendResult: Awaited<ReturnType<typeof sendEmail>> | null = null;
  let sendError: Error | null = null;

  try {
    sendResult = await sendEmail({
      to: lead.email,
      subject: renderedSubject,
      html: renderedHtml,
      organizationId: campaign.organization_id,
      transportContext: verifiedTransport,
    });
  } catch (err) {
    sendError = err instanceof Error ? err : new Error(String(err));
    console.error(`[dispatcher] Errore invio a ${lead.email}:`, sendError.message);
  }

  const nowTimestamp = DateTime.utc().toISO()!;

  // 4. Aggiornamento destinatario e log
  if (!sendError && sendResult) {
    await supabase
      .from('mail_campaign_leads')
      .update({ status: 'sent', sent_at: nowTimestamp, smtp_message_id: sendResult.messageId || null, last_error: null })
      .eq('id', lead.id);

    await supabase.from('mail_email_logs').insert({
      organization_id: campaign.organization_id,
      campaign_id: campaign.id,
      campaign_lead_id: lead.id,
      event_type: 'sent',
      smtp_message_id: sendResult.messageId || null,
    });
  } else {
    const errorMessage = sendError?.message || 'Errore SMTP sconosciuto';
    const isPermanent = /invalid address|syntax error|recipient rejected/i.test(errorMessage);
    const attempts = (lead.attempts || 0) + 1;

    if (attempts >= 3 || isPermanent) {
      await supabase
        .from('mail_campaign_leads')
        .update({ status: 'failed', retry_at: null, last_error: errorMessage })
        .eq('id', lead.id);
    } else {
      const retryAt = DateTime.utc().plus({ minutes: 15 }).toISO();
      await supabase
        .from('mail_campaign_leads')
        .update({ status: 'retry', retry_at: retryAt, last_error: errorMessage })
        .eq('id', lead.id);
    }

    await supabase.from('mail_email_logs').insert({
      organization_id: campaign.organization_id,
      campaign_id: campaign.id,
      campaign_lead_id: lead.id,
      event_type: 'error',
      error_message: errorMessage,
    });
  }

  // 5. Prossimo slot
  const nextSendAt = computeSubsequentSendTime(new Date(), {
    timezone: campaign.timezone,
    send_window_start: campaign.send_window_start,
    send_window_end: campaign.send_window_end,
    send_interval_seconds: campaign.send_interval_seconds,
  });

  await supabase.from('mail_campaigns').update({ status: 'active', next_send_at: nextSendAt }).eq('id', campaign.id);

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
    smtp_message_id: sendResult?.messageId || null,
    next_send_at: nextSendAt,
  };
}
