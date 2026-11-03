import type { TenantContext } from '@/lib/konta/session';
import { evaluateKcrmSegment } from '@/lib/konta/kcrm-client';
import { isValidEmail } from '@/lib/csv/validate-lead';

export interface SegmentImportResult {
  segment_name: string;
  recipients: number;
  imported: number;
  duplicates: number;
  excluded: number;
  suppressed: number;
}

const BATCH = 500;

/**
 * Importa i destinatari di un segmento K-CRM in una campagna o newsletter dell'organizzazione.
 * K-CRM calcola i destinatari (consenso, revoche, duplicati); Mail-K salva solo email,
 * nome e id persona, con source = 'crm_segment'. Le righe passano dalla RLS dell'utente.
 */
export async function importSegment(
  tenant: TenantContext,
  target: { kind: 'campaign' | 'newsletter'; id: string },
  segmentId: string
): Promise<SegmentImportResult> {
  const evaluation = await evaluateKcrmSegment(tenant.organizationId, segmentId);

  const table = target.kind === 'campaign' ? 'mail_campaign_leads' : 'mail_newsletter_subscribers';
  const parentColumn = target.kind === 'campaign' ? 'campaign_id' : 'newsletter_id';

  // Email già presenti (paginazione oltre il limite di 1000 righe).
  const existing = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await tenant.supabase
      .from(table)
      .select('email')
      .eq('organization_id', tenant.organizationId)
      .eq(parentColumn, target.id)
      .range(from, from + 999);
    if (error) throw new Error(`Lettura destinatari esistenti fallita: ${error.message}`);
    for (const r of data || []) existing.add(String((r as { email: string }).email).toLowerCase());
    if (!data || data.length < 1000) break;
  }

  let duplicates = 0;
  const rows: Record<string, unknown>[] = [];
  for (const r of evaluation.recipients) {
    const email = r.email_normalized.trim().toLowerCase();
    if (!isValidEmail(email)) continue;
    if (existing.has(email)) {
      duplicates += 1;
      continue;
    }
    existing.add(email);
    rows.push(
      target.kind === 'campaign'
        ? {
            organization_id: tenant.organizationId,
            campaign_id: target.id,
            email,
            company_name: null,
            status: 'pending',
            attempts: 0,
            crm_person_id: r.person_id,
            source: 'crm_segment',
          }
        : {
            organization_id: tenant.organizationId,
            newsletter_id: target.id,
            email,
            name: r.display_name || null,
            crm_person_id: r.person_id,
            source: 'crm_segment',
          }
    );
  }

  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await tenant.supabase.from(table).insert(rows.slice(i, i + BATCH));
    if (error) throw new Error(`Salvataggio destinatari fallito: ${error.message}`);
  }

  const parentTable = target.kind === 'campaign' ? 'mail_campaigns' : 'mail_newsletters';
  await tenant.supabase
    .from(parentTable)
    .update({ crm_segment_id: segmentId })
    .eq('id', target.id)
    .eq('organization_id', tenant.organizationId);

  return {
    segment_name: evaluation.segment?.name || '',
    recipients: evaluation.recipients.length,
    imported: rows.length,
    duplicates,
    excluded: evaluation.excluded_recipients.length,
    suppressed: evaluation.suppressed_emails.length,
  };
}
