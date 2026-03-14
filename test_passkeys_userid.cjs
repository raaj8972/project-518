
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://isfqhascrdzaoebhuohs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDE0MSwiZXhwIjoyMDczMDc2MTQxfQ.RiLXG5KPvN62KlnW1v8c2mVbg6Nu3bEYHjKUhvlSYJM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPasskeysUserIDType() {
  try {
    // Try to insert a dummy row into passkeys with a string user_id
    // Providing required fields: credential_id, public_key
    const { error: insertError } = await supabase.from('passkeys').insert({
      user_id: 'test-firebase-uid-passkeys',
      credential_id: 'test-cred-' + Date.now(),
      public_key: 'test-pk-' + Date.now(),
    });
    
    if (insertError) {
      console.log('Insert into passkeys with string user_id failed:');
      console.log('Error Message:', insertError.message);
      console.log('Error Code:', insertError.code);
    } else {
      console.log('Insert into passkeys with string user_id succeeded! user_id is already TEXT.');
      // Cleanup
      await supabase.from('passkeys').delete().eq('user_id', 'test-firebase-uid-passkeys');
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

checkPasskeysUserIDType();
