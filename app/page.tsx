import { createClient } from '@/lib/supabase/server';
import HubLiveView from '@/components/HubLiveView';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let campaignsTotal = 0;
  let campaignsActive = 0;
  let newslettersTotal = 0;
  let newslettersScheduled = 0;
  let newslettersSending = 0;
  let todaySends = 0;
  let pendingLeadsCount = 0;
  let latestCampaign: {
    id: string;
    name: string;
    status: string;
    updated_at: string;
    totalLeads: number;
    sentLeads: number;
  } | null = null;
  let latestNewsletter: {
    id: string;
    title: string;
    status: string;
    subject: string;
  } | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [
        totalCampRes,
        activeCampRes,
        totalNlRes,
        schedNlRes,
        sendNlRes,
        todaySendsRes,
        pendingLeadsRes,
        latestCampRes,
        latestNlRes,
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
        supabase
          .from('email_logs')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'sent')
          .gte('created_at', startOfDay.toISOString()),
        supabase
          .from('campaign_leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('campaigns')
          .select('id, name, status, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('newsletters')
          .select('id, title, status, subject')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      campaignsTotal = totalCampRes.count || 0;
      campaignsActive = activeCampRes.count || 0;
      newslettersTotal = totalNlRes.count || 0;
      newslettersScheduled = schedNlRes.count || 0;
      newslettersSending = sendNlRes.count || 0;
      todaySends = todaySendsRes.count || 0;
      pendingLeadsCount = pendingLeadsRes.count || 0;

      if (latestCampRes.data) {
        const camp = latestCampRes.data;
        const [totalRes, sentRes] = await Promise.all([
          supabase
            .from('campaign_leads')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', camp.id),
          supabase
            .from('campaign_leads')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', camp.id)
            .eq('status', 'sent'),
        ]);

        latestCampaign = {
          id: camp.id,
          name: camp.name,
          status: camp.status,
          updated_at: camp.updated_at,
          totalLeads: totalRes.count || 0,
          sentLeads: sentRes.count || 0,
        };
      }

      if (latestNlRes.data) {
        latestNewsletter = latestNlRes.data;
      }
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
        todaySends,
        pendingLeadsCount,
        latestCampaign,
        latestNewsletter,
      }}
    />
  );
}
