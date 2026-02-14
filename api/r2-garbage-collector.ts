import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');

const collector: Handler = async (event) => {
  console.log('Starting R2 Garbage Collection job...');

  if (!R2_BUCKET_NAME || !R2_PUBLIC_DOMAIN) {
    console.error('Missing R2 configuration');
    return new Response('Missing R2 configuration', { status: 500, headers });
  }

  try {
    // 1. Collect all referenced URLs from Supabase
    const referencedUrls = new Set<string>();

    const tablesAndColumns = [
      { table: 'gallery_images', column: 'src' },
      { table: 'sponsors', column: 'logo' },
      { table: 'faculty_heads', columns: ['image', 'image_url'] },
      { table: 'core_team_members', column: 'image' },
      { table: 'sports_team_members', column: 'image' },
      { table: 'guest_artists', columns: ['image', 'image_url', 'photo_url', 'video_url', 'card_media_url', 'detail_music_url'] },
      { table: 'band_members', column: 'image' },
      { table: 'chief_guests', column: 'image' },
      { table: 'events', columns: ['image', 'motion_poster_url'] },
      { table: 'homepage_settings', columns: ['hero_media_url', 'brand_logo_url'] },
      { table: 'hero_media', columns: ['image_url', 'video_url', 'poster_url', 'mobile_image_url', 'mobile_video_url', 'mobile_poster_url'] },
      { table: 'event_winners', column: 'photo_url' },
      { table: 'sponsorship_settings', column: 'brochure_url' },
      { table: 'registrations', column: 'photo_url' }
    ];

    for (const item of tablesAndColumns) {
      const columns = (item as any).columns || [item.column];
      for (const col of columns) {
        const { data, error } = await supabase.from(item.table).select(col);
        if (error) {
           console.warn(`Failed to scan ${item.table}.${col}:`, error);
           continue;
        }
        data?.forEach((row: any) => {
          if (row[col]) referencedUrls.add(row[col]);
        });
      }
    }

    // Special case: homepage_settings.sponsor_logos (JSON array)
    const { data: hp, error: hpErr } = await supabase.from('homepage_settings').select('sponsor_logos');
    if (!hpErr && hp) {
      hp.forEach((row: any) => {
        const logos = row.sponsor_logos || [];
        logos.forEach((l: any) => {
          if (l.logo_url) referencedUrls.add(l.logo_url);
        });
      });
    }

    // 2. List all objects in R2
    const orphanedKeys: string[] = [];
    let continuationToken: string | undefined = undefined;

    do {
      const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      });

      const listOutput = await s3Client.send(listCommand);
      const items = listOutput.Contents || [];

      for (const item of items) {
        if (!item.Key) continue;
        
        // Construct the public URL for this key
        const publicUrl = `https://${R2_PUBLIC_DOMAIN}/${item.Key}`;
        
        // Check if this URL is referenced
        if (!referencedUrls.has(publicUrl)) {
          // Additional safety: don't delete if it was created very recently (e.g. last 1 hour)
          // to avoid deleting files that are currently being uploaded but not yet saved to DB
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (item.LastModified && item.LastModified < oneHourAgo) {
            orphanedKeys.push(item.Key);
          }
        }
      }

      continuationToken = listOutput.NextContinuationToken;
    } while (continuationToken);

    console.log(`Found ${orphanedKeys.length} orphaned files in R2.`);

    // 3. Delete orphaned files in batches
    if (orphanedKeys.length > 0) {
      // Chunk into batches of 1000 (S3 limit)
      for (let i = 0; i < orphanedKeys.length; i += 1000) {
        const batch = orphanedKeys.slice(i, i + 1000);
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: R2_BUCKET_NAME,
          Delete: {
            Objects: batch.map(key => ({ Key: key })),
            Quiet: true,
          },
        });

        await s3Client.send(deleteCommand);
        console.log(`Deleted batch of ${batch.length} files.`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        deletedCount: orphanedKeys.length,
        orphanedKeys 
      }),
    };

  } catch (error) {
    console.error('Garbage Collection Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to run garbage collection' }),
    };
  }
};

// Run daily at 3 AM
export const handler = schedule('0 3 * * *', collector);
