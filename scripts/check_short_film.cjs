
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkShortFilm() {
  console.log('Checking Short Film category...');
  const { data, error } = await supabase
    .from('gallery_images')
    .select('category, subcategory, src')
    .eq('category', 'Short Film')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Data for Short Film:');
  console.log(JSON.stringify(data, null, 2));
}

checkShortFilm();
