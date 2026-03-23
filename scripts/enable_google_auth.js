import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function enableGoogleAuth() {
  console.log('Checking site_settings...');
  
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Error fetching site_settings:', error.message);
    
    // If it doesn't exist, try to insert it
    if (error.code === 'PGRST116') {
        console.log('site_settings row with id 1 not found. Creating one...');
        const { error: insertError } = await supabase
            .from('site_settings')
            .insert({ id: 1, student_google_auth_enabled: true });
        
        if (insertError) {
            console.error('Error creating site_settings:', insertError.message);
        } else {
            console.log('Successfully created site_settings and enabled Google Auth.');
        }
    }
    return;
  }

  console.log('Current settings:', data);
  
  if (data.student_google_auth_enabled) {
    console.log('Google Auth is ALREADY enabled for students.');
  } else {
    console.log('Enabling Google Auth for students...');
    const { error: updateError } = await supabase
      .from('site_settings')
      .update({ student_google_auth_enabled: true })
      .eq('id', 1);

    if (updateError) {
      console.error('Error updating site_settings:', updateError.message);
    } else {
      console.log('Successfully enabled Google Auth for students.');
    }
  }
}

enableGoogleAuth();
