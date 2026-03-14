
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://isfqhascrdzaoebhuohs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDE0MSwiZXhwIjoyMDczMDc2MTQxfQ.RiLXG5KPvN62KlnW1v8c2mVbg6Nu3bEYHjKUhvlSYJM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPasskeyColumns() {
  try {
    const { data, error } = await supabase.from('passkey_challenges').select('*').limit(1);
    if (error) {
      console.error('Error fetching passkey_challenges:', error.message);
    } else {
      console.log('passkey_challenges columns:', data.length > 0 ? Object.keys(data[0]) : 'No data in table');
      
      // Also try to insert a dummy row with a string user_id
      const { error: insertError } = await supabase.from('passkey_challenges').insert({
        challenge: 'test-challenge-' + Date.now(),
        user_id: 'test-firebase-uid',
        email: 'test@example.com'
      });
      
      if (insertError) {
        console.error('Test insert failed:', insertError.message, insertError.code);
      } else {
        console.log('Test insert succeeded! Strings and email column are supported.');
        // Cleanup
        await supabase.from('passkey_challenges').delete().eq('user_id', 'test-firebase-uid');
      }
    }
    
    // Check passkeys table too
    const { data: pkData, error: pkError } = await supabase.from('passkeys').select('*').limit(1);
    if (pkError) {
      console.error('Error fetching passkeys:', pkError.message);
    } else {
      console.log('passkeys columns:', pkData.length > 0 ? Object.keys(pkData[0]) : 'No data in table');
    }

  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

checkPasskeyColumns();
