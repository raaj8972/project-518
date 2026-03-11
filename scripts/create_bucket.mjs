import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// We need the service role key to reliably create buckets/policies if anon key lacks permission
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const BUCKET_NAME = 'hero_v2';

  console.log(`Checking if bucket '${BUCKET_NAME}' exists...`);
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }

  const exists = buckets.some(b => b.name === BUCKET_NAME);
  
  if (exists) {
    console.log(`Bucket '${BUCKET_NAME}' already exists.`);
  } else {
    console.log(`Creating bucket '${BUCKET_NAME}'...`);
    const { data: createData, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/*', 'video/*'],
      fileSizeLimit: 52428800 // 50MB
    });

    if (createError) {
      console.error('Error creating bucket:', createError);
      return;
    }
    console.log(`Bucket '${BUCKET_NAME}' created successfully:`, createData);
  }
}

main();
