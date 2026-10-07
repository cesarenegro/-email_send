import { createClient } from '@supabase/supabase-js';

async function setupAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ADMIN_EMAIL || 'cesare@arkitecna.com';
  const password = process.env.ADMIN_PASSWORD;

  if (!url || !serviceRole || !password) {
    console.error('Missing required environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD)');
    process.exit(1);
  }

  const supabase = createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`Checking/Creating admin user: ${email}...`);
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const existing = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    console.log(`User ${email} already exists (ID: ${existing.id}). Updating password...`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      console.error('Error updating password:', updateError);
    } else {
      console.log(`✅ Admin user password updated and email confirmed!`);
    }
  } else {
    console.log(`Creating new user ${email}...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) {
      console.error('Error creating user:', createError);
    } else {
      console.log(`✅ Admin user created successfully (ID: ${newUser.user?.id})!`);
    }
  }
}

setupAdmin();
