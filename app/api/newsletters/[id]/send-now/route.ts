import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { dispatchNextEmailForNewsletter } from '@/lib/email/newsletter-dispatcher';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { data: newsletter, error: nlError } = await userSupabase
    .from('newsletters')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (nlError || !newsletter) {
    return NextResponse.json({ error: 'Newsletter non trovata' }, { status: 404 });
  }

  const adminSupabase = createAdminClient();

  try {
    const result = await dispatchNextEmailForNewsletter(adminSupabase, newsletter);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error during manual newsletter send-now:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
