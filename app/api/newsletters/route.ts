import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NewsletterSchema } from '@/lib/validations/newsletter';
import { enrichNewslettersWithStats } from '@/lib/newsletters/stats';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { data: newsletters, error } = await supabase
    .from('newsletters')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const newslettersWithStats = await enrichNewslettersWithStats(supabase, newsletters || []);

  return NextResponse.json(newslettersWithStats);
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
  const parsed = NewsletterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
  }

  const isScheduled = !!parsed.data.scheduled_at;

  const insertPayload = {
    ...parsed.data,
    user_id: user.id,
    status: isScheduled ? 'scheduled' : 'draft',
    next_send_at: isScheduled ? parsed.data.scheduled_at : null,
  };

  const { data, error } = await supabase
    .from('newsletters')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
