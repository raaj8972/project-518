
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const email = 'raja.rg66@gmail.com';
  const eventTitle = 'UNO';

  // 1. Get Event ID
  const { data: event } = await supabase.from('events').select('id').eq('title', eventTitle).single();
  if (!event) {
    console.error('Event UNO not found');
    return;
  }
  const eventId = event.id;
  console.log('Event ID:', eventId);

  // 2. Check raw registrations for this user/event
  const { data: allRegs } = await supabase
    .from('registrations')
    .select('id, status, email, phone')
    .eq('event_id', eventId)
    .eq('email', email);
  
  console.log('All registrations for user:', allRegs);

  // 3. Run the EXACT query from RegistrationModal
  // .eq('event_id', eventId)
  // .or(`email.eq.${formData.email.toLowerCase().trim()},phone.eq.${formData.phone.trim()}`)
  // .in('status', ['pending', 'approved']);
  
  const { data: duplicateRegs, error } = await supabase
    .from('registrations')
    .select('id, status, full_name, email, phone')
    .eq('event_id', eventId)
    .or(`email.eq.${email},phone.eq.dummy`) // simplified phone
    .in('status', ['pending', 'approved']);

  if (error) {
    console.error('Query error:', error);
  } else {
    console.log('Duplicate check result:', duplicateRegs);
  }
}

check();
