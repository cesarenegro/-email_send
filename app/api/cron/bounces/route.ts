import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncBouncesFromImap } from '@/lib/email/imap-bounce-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    const result = await syncBouncesFromImap(supabase, { limitMessages: 100 });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error during cron bounce sync:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
