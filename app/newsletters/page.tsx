import { createClient } from '@/lib/supabase/server';
import NewslettersLiveView from '@/components/NewslettersLiveView';
import { NewsletterWithStats } from '@/types/database';
import { enrichNewslettersWithStats } from '@/lib/newsletters/stats';

export const dynamic = 'force-dynamic';

export default async function NewslettersPage() {
  let newslettersWithStats: NewsletterWithStats[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: newsletters } = await supabase
        .from('newsletters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (newsletters && newsletters.length > 0) {
        newslettersWithStats = await enrichNewslettersWithStats(supabase, newsletters);
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
