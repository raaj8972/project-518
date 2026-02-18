import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase keys in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getAllDatabaseUrls() {
  console.log('Gathering all active Supabase URLs from database...');
  const tables = [
    'gallery_images', 'events', 'sponsors', 'core_team_members', 
    'faculty_heads', 'event_winners', 'guest_artists', 'chief_guests', 
    'registrations', 'hero_media', 'about_settings', 'sponsorship_settings'
  ];
  
  const allUrls = new Set<string>();
  
  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*');
      if (error) {
        console.warn(`Could not read table ${t}: ${error.message}`);
        continue;
      }
      
      const json = JSON.stringify(data);
      // Match anything looking like a storage URL from our instance
      const matches = json.match(/isfqhascrdzaoebhuohs\.supabase\.co\/storage\/v1\/object\/public\/([^"'\s?]+)/g);
      if (matches) {
        matches.forEach(m => {
            // Extract the path after /public/
            const path = m.split('/public/')[1];
            allUrls.add(path);
        });
      }
    } catch (e) {
      console.error(`Error processing table ${t}:`, e);
    }
  }
  
  console.log(`Found ${allUrls.size} unique active Supabase Storage paths referenced in DB.`);
  return allUrls;
}

async function cleanup() {
  const activePaths = await getAllDatabaseUrls();
  const { data: bucketList } = await supabase.storage.listBuckets();
  
  if (!bucketList) return;
  
  console.log('\n--- Starting Orphaned File Cleanup ---');
  
  for (const b of bucketList) {
    console.log(`\nChecking bucket: ${b.id}`);
    const orphanedFiles: string[] = [];
    let totalSize = 0;

    async function scan(folder: string) {
      const { data: files } = await supabase.storage.from(b.id).list(folder, { limit: 100 });
      if (!files) return;

      for (const f of files) {
        if (!f.id) { // folder
          await scan(folder ? `${folder}/${f.name}` : f.name);
        } else {
          const fullPath = folder ? `${folder}/${f.name}` : f.name;
          const storageUrlPath = `${b.id}/${fullPath}`;
          
          if (!activePaths.has(storageUrlPath)) {
            orphanedFiles.push(fullPath);
            totalSize += (f.metadata?.size || 0);
          }
        }
      }
    }

    await scan('');
    
    if (orphanedFiles.length > 0) {
      console.log(`Found ${orphanedFiles.length} orphaned files in ${b.id} (${(totalSize / (1024*1024)).toFixed(2)} MB)`);
      
      // Safety check: Don't delete if bucket is 'public-content' as it might have unreferenced templates we want to keep
      if (b.id === 'public-content' || b.id === 'pdf-watermarks') {
          console.log(`Skipping deletion for critical bucket: ${b.id}`);
          continue;
      }

      const { data, error } = await supabase.storage.from(b.id).remove(orphanedFiles);
      if (error) {
        console.error(`Failed to delete from ${b.id}:`, error.message);
      } else {
        console.log(`Successfully deleted ${data?.length} orphaned files from ${b.id}.`);
      }
    } else {
      console.log(`No orphaned files found in ${b.id}.`);
    }
  }
}

cleanup().catch(console.error);
