import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  const START_TIME = Date.now();
  const TIMEOUT_MS = 9000; // 9 seconds to avoid Vercel 10s hard limit

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers });
  }

  if (!GOOGLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GOOGLE_API_KEY not configured.' }),
      { status: 500, headers }
    );
  }

  const checkTimeout = () => {
    if (Date.now() - START_TIME > TIMEOUT_MS) throw new Error('TimeLimit');
  };

  try {
    const { folderId, year, category, subfolderId } = await req.json();

    if (!folderId) {
      return new Response('Missing folderId', { status: 400, headers });
    }

    // NEW: If subfolderId provided, sync only that specific folder (batch mode)
    const targetFolderId = subfolderId || folderId;
    const isBatchMode = !!subfolderId;
    
    const useSubcategoryMode = !!category;
    console.log(`[DriveSync] Mode: ${isBatchMode ? 'BATCH' : 'FULL'}, Folder: ${targetFolderId}`);

    // 1. Fetch subfolders (skip in batch mode - we already know the target)
    let subfolders: any[] = [];
    
    if (isBatchMode) {
      // In batch mode, treat targetFolderId as the direct folder to sync
      console.log(`[DriveSync] Batch mode: syncing single folder directly`);
      subfolders = [{ id: targetFolderId, name: 'Target Folder' }];
    } else {
      // Full mode: enumerate all subfolders
      const folderRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${targetFolderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)&key=${GOOGLE_API_KEY}`
      );
      
      if (!folderRes.ok) {
        const errText = await folderRes.text();
        console.error(`Google Drive API Error (${folderRes.status}):`, errText);
        return { 
          statusCode: folderRes.status, 
          body: JSON.stringify({ error: `Google Drive API Error: ${folderRes.statusText}`, details: errText }) 
        };
      }
      
      const data = await folderRes.json();
      subfolders = data.files || [];
      console.log(`[DriveSync] Found ${subfolders.length} subfolders.`);
    }

    const allImages: any[] = [];
    let isPartial = false;

    // Helper to fetch files from a folder with pagination
    const fetchFiles = async (parentId: string, folderName: string, subName: string = '') => {
        let pageToken = '';
        do {
            checkTimeout();
            const q = `'${parentId}'+in+parents+and+mimeType+contains+'image/'+and+trashed=false`;
            const fields = 'nextPageToken,files(id,name,mimeType,createdTime)';
            const res = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageToken=${pageToken}&key=${GOOGLE_API_KEY}`
            );
            if (!res.ok) {
                console.error(`Error fetching files for ${parentId}: ${res.status}`);
                break;
            }
            const data = await res.json();
            const files = data.files || [];
            
            files.forEach((f: any) => {
                allImages.push({
                    src: `drive://${f.id}`,
                    category: useSubcategoryMode ? category : folderName,
                    subcategory: useSubcategoryMode ? folderName : subName,
                    title: f.name.split('.')[0],
                    year: year || new Date().getFullYear().toString(),
                    featured: false,
                    created_at: f.createdTime
                });
            });

            pageToken = data.nextPageToken || '';
        } while (pageToken);
    };

    // 2. Process folders in chunks to manage concurrency
    const BATCH_SIZE = 5;
    
    // Include root folder as a "task"
    const tasks = [
        () => fetchFiles(folderId, useSubcategoryMode ? category : 'General', '') // Root folder images
    ];

    // Add subfolders tasks
    for (const folder of subfolders) {
        tasks.push(async () => {
            // Fetch images in this folder
            await fetchFiles(folder.id, useSubcategoryMode ? category : folder.name, useSubcategoryMode ? folder.name : '');
            
            // If NOT subcategory mode, check sub-subfolders (1 level deep)
            if (!useSubcategoryMode) {
                try {
                    checkTimeout();
                    const subRes = await fetch(
                        `https://www.googleapis.com/drive/v3/files?q='${folder.id}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)&key=${GOOGLE_API_KEY}`
                    );
                    if (subRes.ok) {
                        const { files: subSub = [] } = await subRes.json();
                        for (const sub of subSub) {
                            await fetchFiles(sub.id, folder.name, sub.name);
                        }
                    }
                } catch (e) {
                   // Ignore sub-subfolder errors or timeout, continue
                }
            }
        });
    }

    // Execute tasks in batches
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        try {
            checkTimeout();
            const batch = tasks.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(t => t()));
        } catch (e: any) {
            if (e.message === 'TimeLimit') {
                console.warn('Time limit reached, stopping fetch.');
                isPartial = true;
                break;
            }
            throw e;
        }
    }

    if (allImages.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No images found.' }),
          { status: 200, headers }
        );
    }

    console.log(`[DriveSync] Syncing ${allImages.length} images...`);

    // 3. Upsert to Supabase
    // We try to upsert all we found, even if partial
    const CHUNK_SIZE = 100; // Smaller chunk for safety
    try {
        for (let i = 0; i < allImages.length; i += CHUNK_SIZE) {
            checkTimeout(); // Check before DB op
            const chunk = allImages.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from('gallery_images').upsert(chunk, { onConflict: 'src' } as any);
            if (error) console.error('Upsert error:', error);
        }
    } catch (e: any) {
        if (e.message === 'TimeLimit') isPartial = true;
    }

    return new Response(
      JSON.stringify({ 
        message: isPartial ? 'Sync partially completed (time limit)' : 'Sync complete!', 
        imagesCount: allImages.length,
        partial: isPartial
      }),
      { status: 200, headers }
    );

  } catch (error: any) {
    console.error('[DriveSync] Error:', error);
    if (error.message === 'TimeLimit') {
        return new Response(
          JSON.stringify({ message: 'Sync stopped due to timeout', partial: true }),
          { status: 200, headers }
        );
    }
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers }
    );
  }
}
