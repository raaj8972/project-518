import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function checkBuckets() {
  console.log("Checking buckets with Service Key...");
  const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
  
  if (bucketError) {
    console.error("Failed to list buckets:", bucketError);
  } else {
    console.log("Existing Buckets:");
    buckets.forEach(b => console.log(` - ${b.name} (public: ${b.public})`));
  }

  console.log("\nTesting upload with Anon Key to 'registration-photos'...");
  const testFileName = `test_${Date.now()}.txt`;
  
  const { data, error } = await supabaseAnon.storage
    .from('registration-photos')
    .upload(testFileName, 'Hello World', {
      contentType: 'text/plain',
      upsert: false
    });

  if (error) {
    console.error("Upload failed:", error);
  } else {
    console.log("Upload succeeded! Data:", data);
    
    // Cleanup
    await supabaseAdmin.storage.from('registration-photos').remove([testFileName]);
  }
}

checkBuckets();
