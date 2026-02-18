import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

if (!SUPABASE_URL || !SUPABASE_KEY || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('Missing required environment variables in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function migrateTable(tableName: string, urlColumn: string, r2Folder: string) {
  console.log(`\n--- Migrating Table: ${tableName} (${urlColumn}) ---`);
  
  const { data: rows, error } = await supabase
    .from(tableName)
    .select(`id, ${urlColumn}`)
    .ilike(urlColumn, '%supabase.co/storage/v1/object/public/%');

  if (error) {
    console.error(`Error fetching ${tableName}:`, error);
    return;
  }

  console.log(`Found ${rows.length} records in ${tableName} to migrate.`);

  for (const row of (rows as any[])) {
    try {
      const src = row[urlColumn];
      if (!src) continue;
      
      console.log(`Migrating ${tableName} ${row.id}: ${src}`);
      
      const url = new URL(src);
      const fileName = url.pathname.split('/').pop() || `file_${Date.now()}`;
      const r2Key = `${r2Folder}/${fileName}`;

      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      await s3Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
        Body: buffer,
        ContentType: contentType,
      }));

      const newUrl = `https://${R2_PUBLIC_DOMAIN}/${r2Key}`;
      await supabase.from(tableName).update({ [urlColumn]: newUrl }).eq('id', row.id);
      console.log(`Successfully migrated ${row.id} to R2.`);
    } catch (err) {
      console.error(`Failed to migrate ${tableName} ${row.id}:`, err);
    }
  }
}

async function migrateHero() {
  console.log('\n--- Migrating Hero Media ---');
  const { data: hero, error } = await supabase
    .from('hero_media')
    .select('page_key, video_url, image_url, mobile_video_url, mobile_image_url')
    .or('video_url.ilike.%supabase.co%,image_url.ilike.%supabase.co%,mobile_video_url.ilike.%supabase.co%,mobile_image_url.ilike.%supabase.co%');

  if (error) {
    console.error('Error fetching hero:', error);
    return;
  }

  console.log(`Found ${hero.length} hero records to migrate.`);

  for (const h of (hero as any[])) {
    const columns = ['video_url', 'image_url', 'mobile_video_url', 'mobile_image_url'];
    for (const col of columns) {
        const src = h[col];
        if (!src || !src.includes('supabase.co')) continue;
        
        try {
            console.log(`Migrating hero ${col} for ${h.page_key}...`);
            const url = new URL(src);
            const fileName = url.pathname.split('/').pop() || `hero_${Date.now()}`;
            const r2Folder = src.includes('video') ? 'hero-video' : 'hero';
            const r2Key = `${r2Folder}/${fileName}`;

            const response = await fetch(src);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = response.headers.get('content-type') || (src.includes('video') ? 'video/mp4' : 'image/jpeg');

            await s3Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: r2Key,
                Body: buffer,
                ContentType: contentType,
            }));

            const newUrl = `https://${R2_PUBLIC_DOMAIN}/${r2Key}`;
            await supabase.from('hero_media').update({ [col]: newUrl }).eq('page_key', h.page_key);
        } catch (e) {
            console.error(`Failed hero migrate: ${h.page_key} (${col})`, e);
        }
    }
  }
}

async function run() {
    // 1. Core Tables
    await migrateTable('gallery_images', 'src', 'gallery');
    await migrateTable('guest_artists', 'image', 'guests');
    await migrateTable('guest_artists', 'card_media_url', 'videos');
    await migrateTable('chief_guests', 'image', 'guests');
    await migrateTable('sponsors', 'logo', 'sponsors');
    await migrateTable('core_team_members', 'image', 'team');
    await migrateTable('faculty_heads', 'image', 'faculty');
    await migrateTable('event_winners', 'photo_url', 'winners');
    await migrateTable('events', 'image', 'events');
    
    // 2. Specialized Tables
    await migrateHero();
}

run().catch(console.error);
