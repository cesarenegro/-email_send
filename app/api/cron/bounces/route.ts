import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncBouncesFromImap, type BounceSyncResult } from '@/lib/email/imap-bounce-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Numero massimo di organizzazioni sincronizzate per esecuzione del cron. */
const MAX_ORGANIZATIONS_PER_RUN = 10;

interface OrganizationBounceResult {
  organization_id: string;
  result?: BounceSyncResult;
  error?: string;
}

export async function GET(request: NextRequest) {
  return handleCronBounces(request);
}

export async function POST(request: NextRequest) {
  return handleCronBounces(request);
}

async function handleCronBounces(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization')?.trim();

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Organizations with a configured IMAP mailbox
    const { data: rows, error } = await supabase
      .from('mail_sender_settings')
      .select('organization_id')
      .neq('imap_host', '')
      .order('updated_at', { ascending: true })
      .limit(MAX_ORGANIZATIONS_PER_RUN);

    if (error) {
      return NextResponse.json({ error: `Lettura impostazioni mittente fallita: ${error.message}` }, { status: 500 });
    }

    const organizations = Array.from(
      new Set(((rows || []) as { organization_id: string }[]).map((r) => r.organization_id))
    );

    const results: OrganizationBounceResult[] = [];

    // Sequential: one IMAP connection at a time
    for (const organizationId of organizations) {
      try {
        const result = await syncBouncesFromImap(supabase, organizationId, { limitMessages: 100 });
        results.push({ organization_id: organizationId, result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error during cron bounce sync for organization ${organizationId}:`, message);
        results.push({ organization_id: organizationId, error: message });
      }
    }

    return NextResponse.json({ organizations: organizations.length, results });
  } catch (err) {
    console.error('Error during cron bounce sync:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
