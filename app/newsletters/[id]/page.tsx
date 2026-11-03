import { notFound } from 'next/navigation';
import { getTenantOrNull } from '@/lib/konta/session';
import NewsletterDetailView from '@/components/NewsletterDetailView';
import { getNewsletterStats } from '@/lib/newsletters/stats';
import type { Newsletter } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function NewsletterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getTenantOrNull();

  if (!tenant) {
    notFound();
  }

  const supabase = tenant.supabase;

  const { data: newsletter, error } = await supabase
    .from('mail_newsletters')
    .select('*')
    .eq('id', id)
    .eq('organization_id', tenant.organizationId)
    .maybeSingle();

  if (error || !newsletter) {
    notFound();
  }

  const stats = await getNewsletterStats(supabase, id);

  return (
    <div className="min-h-screen bg-[#F7F5F0] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <NewsletterDetailView initialNewsletter={{ ...(newsletter as Newsletter), ...stats }} />
      </div>
    </div>
  );
}
