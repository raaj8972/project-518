
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpCategories() {
  console.log('Fetching all unique categories and sample URLs...');
  const { data, error } = await supabase
    .from('gallery_images')
    .select('category, subcategory, src')
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const countsByTitle = {};
  data.forEach(img => {
    const title = img.subcategory || img.category || 'Other';
    if (!countsByTitle[title]) countsByTitle[title] = { count: 0, sample: img.src };
    countsByTitle[title].count++;
  });

  console.log('Category mapping in DB (first 100):');
  console.log(JSON.stringify(countsByTitle, null, 2));
}

dumpCategories();
