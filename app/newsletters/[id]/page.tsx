import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NewsletterDetailView from '@/components/NewsletterDetailView';
import { getNewsletterStats } from '@/lib/newsletters/stats';

export const dynamic = 'force-dynamic';

export default async function NewsletterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: newsletter, error } = await supabase
    .from('newsletters')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !newsletter) {
    notFound();
  }

  const stats = await getNewsletterStats(supabase, id);

  return (
    <div className="min-h-screen bg-[#F7F5F0] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <NewsletterDetailView initialNewsletter={{ ...newsletter, ...stats }} />
      </div>
    </div>
  );
}
