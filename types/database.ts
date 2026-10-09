export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type LeadStatus = 'pending' | 'sending' | 'sent' | 'retry' | 'failed';
export type EmailLogEventType = 'sent' | 'error';

export interface Campaign {
  id: string;
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
  user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  preferred_timezone: string;
  send_window_start: string;
  send_window_end: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}


export interface CampaignWithStats extends Campaign {
  total_leads: number;
  sent_count: number;
  pending_count: number;
  failed_count: number;
}

export interface CampaignLead {
  id: string;
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
  campaign_id: string;
  campaign_lead_id: string;
  event_type: EmailLogEventType;
  smtp_message_id: string | null;
  error_message: string | null;
  created_at: string;
}

export type NewsletterStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
export type SubscriberStatus = 'pending' | 'sending' | 'sent' | 'failed';

export interface Newsletter {
  id: string;
  user_id?: string | null;
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

