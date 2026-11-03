import { NextRequest, NextResponse } from 'next/server';
import { requireTenant, requireWrite, tenantErrorResponse } from '@/lib/konta/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tenant = await requireTenant();
    const supabase = tenant.supabase;

    // The newsletter must belong to the active organization
    const { data: newsletter, error: nlError } = await supabase
      .from('mail_newsletters')
      .select('id')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();

    if (nlError || !newsletter) {
      return NextResponse.json({ error: 'Newsletter non trovata' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('mail_newsletter_subscribers')
      .select('*', { count: 'exact' })
      .eq('newsletter_id', id)
      .eq('organization_id', tenant.organizationId)
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
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tenant = await requireTenant();
    requireWrite(tenant);
    const supabase = tenant.supabase;

    const { data: newsletter, error: nlError } = await supabase
      .from('mail_newsletters')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle();

    if (nlError || !newsletter) {
      return NextResponse.json({ error: 'Newsletter non trovata' }, { status: 404 });
    }

    if (newsletter.status === 'sending') {
      return NextResponse.json(
        { error: 'Non è possibile importare destinatari durante l’invio. Metti in pausa la newsletter prima di importare.' },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const rawInput: unknown =
      body && typeof body === 'object' ? (body as { subscribers?: unknown }).subscribers : undefined;

    if (!Array.isArray(rawInput) || rawInput.length === 0) {
      return NextResponse.json({ error: 'Nessun destinatario fornito' }, { status: 400 });
    }
    const rawSubscribers = rawInput as { email?: string; name?: string }[];

    // Fetch existing emails for this newsletter to avoid duplicates
    const existingEmails = new Set<string>();
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: pageRows } = await supabase
        .from('mail_newsletter_subscribers')
        .select('email')
        .eq('newsletter_id', id)
        .eq('organization_id', tenant.organizationId)
        .range(from, from + pageSize - 1);

      if (!pageRows || pageRows.length === 0) break;
      for (const r of pageRows as { email: string }[]) {
        existingEmails.add(r.email.toLowerCase());
      }
      if (pageRows.length < pageSize) break;
      from += pageSize;
    }

    const validToInsert: { organization_id: string; newsletter_id: string; email: string; name: string | null }[] = [];
    const invalidEmails: string[] = [];
    let duplicatesCount = 0;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const item of rawSubscribers) {
      const cleanEmail = typeof item?.email === 'string' ? item.email.trim().toLowerCase() : '';
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        invalidEmails.push((typeof item?.email === 'string' && item.email) || '(vuoto)');
        continue;
      }
      if (existingEmails.has(cleanEmail)) {
        duplicatesCount++;
        continue;
      }

      existingEmails.add(cleanEmail);
      validToInsert.push({
        organization_id: tenant.organizationId,
        newsletter_id: id,
        email: cleanEmail,
        name: typeof item.name === 'string' ? item.name.trim() || null : null,
      });
    }

    if (validToInsert.length > 0) {
      // Insert in batches of 500
      for (let i = 0; i < validToInsert.length; i += 500) {
        const chunk = validToInsert.slice(i, i + 500);
        const { error: insertErr } = await supabase
          .from('mail_newsletter_subscribers')
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
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
