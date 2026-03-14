
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://isfqhascrdzaoebhuohs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDE0MSwiZXhwIjoyMDczMDc2MTQxfQ.RiLXG5KPvN62KlnW1v8c2mVbg6Nu3bEYHjKUhvlSYJM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFetch() {
  const userId = 'DTPme52mVGXpZCadgjetVj67NBC2';
  console.log(`Testing query for user_id: '${userId}'`);
  
  const { data, error } = await supabase
    .from('passkeys')
    .select('id, credential_id, user_id, email, created_at')
    .eq('user_id', userId);
    
  if (error) {
    console.error('Query error:', error);
  } else {
    console.log(`Found ${data.length} records:`);
    console.table(data);
    
    if (data.length === 0) {
      console.log('No direct match. Checking for case sensitivity or whitespace...');
      const { data: allData } = await supabase.from('passkeys').select('user_id, email').limit(10);
      console.log('Recent user_ids in DB:');
      console.table(allData);
    }
  }
}

testFetch();
