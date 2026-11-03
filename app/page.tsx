import { getTenantOrNull } from '@/lib/konta/session';
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
  let todayErrors = 0;
  let hourlySends: number[] = new Array(10).fill(0);
  let globalPlacementRate = 100;

  try {
    const tenant = await getTenantOrNull();

    if (tenant) {
      const supabase = tenant.supabase;
      const orgId = tenant.organizationId;
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
          .from('mail_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId),
        supabase
          .from('mail_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'active'),
        supabase
          .from('mail_newsletters')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId),
        supabase
          .from('mail_newsletters')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'scheduled'),
        supabase
          .from('mail_newsletters')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'sending'),
        supabase
          .from('mail_email_logs')
          .select('created_at, event_type')
          .eq('organization_id', orgId)
          .gte('created_at', startOfDay.toISOString()),
        supabase
          .from('mail_campaign_leads')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'pending'),
        supabase
          .from('mail_campaigns')
          .select('id, name, status, updated_at')
          .eq('organization_id', orgId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('mail_newsletters')
          .select('id, title, status, subject')
          .eq('organization_id', orgId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('mail_email_logs')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('event_type', 'sent'),
        supabase
          .from('mail_email_logs')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
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
      globalPlacementRate = allTimeAttempts > 0
        ? Math.round((totalSentAll / allTimeAttempts) * 100)
        : 100;

      hourlySends = new Array(10).fill(0);
      todayErrors = 0;

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
            .from('mail_campaign_leads')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('campaign_id', camp.id),
          supabase
            .from('mail_campaign_leads')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
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
