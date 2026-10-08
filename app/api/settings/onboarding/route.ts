import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const completed = body.completed ?? true;

  const admin = createAdminClient();

  // 1. Update user_settings
  await admin
    .from('user_settings')
    .upsert(
      {
        user_id: user.id,
        onboarding_completed: completed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  // 2. Also update Supabase auth user_metadata
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      onboarding_completed: completed,
      onboarding_completed_at: new Date().toISOString(),
    },
  });

  return NextResponse.json({ success: true, onboarding_completed: completed });
}
