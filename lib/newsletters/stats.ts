import { SupabaseClient } from '@supabase/supabase-js';

export interface NewsletterStats {
  total_subscribers: number;
  sent_count: number;
  pending_count: number;
  failed_count: number;
}

/**
 * Calculates exact count of subscribers for a single newsletter without hitting the PostgREST 1000 row limit.
 */
export async function getNewsletterStats(
  supabase: SupabaseClient<any, any, any>,
  newsletterId: string
): Promise<NewsletterStats> {
  const [totalRes, sentRes, failedRes] = await Promise.all([
    supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('newsletter_id', newsletterId),
    supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('newsletter_id', newsletterId)
      .eq('status', 'sent'),
    supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('newsletter_id', newsletterId)
      .eq('status', 'failed'),
  ]);

  const total = totalRes.count || 0;
  const sent = sentRes.count || 0;
  const failed = failedRes.count || 0;
  const pending = Math.max(0, total - sent - failed);

  return {
    total_subscribers: total,
    sent_count: sent,
    pending_count: pending,
    failed_count: failed,
  };
}

/**
 * Enriches an array of newsletters with exact subscriber counts in parallel.
 */
export async function enrichNewslettersWithStats<T extends { id: string }>(
  supabase: SupabaseClient<any, any, any>,
  newsletters: T[]
): Promise<(T & NewsletterStats)[]> {
  return Promise.all(
    newsletters.map(async (nl) => {
      const stats = await getNewsletterStats(supabase, nl.id);
      return {
        ...nl,
        ...stats,
      };
    })
  );
}
