
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listCategories() {
  console.log('Listing unique categories...');
  const { data, error } = await supabase
    .from('gallery_images')
    .select('category');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const counts = {};
  data.forEach(img => {
    const cat = img.category || 'null';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  console.log('Categories found in DB:');
  console.log(JSON.stringify(counts, null, 2));
}

listCategories();
