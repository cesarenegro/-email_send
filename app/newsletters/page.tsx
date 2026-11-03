import { getTenantOrNull } from '@/lib/konta/session';
import NewslettersLiveView from '@/components/NewslettersLiveView';
import { Newsletter, NewsletterWithStats } from '@/types/database';
import { enrichNewslettersWithStats } from '@/lib/newsletters/stats';

export const dynamic = 'force-dynamic';

export default async function NewslettersPage() {
  let newslettersWithStats: NewsletterWithStats[] = [];

  try {
    const tenant = await getTenantOrNull();

    if (tenant) {
      const supabase = tenant.supabase;
      const { data: newsletters } = await supabase
        .from('mail_newsletters')
        .select('*')
        .eq('organization_id', tenant.organizationId)
        .order('created_at', { ascending: false });

      if (newsletters && newsletters.length > 0) {
        newslettersWithStats = await enrichNewslettersWithStats(supabase, newsletters as Newsletter[]);
      }
    }
  } catch (err) {
    console.error('Error loading newsletters list:', err);
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <NewslettersLiveView initialNewsletters={newslettersWithStats} />
      </div>
    </div>
  );
}
