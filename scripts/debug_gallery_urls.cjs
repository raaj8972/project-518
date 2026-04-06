
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkImages() {
  console.log('Checking Academic Award category...');
  const { data, error } = await supabase
    .from('gallery_images')
    .select('id, src, category, subcategory')
    .eq('category', 'Academic Award')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample data for Academic Award:');
  console.log(JSON.stringify(data, null, 2));

  console.log('\nChecking Short Film category (which works):');
  const { data: workingData } = await supabase
    .from('gallery_images')
    .select('id, src, category, subcategory')
    .eq('category', 'Short Film')
    .limit(2);

  console.log('Sample data for Short Film:');
  console.log(JSON.stringify(workingData, null, 2));
}

checkImages();
