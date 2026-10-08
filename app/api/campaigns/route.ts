import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CampaignSchema } from '@/lib/validations/campaign';
import { enrichCampaignsWithStats } from '@/lib/campaigns/stats';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch count stats for each campaign accurately
  const campaignsWithStats = await enrichCampaignsWithStats(supabase, campaigns || []);

  return NextResponse.json(campaignsWithStats);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const body = await request.json();

  const parsed = CampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
  }

  const insertPayload = {
    ...parsed.data,
    user_id: user.id,
    start_at: parsed.data.start_at || null,
  };

  const { data, error } = await supabase
    .from('campaigns')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
