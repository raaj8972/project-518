
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://isfqhascrdzaoebhuohs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDE0MSwiZXhwIjoyMDczMDc2MTQxfQ.RiLXG5KPvN62KlnW1v8c2mVbg6Nu3bEYHjKUhvlSYJM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectData() {
  try {
    console.log('--- admin_users ---');
    const { data: admins, error: adminError } = await supabase.from('admin_users').select('user_id, email, role').limit(10);
    if (adminError) console.error('Admin Error:', adminError);
    else console.table(admins);

    console.log('\n--- passkeys ---');
    const { data: pks, error: pkError } = await supabase.from('passkeys').select('id, user_id, email, credential_id').limit(10);
    if (pkError) console.error('Passkey Error:', pkError);
    else console.table(pks);

  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

inspectData();
