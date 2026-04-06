import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log("Seeding dummy data for RICO Family UI...");

  // Seed Faculty Head
  const { data: faculty, error: fErr } = await supabase.from('faculty_heads').upsert([
    {
      name: "Dr. Alpha Leader",
      title: "Dean of Activities",
      image: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?q=80&w=1000&auto=format&fit=crop",
      description: "Driving the core vision of the student council with years of academic excellence.",
      enabled: true,
      order_position: 1
    }
  ]).select();
  if (fErr) console.error("Error faculty:", fErr);
  else console.log("Added faculty:", faculty?.length);

  // Seed Committees
  const { data: committees, error: cErr } = await supabase.from('core_committees').upsert([
    {
      id: 9991,
      name: "Web Development",
      description: "The digital architects of the council.",
      color: "#06b6d4",
      enabled: true,
      is_core: true,
      order_position: 1
    },
    {
      id: 9992,
      name: "Event Management",
      description: "Masters of ceremony and crowd control.",
      color: "#f43f5e",
      enabled: true,
      is_core: true,
      order_position: 2
    }
  ]).select();

  if (cErr) console.error("Error committees:", cErr);
  else console.log("Added committees:", committees?.length);

  // Seed Heads and Members
  const webCommitteeId = 9991;
  const eventCommitteeId = 9992;

  const { data: members, error: mErr } = await supabase.from('core_team_members').upsert([
    // WEB DEV HEAD
    {
      id: 99901,
      name: "Raaj Tech",
      role: "Lead Web Developer",
      committee_id: webCommitteeId,
      image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop",
      description: "Created the massive dynamic architecture.",
      specialty: "React \u0026 Supabase",
      enabled: true,
      is_head: true,
      order_position: 1
    },
    // WEB DEV MEMBERS
    {
      id: 99902,
      name: "Alice UX",
      role: "Frontend Dev",
      committee_id: webCommitteeId,
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop",
      description: "Designs smooth interactions.",
      specialty: "UI/UX",
      enabled: true,
      is_head: false,
      order_position: 2
    },
    {
      id: 99903,
      name: "Bob Backend",
      role: "Backend Dev",
      committee_id: webCommitteeId,
      image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=1000&auto=format&fit=crop",
      description: "Manages the database schemas.",
      specialty: "NodeJS",
      enabled: true,
      is_head: false,
      order_position: 3
    },
    // EVENT HEAD
    {
      id: 99904,
      name: "Charlie Events",
      role: "Head of Events",
      committee_id: eventCommitteeId,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop",
      description: "Coordinates the massive campus fests.",
      specialty: "Logistics",
      enabled: true,
      is_head: true,
      order_position: 1
    },
    // EVENT MEMBERS
    {
      id: 99905,
      name: "Diana Coordination",
      role: "Event Co-ordinator",
      committee_id: eventCommitteeId,
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1000&auto=format&fit=crop",
      description: "Ensures timing and execution are perfect.",
      specialty: "Execution",
      enabled: true,
      is_head: false,
      order_position: 2
    }
  ]).select();

  if (mErr) console.error("Error members:", mErr);
  else console.log("Added members:", members?.length);

  console.log("Done!");
}

seed();
