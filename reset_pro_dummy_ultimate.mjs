
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SQUAD_TEMPLATES = [
  { name: 'TITAN STRIKE', leader: 'Marcus Thorne', photo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=500' },
  { name: 'PHOENIX RISING', leader: 'Elena Vance', photo: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=500' },
  { name: 'QUANTUM EDGE', leader: 'Siddharth Rao', photo: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=500' },
  { name: 'STELLAR KNIGHTS', leader: 'Cassandra Nova', photo: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?q=80&w=500' },
  { name: 'VORTEX SQUAD', leader: 'Jaxson Storm', photo: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=500' },
  { name: 'NEON REPRISE', leader: 'Aria Chrome', photo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=500' },
  { name: 'CYBER PHANTOMS', leader: 'Kaelen Shadow', photo: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=500' },
  { name: 'OMEGA FORCE', leader: 'Raiden V', photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=500' },
  { name: 'AETHER VANGUARD', leader: 'Lyra Belacqua', photo: 'https://images.unsplash.com/photo-1522770179533-24471fcdba45?q=80&w=500' },
  { name: 'VOID RAIDERS', leader: 'Malakai Black', photo: 'https://images.unsplash.com/photo-1510051646651-460d37651a94?q=80&w=500' },
  { name: 'COSMOS ELITE', leader: 'Sarah Kerrigan', photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=500' }
];

const EVENTS_TO_CREATE = [
  { name: 'CYBER CHAMPIONS LEAGUE 2026', category: 'Major', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2000' },
  { name: 'GALACTIC FOOTBALL CUP 2026', category: 'Major', image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000' },
  { name: 'INTERSTELLAR BASKETBALL OPEN', category: 'Major', image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=2000' },
  { name: 'NEBULA CRICKET CHAMPIONSHIP', category: 'Major', image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2000' },
  { name: 'VOLTAGE VOLLEYBALL LEAGUE', category: 'Indoor', image: 'https://images.unsplash.com/photo-1592656094267-764a45159577?q=80&w=2000' },
  { name: 'TITAN TENNIS TROPHY', category: 'Outdoor', image: 'https://images.unsplash.com/photo-1595435066359-61c0fd011006?q=80&w=2000' },
  { name: 'ANDROMEDA ARCHERY CUP', category: 'Outdoor', image: 'https://images.unsplash.com/photo-1511376335346-f18d799d63c3?q=80&w=2000' },
  { name: 'SPECTRE SWIMMING RELAY', category: 'Indoor', image: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?q=80&w=2000' }
];

async function run() {
  console.log('--- STARTING CLEAN PRO DUMMY POPULATION ---');

  // Trigger schema cache reload in case migration was recent
  try { await supabase.rpc('reload_schema_cache'); } catch(e) {}

  // 1. Get a valid season_id (sport_id)
  const { data: seasons } = await supabase.from('sports_seasons').select('id').limit(1);
  if (!seasons || seasons.length === 0) {
    console.error('No sports seasons found. Please create one first.');
    return;
  }
  const seasonId = seasons[0].id;
  console.log('Using season_id:', seasonId);

  // 2. Clear old data
  console.log('Clearing old data...');
  await supabase.from('sports_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('annual_sports_registrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('annual_sports_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 3. Create Events and Teams
  for (const eventInfo of EVENTS_TO_CREATE) {
    console.log(`Creating ${eventInfo.name}...`);
    const eventId = uuidv4();
    
    await supabase.from('annual_sports_events').insert({
      id: eventId,
      name: eventInfo.name,
      category: eventInfo.category,
      image_url: eventInfo.image,
      registration_open: true,
      registration_default_mode: 'team',
      visible: true,
      display_teams: true,
      display_schedule: true
    });

    const teamRegs = SQUAD_TEMPLATES.map(t => ({
      id: uuidv4(),
      event_id: eventId,
      full_name: t.leader,
      email: `${t.name.toLowerCase().replace(/ /g, '')}@example.com`,
      phone: '1234567890',
      status: 'approved',
      is_team_registration: true,
      team_name: t.name,
      total_members: 5,
      photo_url: t.photo,
      metadata: { team_logo_url: t.photo }
    }));

    const { data: createdTeams } = await supabase.from('annual_sports_registrations').insert(teamRegs).select();

    if (createdTeams && createdTeams.length >= 2) {
      // Create 3 matches using annual columns
      const matches = [
        { a: createdTeams[0].id, b: createdTeams[1].id, offset: 1 },
        { a: createdTeams[2].id, b: createdTeams[3].id, offset: 2 },
        { a: createdTeams[4].id, b: createdTeams[5].id, offset: 3 }
      ].map(m => ({
        id: uuidv4(),
        sport_id: seasonId,
        annual_event_id: eventId,
        annual_team_a_id: m.a,
        annual_team_b_id: m.b,
        match_date: new Date(Date.now() + m.offset * 86400000).toISOString(),
        venue: 'Sector 7 Arena',
        status: 'scheduled',
        score1: '0',
        score2: '0'
      }));

      const { error: matchError } = await supabase.from('sports_matches').insert(matches);
      if (matchError) {
        console.error(`Match error for ${eventInfo.name}:`, JSON.stringify(matchError, null, 2));
      } else {
        console.log(`Matches inserted for ${eventInfo.name}`);
      }
    }
  }

  console.log('--- DONE ---');
}

run();
