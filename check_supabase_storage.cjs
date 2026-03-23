
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError);
  } else {
    console.log('Available buckets:');
    buckets.forEach(b => console.log(`- ${b.id} (Public: ${b.public})`));
    
    // Check specific buckets
    for (const id of ['band-images', 'event-images', 'event-stamps']) {
      const bucket = buckets.find(b => b.id === id);
      if (bucket) {
        const { data: files, error: filesError } = await supabase.storage.from(id).list();
        if (filesError) {
          console.error(`Error listing files in ${id}:`, filesError);
        } else {
          console.log(`${id} has ${files.length} files.`);
        }
      } else {
        console.warn(`${id} bucket NOT FOUND.`);
      }
    }
  }
}

checkStorage();
