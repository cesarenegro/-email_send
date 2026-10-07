import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CampaignSchema } from '@/lib/validations/campaign';

export async function GET() {
  const supabase = await createClient();

  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch count stats for each campaign
  const campaignsWithStats = await Promise.all(
    (campaigns || []).map(async (camp) => {
      const { data: leads } = await supabase
        .from('campaign_leads')
        .select('status')
        .eq('campaign_id', camp.id);

      const total = leads?.length || 0;
      const sent = leads?.filter((l) => l.status === 'sent').length || 0;
      const failed = leads?.filter((l) => l.status === 'failed').length || 0;
      const pending = total - sent - failed;

      return {
        ...camp,
        total_leads: total,
        sent_count: sent,
        pending_count: pending,
        failed_count: failed,
      };
    })
  );

  return NextResponse.json(campaignsWithStats);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const parsed = CampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('campaigns')
    .insert([parsed.data])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
