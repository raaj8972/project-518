import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeEgress() {
  console.log('--- Analyzing Supabase Data for Egress Audit ---');

  // 1. Check gallery_images
  console.log('\n[1] Gallery Images Host Distribution:');
  let gallery: any[] = [];
  let page = 0;
  while (true) {
    const { data: pageData, error: gErr } = await supabase
        .from('gallery_images')
        .select('src')
        .range(page * 1000, (page + 1) * 1000 - 1);
    
    if (gErr) {
        console.error('Error fetching gallery:', gErr);
        break;
    }
    if (!pageData || pageData.length === 0) break;
    gallery = [...gallery, ...pageData];
    page++;
  }
  
  if (gallery.length > 0) {
    const hosts: Record<string, number> = {};
    gallery.forEach(img => {
      let src = img.src || '';
      if (src.startsWith('/storage/')) {
        hosts['Supabase (Relative)'] = (hosts['Supabase (Relative)'] || 0) + 1;
      } else if (src.startsWith('drive://')) {
        hosts['Google Drive Proxy'] = (hosts['Google Drive Proxy'] || 0) + 1;
      } else {
        try {
          const host = new URL(src).hostname;
          hosts[host] = (hosts[host] || 0) + 1;
        } catch {
          hosts['Other/Unknown'] = (hosts['Other/Unknown'] || 0) + 1;
        }
      }
    });
    console.table(hosts);
  }

  // 2. Check hero_media for videos
  console.log('\n[2] Hero Media Videos:');
  const { data: hero, error: hErr } = await supabase.from('hero_media').select('page_key, video_url');
  if (hErr) console.error('Error fetching hero media:', hErr);
  else {
    const videos = hero.filter(h => h.video_url);
    console.table(videos);
  }

  // 3. Check Storage Buckets for large files (Best effort)
  console.log('\n[3] Storage Usage (Deep Scan):');
  const { data: bucketList } = await supabase.storage.listBuckets();
  const allBuckets = bucketList ? bucketList.map(b => b.id) : ['gallery-images', 'event-images', 'hero-video', 'documents', 'registration-photos'];
  
  for (const b of allBuckets) {
    let totalSize = 0;
    let fileCount = 0;
    const largestFiles: any[] = [];

    async function scanFolder(path: string) {
      const { data: files, error } = await supabase.storage.from(b).list(path, { limit: 100 });
      if (error || !files) return;

      for (const f of files) {
        if (!f.id) { // is folder
          await scanFolder(path ? `${path}/${f.name}` : f.name);
        } else {
          const size = f.metadata?.size || 0;
          totalSize += size;
          fileCount++;
          largestFiles.push({ name: path ? `${path}/${f.name}` : f.name, size });
        }
      }
    }

    await scanFolder('');
    console.log(`\nBucket: ${b} - Total: ${(totalSize / (1024*1024*1024)).toFixed(2)} GB (${fileCount} files)`);
    largestFiles.sort((a,b) => b.size - a.size);
    if (largestFiles.length > 0) {
        console.log('Largest 5 files:');
        console.table(largestFiles.slice(0, 5).map(f => ({ name: f.name, size_mb: (f.size / (1024*1024)).toFixed(2) })));
    }
  }

  // 4. Check for registrations if they have large photos
  console.log('\n[4] Registration Photos check:');
  const { data: regs, error: rErr } = await supabase.from('registrations').select('photo_url').not('photo_url', 'is', null).limit(10);
  if (rErr) {
      // Small check for table existence
  } else if (regs && regs.length > 0) {
      console.log('Found registration photos. Sample host:');
      const host = new URL(regs[0].photo_url).hostname;
      console.log(host);
  } else {
      console.log('No registration photos found in sample.');
  }
}

analyzeEgress().catch(console.error);
