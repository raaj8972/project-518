
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listSubcategories() {
  console.log('Listing unique subcategories...');
  const { data, error } = await supabase
    .from('gallery_images')
    .select('subcategory, src')
    .limit(500);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const counts = {};
  data.forEach(img => {
    const sub = img.subcategory || 'null';
    if (!counts[sub]) counts[sub] = { count: 0, sample: img.src };
    counts[sub].count++;
  });

  console.log('Subcategories found in DB:');
  console.log(JSON.stringify(counts, null, 2));
}

listSubcategories();
