import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixBucket() {
  console.log("Fixing 'registration-photos' bucket to be PUBLIC and accept PDFs/Images...");
  
  const { data, error } = await supabaseAdmin.storage.updateBucket('registration-photos', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif', 'application/pdf'],
    fileSizeLimit: 10485760 // 10MB
  });
  
  if (error) {
    console.error("Failed to update bucket:", error);
    
    console.log("Creating bucket if it doesn't exist...");
    const { data: createData, error: createError } = await supabaseAdmin.storage.createBucket('registration-photos', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif', 'application/pdf'],
      fileSizeLimit: 10485760
    });
    if (createError) console.error("Create failed:", createError);
    else console.log("Created successfully!");
  } else {
    console.log("Updated bucket successfully!", data);
  }
}

fixBucket();
