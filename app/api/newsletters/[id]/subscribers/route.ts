import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('newsletter_subscribers')
    .select('*', { count: 'exact' })
    .eq('newsletter_id', id)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    subscribers: data,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const { data: newsletter, error: nlError } = await supabase
    .from('newsletters')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (nlError || !newsletter) {
    return NextResponse.json({ error: 'Newsletter non trovata' }, { status: 404 });
  }

  if (newsletter.status === 'sending') {
    return NextResponse.json(
      { error: 'Non è possibile importare destinatari durante l’invio. Metti in pausa la newsletter prima di importare.' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const rawSubscribers: { email?: string; name?: string }[] = body.subscribers;

  if (!Array.isArray(rawSubscribers) || rawSubscribers.length === 0) {
    return NextResponse.json({ error: 'Nessun destinatario fornito' }, { status: 400 });
  }

  // Fetch existing emails for this newsletter to avoid duplicates
  const existingEmails = new Set<string>();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data: pageRows } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('newsletter_id', id)
      .range(from, from + pageSize - 1);

    if (!pageRows || pageRows.length === 0) break;
    for (const r of pageRows) {
      existingEmails.add(r.email.toLowerCase());
    }
    if (pageRows.length < pageSize) break;
    from += pageSize;
  }

  const validToInsert: { newsletter_id: string; email: string; name: string | null }[] = [];
  const invalidEmails: string[] = [];
  let duplicatesCount = 0;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const item of rawSubscribers) {
    const cleanEmail = item.email?.trim().toLowerCase();
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      invalidEmails.push(item.email || '(vuoto)');
      continue;
    }
    if (existingEmails.has(cleanEmail)) {
      duplicatesCount++;
      continue;
    }

    existingEmails.add(cleanEmail);
    validToInsert.push({
      newsletter_id: id,
      email: cleanEmail,
      name: item.name?.trim() || null,
    });
  }

  if (validToInsert.length > 0) {
    // Insert in batches of 500
    for (let i = 0; i < validToInsert.length; i += 500) {
      const chunk = validToInsert.slice(i, i + 500);
      const { error: insertErr } = await supabase
        .from('newsletter_subscribers')
        .insert(chunk);

      if (insertErr) {
        return NextResponse.json({ error: `Errore inserimento: ${insertErr.message}` }, { status: 500 });
      }
    }
  }

  return NextResponse.json({
    imported: validToInsert.length,
    duplicates: duplicatesCount,
    invalid: invalidEmails.length,
    invalidSamples: invalidEmails.slice(0, 5),
  });
}
