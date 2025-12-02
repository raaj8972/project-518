
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const newAdmins = [
  { email: 'avik@rico.com', password: 'raja8972' },
  { email: 'panda@rico.com', password: 'raja8972' },
  { email: 'avirup@rico.com', password: 'avirup@2026' }
];

const permissions = {
  can_events: true,
  can_schedule: true,
  can_gallery: true,
  can_sponsors: true,
  can_registrations: true,
  can_registration_photos: true,
  can_faculty: true,
  can_core_team: true,
  can_guest_artists: true,
  can_chief_guests: true,
  can_homebound: true,
  can_sports: true
};

async function createAdmin(email, password) {
  console.log(`Creating admin: ${email}`);

  // 1. Create Auth User
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  });

  let userId;

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log(`User ${email} already exists. Fetching ID...`);
      // Try to find the user by email (not directly supported by admin api easily without listUsers, but let's try listUsers)
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('Error listing users:', listError);
        return;
      }
      const user = users.users.find(u => u.email === email);
      if (user) {
        userId = user.id;
      } else {
        console.error(`Could not find user ID for ${email}`);
        return;
      }
    } else {
      console.error(`Error creating auth user for ${email}:`, authError);
      return;
    }
  } else {
    userId = authData.user.id;
    console.log(`Created auth user ${userId}`);
  }

  // 2. Insert into admin_users
  const { error: adminError } = await supabase
    .from('admin_users')
    .upsert({ user_id: userId, email: email, role: 'admin' }, { onConflict: 'user_id' });

  if (adminError) {
    console.error(`Error inserting into admin_users for ${email}:`, adminError);
  } else {
    console.log(`Upserted admin_users for ${email}`);
  }

  // 3. Insert permissions
  const { error: permError } = await supabase
    .from('admin_permissions')
    .upsert({ user_id: userId, ...permissions }, { onConflict: 'user_id' });

  if (permError) {
    console.error(`Error setting permissions for ${email}:`, permError);
  } else {
    console.log(`Set permissions for ${email}`);
  }
}

async function main() {
  for (const admin of newAdmins) {
    await createAdmin(admin.email, admin.password);
  }
}

main();
