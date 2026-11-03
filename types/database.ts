export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type LeadStatus = 'pending' | 'sending' | 'sent' | 'retry' | 'failed';
export type EmailLogEventType = 'sent' | 'error';

/** Tabella public.mail_campaigns (una riga appartiene a un'organizzazione KONTA). */
export interface Campaign {
  id: string;
  organization_id: string;
  created_by: string | null;
  name: string;
  subject_template: string;
  html_template: string;
  status: CampaignStatus;
  timezone: string;
  start_at: string | null;
  send_window_start: string;
  send_window_end: string;
  send_interval_seconds: number;
  daily_limit: number;
  next_send_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Tabella public.mail_sender_settings: una riga per organizzazione. I *_ciphertext escono solo lato server. */
export interface SenderSettings {
  id: string;
  organization_id: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  preferred_timezone: string;
  send_window_start: string;
  send_window_end: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass_ciphertext: string | null;
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_pass_ciphertext: string | null;
  /** Segnalibro IMAP (solo server): UIDVALIDITY e ultimo UID già esaminato. */
  imap_uid_validity: number | null;
  imap_last_uid: number | null;
  imap_synced_at: string | null;
  key_version: number;
  is_verified: boolean;
  verified_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Proiezione delle impostazioni restituita al client: mai i testi cifrati. */
export interface SenderSettingsPublic {
  organization_id: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  preferred_timezone: string;
  send_window_start: string;
  send_window_end: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass_set: boolean;
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_pass_set: boolean;
  is_verified: boolean;
  verified_at: string | null;
  updated_at: string | null;
}

export interface CampaignWithStats extends Campaign {
  total_leads: number;
  sent_count: number;
  pending_count: number;
  failed_count: number;
}

export interface CampaignLead {
  id: string;
  organization_id: string;
  campaign_id: string;
  company_name: string | null;
  email: string;
  status: LeadStatus;
  attempts: number;
  retry_at: string | null;
  sent_at: string | null;
  smtp_message_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  campaign_lead_id: string | null;
  newsletter_id: string | null;
  subscriber_id: string | null;
  event_type: EmailLogEventType;
  smtp_message_id: string | null;
  error_message: string | null;
  created_at: string;
}

export type NewsletterStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
export type SubscriberStatus = 'pending' | 'sending' | 'sent' | 'failed';

export interface Newsletter {
  id: string;
  organization_id: string;
  created_by: string | null;
  title: string;
  subject: string;
  html_content: string;
  status: NewsletterStatus;
  scheduled_at: string | null;
  timezone: string;
  send_interval_seconds: number;
  next_send_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsletterWithStats extends Newsletter {
  total_subscribers: number;
  sent_count: number;
  pending_count: number;
  failed_count: number;
}

export interface NewsletterSubscriber {
  id: string;
  organization_id: string;
  newsletter_id: string;
  email: string;
  name?: string | null;
  status: SubscriberStatus;
  attempts: number;
  sent_at: string | null;
  smtp_message_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}
