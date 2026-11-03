import { getTenantOrNull } from '@/lib/konta/session';
import { loadSenderSettings } from '@/lib/email/transporter';
import Hub, { type HubData } from '@/components/konta/Hub';

export const dynamic = 'force-dynamic';

function timeWindows() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return { startOfDay, since30d };
}

/** Hub dell'organizzazione attiva: solo numeri letti dal database, nessun indicatore decorativo. */
export default async function HomePage() {
  const tenant = await getTenantOrNull();
  if (!tenant) return <Hub data={null} />;

  const supabase = tenant.supabase;
  const orgId = tenant.organizationId;
  const { startOfDay, since30d } = timeWindows();

  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);

  const [
    sentToday,
    errorsToday,
    queuedLeads,
    queuedSubscribers,
    bounces30d,
    activeCampaigns,
    openNewsletters,
    nextCampaign,
    nextNewsletter,
    settings,
  ] = await Promise.all([
    count(supabase.from('mail_email_logs').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('event_type', 'sent').gte('created_at', startOfDay.toISOString())),
    count(supabase.from('mail_email_logs').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('event_type', 'error').gte('created_at', startOfDay.toISOString())),
    count(supabase.from('mail_campaign_leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).in('status', ['pending', 'retry'])),
    count(supabase.from('mail_newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'pending')),
    count(supabase.from('mail_bounces').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('detected_at', since30d)),
    supabase.from('mail_campaigns').select('id, name, status, next_send_at').eq('organization_id', orgId).in('status', ['active', 'paused']).order('updated_at', { ascending: false }).limit(5),
    supabase.from('mail_newsletters').select('id, title, status, next_send_at, scheduled_at').eq('organization_id', orgId).in('status', ['scheduled', 'sending', 'paused']).order('updated_at', { ascending: false }).limit(5),
    supabase.from('mail_campaigns').select('next_send_at').eq('organization_id', orgId).eq('status', 'active').not('next_send_at', 'is', null).order('next_send_at', { ascending: true }).limit(1),
    supabase.from('mail_newsletters').select('next_send_at').eq('organization_id', orgId).in('status', ['scheduled', 'sending']).not('next_send_at', 'is', null).order('next_send_at', { ascending: true }).limit(1),
    loadSenderSettings(orgId).catch(() => null),
  ]);

  const campaigns = await Promise.all(
    ((activeCampaigns.data || []) as Array<{ id: string; name: string; status: string; next_send_at: string | null }>).map(async (c) => {
      const [total, sent] = await Promise.all([
        count(supabase.from('mail_campaign_leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('campaign_id', c.id)),
        count(supabase.from('mail_campaign_leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('campaign_id', c.id).eq('status', 'sent')),
      ]);
      return { ...c, total, sent };
    })
  );

  const newsletters = await Promise.all(
    ((openNewsletters.data || []) as Array<{ id: string; title: string; status: string; next_send_at: string | null; scheduled_at: string | null }>).map(async (n) => {
      const [total, sent] = await Promise.all([
        count(supabase.from('mail_newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('newsletter_id', n.id)),
        count(supabase.from('mail_newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('newsletter_id', n.id).eq('status', 'sent')),
      ]);
      return { id: n.id, name: n.title, status: n.status, next_send_at: n.next_send_at || n.scheduled_at, total, sent };
    })
  );

  const nextDue = [nextCampaign.data?.[0]?.next_send_at, nextNewsletter.data?.[0]?.next_send_at]
    .filter((v): v is string => Boolean(v))
    .sort()[0] ?? null;

  const data: HubData = {
    organizationName: tenant.organizationName,
    canWrite: tenant.canWrite,
    mailkState: tenant.mailkState,
    sender: {
      configured: Boolean(settings?.smtp_host),
      verified: Boolean(settings?.is_verified),
      fromEmail: settings?.from_email || '',
    },
    sentToday,
    errorsToday,
    queued: queuedLeads + queuedSubscribers,
    bounces30d,
    nextDue,
    campaigns,
    newsletters,
  };

  return <Hub data={data} />;
}
