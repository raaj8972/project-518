
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAndInsert() {
  const { data: events, error } = await supabase.from('events').select('id').order('id', { ascending: false }).limit(1);
  if (error) {
    console.error('Error fetching max ID:', error);
    return;
  }

  let nextId = 1;
  if (events && events.length > 0) {
    nextId = parseInt(events[0].id) + 1;
  }
  console.log('Next ID should be:', nextId);

  const soloChallenge = {
    id: nextId.toString(),
    title: "Solo Coding Challenge",
    category: "Technical",
    description: "Battle it out in a solo algorithmic sprint. Solve 5 problems in 2 hours to win the prize pool!",
    image: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?auto=format&fit=crop&q=80&w=1000",
    date: "2024-10-15",
    time: "2:00 PM - 4:00 PM",
    venue: "Lab 302 / Online",
    participants: "100+",
    highlights: ["Algorithmic Problems", "Live Leaderboard", "Prize Pool"],
    registration_open: true,
    visible: true,
    registration_default_mode: "individual",
    registration_participant_types: ["Student", "Professional"],
    display_order: 10,
    featured: true,
    rules: ["Individual participation only", "No external libraries", "2-hour time limit"],
    payment_amount: 0,
    current_registrations: 0,
    registration_timer_enabled: false,
    registration_mode_locked: false,
    registration_participant_quotas: {}
  };

  const megaHackathon = {
    id: (nextId + 1).toString(),
    title: "Mega Hackathon 2024",
    category: "Technical",
    description: "A 24-hour innovation marathon. Build a complete project from scratch and pitch to industry experts.",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1000",
    date: "2024-11-20",
    time: "10:00 AM onwards",
    venue: "Main Campus Grounds",
    participants: "250+",
    highlights: ["24-Hour Hack", "Industry Mentors", "Mega Prizes"],
    registration_open: true,
    visible: true,
    registration_default_mode: "team",
    team_min_members: 2,
    team_max_members: 4,
    registration_participant_types: ["Student"],
    display_order: 11,
    featured: true,
    rules: ["Teams of 2-4 members", "Original code only", "Final pitch required"],
    payment_amount: 0,
    current_registrations: 0,
    registration_timer_enabled: false,
    registration_mode_locked: false,
    registration_participant_quotas: {}
  };

  console.log('Inserting Solo Coding Challenge...');
  const { data: data1, error: error1 } = await supabase.from('events').insert([soloChallenge]).select();
  if (error1) {
    console.error('Error inserting Solo Coding Challenge:', error1);
  } else {
    console.log('Inserted Solo Coding Challenge with ID:', data1[0].id);
  }

  console.log('Inserting Mega Hackathon 2024...');
  const { data: data2, error: error2 } = await supabase.from('events').insert([megaHackathon]).select();
  if (error2) {
    console.error('Error inserting Mega Hackathon 2024:', error2);
  } else {
    console.log('Inserted Mega Hackathon 2024 with ID:', data2[0].id);
  }
}

fixAndInsert();
