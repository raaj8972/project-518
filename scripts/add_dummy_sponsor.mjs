
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDummySponsor() {
  console.log('--- ADDING DUMMY TITLE SPONSOR ---');

  const dummySponsor = {
    name: 'AURELIUS TECH',
    category: 'Title Sponsor',
    logo: 'https://isfqhascrdzaoebhuohs.supabase.co/storage/v1/object/public/ricorrenza-public/dummy_sponsor_logo.png', // We will upload the generated logo
    description: 'Aurelius Tech is a global leader in providing advanced technological solutions for modern enterprises.',
    website: 'https://aureliustech.com',
    featured: true
  };

  // Note: Since I can't easily upload to Supabase storage from here without more complex setup, 
  // I will use a publicly accessible URL for now or just a placeholder if needed.
  // Actually, I just generated an image. I can't use its local path in the DB since the frontend won't see it.
  
  // I'll use a high-quality placeholder that looks like a real logo for now to ensure it works.
  dummySponsor.logo = 'https://placehold.co/600x400/111/f59e0b?text=AURELIUS';

  const { data, error } = await supabase
    .from('sponsors')
    .insert([dummySponsor])
    .select();

  if (error) {
    console.error('Error adding sponsor:', error);
  } else {
    console.log('Successfully added dummy sponsor:', data);
  }
}

addDummySponsor();
