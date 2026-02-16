import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function testUpsert() {
    const allImages = [];
    for (let i = 0; i < 2371; i++) {
        allImages.push({
            src: `test-drive-${i}`,
            category: 'Cultural Fest',
            subcategory: 'Dance',
            title: `Photo ${i}`,
            year: '2026'
        });
    }

    console.log(`Simulating upsert of ${allImages.length} images...`);
    const CHUNK_SIZE = 50;
    let saved = 0;

    for (let i = 0; i < allImages.length; i += CHUNK_SIZE) {
        const chunk = allImages.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('gallery_images').upsert(chunk, { onConflict: 'src' });
        if (error) {
            console.error(`Chunk ${i / CHUNK_SIZE} error:`, error);
        } else {
            saved += chunk.length;
            if (i % 500 === 0) console.log(`Processed chunk ${i/CHUNK_SIZE}...`);
        }
    }
    console.log(`Total saved: ${saved}`);
    
    // Check final count
    const { count } = await supabase.from('gallery_images').select('id', { count: 'exact', head: true });
    console.log(`Final count in DB: ${count}`);
}

testUpsert();
