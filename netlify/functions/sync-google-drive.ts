import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  const { getSupabaseClient } = await import('./lib/supabase');
  const supabase = getSupabaseClient(true);
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
  
  const START_TIME = Date.now();
  const TIMEOUT_MS = 25000; // 25 seconds for Netlify (default is 10s, can be increased)

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!GOOGLE_API_KEY) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'GOOGLE_API_KEY not configured.' }) 
    };
  }

  const checkTimeout = () => {
    if (Date.now() - START_TIME > TIMEOUT_MS) throw new Error('TimeLimit');
  };

  try {
    const { folderId, year, category, subfolderId } = JSON.parse(event.body || '{}');

    if (!folderId) {
      return { statusCode: 400, body: 'Missing folderId' };
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
      const q = `'${targetFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const folderRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&key=${GOOGLE_API_KEY}`
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
    const fetchFiles = async (parentId: string, catText: string, subText: string) => {
        let pageToken = '';
        console.log(`[DriveSync] Fetching images for: ${catText} > ${subText || '(Main)'}`);
        do {
            checkTimeout();
            const q = `'${parentId}' in parents and mimeType contains 'image/' and trashed = false`;
            const fields = 'nextPageToken, files(id, name, mimeType, createdTime)';
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
                    category: catText,
                    subcategory: subText || catText, // Fallback to category name if no specific subtopic
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
    const tasks: any[] = [];
    
    // Include root folder images task
    // Skip if batch mode (we only want the specific subfolder)
    if (!isBatchMode) {
        tasks.push(() => fetchFiles(folderId, useSubcategoryMode ? category : 'General', useSubcategoryMode ? category : ''));
    }

    // Add subfolders tasks
    for (const folder of subfolders) {
        tasks.push(async () => {
            // Fetch images in this folder
            // If DEFAULT CATEGORY (useSubcategoryMode) is set, subfolders become subcategories
            // If NO default category, this folder IS the category
            const finalCat = useSubcategoryMode ? category : folder.name;
            const finalSub = useSubcategoryMode ? folder.name : '';
            
            await fetchFiles(folder.id, finalCat, finalSub);
            
            // If NOT subcategory mode, check sub-subfolders (1 level deep)
            if (!useSubcategoryMode) {
                try {
                    checkTimeout();
                    const q = `'${folder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
                    const subRes = await fetch(
                        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&key=${GOOGLE_API_KEY}`
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
        return { statusCode: 200, body: JSON.stringify({ message: 'No images found.' }) };
    }

    console.log(`[DriveSync] Syncing ${allImages.length} images...`);

    // 3. Upsert to Supabase
    // We try to upsert all we found, even if partial
    const CHUNK_SIZE = 500; // Smaller chunk for safety
    try {
        for (let i = 0; i < allImages.length; i += CHUNK_SIZE) {
            // We removed checkTimeout here to ensure we try to save as much as possible once scanning is done
            const chunk = allImages.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from('gallery_images').upsert(chunk, { onConflict: 'src' } as any);
            if (error) {
                console.error(`[DriveSync] Upsert error (chunk ${i/CHUNK_SIZE}):`, error);
                throw new Error(`DB Error: ${error.message}`);
            }
        }

        // 4. NEW: Auto-register categories
        // Extract unique categories from found images and ensure they exist in event_categories
        const uniqueCategories = Array.from(new Set(allImages.map(img => img.category)));
        if (uniqueCategories.length > 0) {
            console.log(`[DriveSync] Registering ${uniqueCategories.length} categories...`);
            
            // Get existing categories to avoid redundant color generation
            const { data: existingCats } = await supabase.from('event_categories').select('name');
            const existingNames = new Set((existingCats || []).map(c => c.name));
            
            const newCategories = uniqueCategories
                .filter(name => !existingNames.has(name))
                .map(name => ({
                    name,
                    color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'), // Random color
                    description: `Automatically imported from Google Drive folder on ${new Date().toLocaleDateString()}`
                }));

            if (newCategories.length > 0) {
                const { error: catError } = await supabase.from('event_categories').insert(newCategories);
                if (catError) console.error('[DriveSync] Category registration failed:', catError);
            }
        }
    } catch (e: any) {
        if (e.message === 'TimeLimit') {
            isPartial = true;
        } else {
            console.error('[DriveSync] Final phase error:', e);
            // Don't swallow if we have 0 images, otherwise we might return "Sync complete" for a fail
            if (allImages.length === 0) throw e;
        }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: isPartial ? 'Sync partially completed (time limit)' : 'Sync complete!', 
        imagesCount: allImages.length,
        partial: isPartial
      })
    };

  } catch (error: any) {
    console.error('[DriveSync] Error:', error);
    if (error.message === 'TimeLimit') {
        return { statusCode: 200, body: JSON.stringify({ message: 'Sync stopped due to timeout', partial: true }) };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
};
