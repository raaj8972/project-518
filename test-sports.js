import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

async function checkSports() {
    try {
        console.log('Connecting to Supabase:', SUPABASE_URL);
        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
        const { data, error } = await adminClient.from('sports_seasons').select('*');
        console.log('Supabase Result:', JSON.stringify(data, null, 2));
        if (error) console.error('Supabase Error:', error);
    } catch (err) {
        console.error('Crash:', err);
    }
}
checkSports();
