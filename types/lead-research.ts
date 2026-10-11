import { z } from 'zod';

export type LeadResearchSku = 'M' | 'XL' | 'AD_HOC';

export type LeadResearchJobStatus =
  | 'draft'
  | 'submitted'
  | 'accepted'
  | 'in_progress'
  | 'human_review'
  | 'delivered'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type LeadResearchStopReason =
  | 'budget_exhausted'
  | 'sources_exhausted'
  | 'goal_reached'
  | 'user_cancelled'
  | 'error';

export interface FieldSourceEvidence {
  source_url: string;
  collected_at: string;
  snippet?: string;
}

export interface LeadResearchJob {
  id: string;
  user_id: string;
  sku: LeadResearchSku;
  status: LeadResearchJobStatus;
  title: string;
  initial_brief: string;
  confirmed_scope?: {
    sector?: string;
    territory?: string;
    requested_fields?: string[];
    exclusions?: string[];
    target_goal?: string;
  } | null;
  price_cents: number;
  currency: 'USD';
  api_budget_micro_usd: number | null;
  api_spent_micro_usd: number;
  api_reserved_micro_usd: number;
  pricing_version: string;
  stop_reason?: LeadResearchStopReason | string | null;
  accepted_at?: string | null;
  due_at?: string | null;
  assigned_staff_id?: string | null;
  delivered_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadResearchResult {
  id: string;
  job_id: string;
  company_name: string;
  category?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  contact_person?: string | null;
  contact_role?: string | null;
  source_evidence: Record<string, FieldSourceEvidence>;
  data_status: 'web_found' | 'unverified';
  human_verified: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
  deliverability_status: 'unverified';
  normalized_domain?: string | null;
  normalized_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadResearchMessage {
  id: string;
  job_id: string;
  sender_role: 'user' | 'assistant' | 'system' | 'staff';
  content: string;
  created_at: string;
}

export interface LeadResearchUsage {
  id: string;
  job_id: string;
  provider: 'openai' | 'tavily';
  endpoint_or_model: string;
  request_id?: string | null;
  reserved_micro_usd: number;
  actual_cost_micro_usd: number;
  raw_usage?: Record<string, any> | null;
  status: 'reserved' | 'reconciled' | 'failed_reconciled';
  created_at: string;
}

// ---------------- ZOD VALIDATION SCHEMAS ----------------

export const CreateLeadResearchJobSchema = z.object({
  sku: z.enum(['M', 'XL', 'AD_HOC']),
  initial_brief: z.string().min(5).max(3000),
  title: z.string().min(2).max(150).optional(),
  sector: z.string().max(100).optional(),
  territory: z.string().max(150).optional(),
  requested_fields: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  target_goal: z.string().max(300).optional(),
});

export const ExtractedLeadItemSchema = z.object({
  company_name: z.string().min(1),
  category: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  contact_role: z.string().nullable().optional(),
  source_evidence: z.record(
    z.string(),
    z.object({
      source_url: z.string(),
      collected_at: z.string(),
      snippet: z.string().optional(),
    })
  ).optional().default({}),
});

export type ExtractedLeadItem = z.infer<typeof ExtractedLeadItemSchema>;
