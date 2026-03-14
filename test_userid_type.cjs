
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://isfqhascrdzaoebhuohs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDE0MSwiZXhwIjoyMDczMDc2MTQxfQ.RiLXG5KPvN62KlnW1v8c2mVbg6Nu3bEYHjKUhvlSYJM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserIDType() {
  try {
    // Try to insert a dummy row with a string user_id but WITHOUT email column
    const { error: insertError } = await supabase.from('passkey_challenges').insert({
      challenge: 'test-challenge-' + Date.now(),
      user_id: 'test-firebase-uid-string'
    });
    
    if (insertError) {
      console.log('Insert with string user_id failed as expected or due to UUID constraint:');
      console.log('Error Message:', insertError.message);
      console.log('Error Code:', insertError.code);
    } else {
      console.log('Insert with string user_id succeeded! user_id is already TEXT.');
      // Cleanup
      await supabase.from('passkey_challenges').delete().eq('user_id', 'test-firebase-uid-string');
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

checkUserIDType();
