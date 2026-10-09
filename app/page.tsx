import { createClient } from '@/lib/supabase/server';
import HubLiveView from '@/components/HubLiveView';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let campaignsTotal = 0;
  let campaignsActive = 0;
  let newslettersTotal = 0;
  let newslettersScheduled = 0;
  let newslettersSending = 0;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const [
        totalCampRes,
        activeCampRes,
        totalNlRes,
        schedNlRes,
        sendNlRes,
      ] = await Promise.all([
        supabase
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'active'),
        supabase
          .from('newsletters')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('newsletters')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'scheduled'),
        supabase
          .from('newsletters')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'sending'),
      ]);

      campaignsTotal = totalCampRes.count || 0;
      campaignsActive = activeCampRes.count || 0;
      newslettersTotal = totalNlRes.count || 0;
      newslettersScheduled = schedNlRes.count || 0;
      newslettersSending = sendNlRes.count || 0;
    }
  } catch (err) {
    console.error('Error fetching hub data:', err);
  }

  return (
    <HubLiveView
      stats={{
        campaignsTotal,
        campaignsActive,
        newslettersTotal,
        newslettersScheduled,
        newslettersSending,
      }}
    />
  );
}
