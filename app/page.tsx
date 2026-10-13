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
        todayLogsRes,
        pendingLeadsRes,
        latestCampRes,
        latestNlRes,
        totalSentLogsRes,
        totalErrorLogsRes,
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
          .select('created_at, event_type')
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
        supabase
          .from('email_logs')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'sent'),
        supabase
          .from('email_logs')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'error'),
      ]);

      campaignsTotal = totalCampRes.count || 0;
      campaignsActive = activeCampRes.count || 0;
      newslettersTotal = totalNlRes.count || 0;
      newslettersScheduled = schedNlRes.count || 0;
      newslettersSending = sendNlRes.count || 0;
      pendingLeadsCount = pendingLeadsRes.count || 0;

      const totalSentAll = totalSentLogsRes.count || 0;
      const totalErrorsAll = totalErrorLogsRes.count || 0;
      const allTimeAttempts = totalSentAll + totalErrorsAll;
      const globalPlacementRate = allTimeAttempts > 0 
        ? Math.round((totalSentAll / allTimeAttempts) * 100) 
        : 100;

      const hourlySends = new Array(10).fill(0);
      let todayErrors = 0;

      if (todayLogsRes.data) {
        for (const log of todayLogsRes.data) {
          if (log.event_type === 'sent') {
            todaySends++;
            const hour = new Date(log.created_at).getHours();
            const bucket = hour - 9; // 09:00 -> 0, 18:00 -> 9
            if (bucket >= 0 && bucket < 10) {
              hourlySends[bucket]++;
            }
          } else if (log.event_type === 'error') {
            todayErrors++;
          }
        }
      }

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

      return (
        <HubLiveView
          stats={{
            campaignsTotal,
            campaignsActive,
            newslettersTotal,
            newslettersScheduled,
            newslettersSending,
            todaySends,
            todayErrors,
            hourlySends,
            pendingLeadsCount,
            latestCampaign,
            latestNewsletter,
            globalPlacementRate,
          }}
        />
      );
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
        todayErrors: 0,
        hourlySends: new Array(10).fill(0),
        pendingLeadsCount,
        latestCampaign,
        latestNewsletter,
        globalPlacementRate: 100,
      }}
    />
  );
}
