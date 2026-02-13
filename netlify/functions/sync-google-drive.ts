import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!GOOGLE_API_KEY) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'GOOGLE_API_KEY not configured in environment variables.' }) 
    };
  }

  try {
    const { folderId, year, category } = JSON.parse(event.body || '{}');

    if (!folderId) {
      return { statusCode: 400, body: 'Missing folderId' };
    }

    // When `category` is provided, the folder's subfolders become subcategories.
    // When not provided, subfolders become categories (original behavior).
    const useSubcategoryMode = !!category;

    console.log(`[DriveSync] Starting sync for folder: ${folderId}${useSubcategoryMode ? ` (category: ${category})` : ''}`);

    // 1. Fetch all subfolders (these will be our categories or subcategories)
    const folderRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)&key=${GOOGLE_API_KEY}`
    );
    
    if (!folderRes.ok) {
      const errText = await folderRes.text();
      console.error(`[DriveSync] Folder API Error: ${folderRes.status} ${errText}`);
      throw new Error(`Google Drive Folder API error: ${folderRes.status}`);
    }

    const folderData = await folderRes.json();
    console.log(`[DriveSync] Folder Data:`, JSON.stringify(folderData));
    const subfolders = folderData.files || [];

    console.log(`[DriveSync] Found ${subfolders.length} subfolders.`);

    const allImages: any[] = [];

    // 2. Fetch images from each subfolder
    for (const folder of subfolders) {
      // Determine category and subcategory based on mode
      const imgCategory = useSubcategoryMode ? category : folder.name;
      const imgSubcategory = useSubcategoryMode ? folder.name : '';

      console.log(`[DriveSync] Scanning: ${imgCategory}${imgSubcategory ? ' > ' + imgSubcategory : ''} (${folder.id})`);


      // 2a. Check for sub-subfolders (deeper subcategories) inside this folder
      // Only scan deeper if NOT in subcategory mode (avoid 3 levels deep)
      if (!useSubcategoryMode) {
        const subSubRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folder.id}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)&key=${GOOGLE_API_KEY}`
        );
        const subSubData = subSubRes.ok ? await subSubRes.json() : { files: [] };
        const subSubfolders = subSubData.files || [];

        if (subSubfolders.length > 0) {
          console.log(`[DriveSync] Found ${subSubfolders.length} sub-subcategories in ${folder.name}`);
        }

        for (const subFolder of subSubfolders) {
          console.log(`[DriveSync] Scanning subcategory: ${folder.name} > ${subFolder.name}`);
          let subPageToken = '';
          do {
            const fileRes = await fetch(
              `https://www.googleapis.com/drive/v3/files?q='${subFolder.id}'+in+parents+and+mimeType+contains+'image/'+and+trashed=false&fields=nextPageToken,files(id,name,mimeType,createdTime)&pageToken=${subPageToken}&key=${GOOGLE_API_KEY}`
            );
            if (!fileRes.ok) break;
            const fileData = await fileRes.json();
            (fileData.files || []).forEach((file: any) => {
              allImages.push({
                src: `drive://${file.id}`,
                category: folder.name,
                subcategory: subFolder.name,
                title: file.name.split('.')[0],
                year: year || new Date().getFullYear().toString(),
                featured: false,
                created_at: file.createdTime
              });
            });
            subPageToken = fileData.nextPageToken || '';
          } while (subPageToken);
        }
      }

      // 2c. Also scan images directly in the category folder (no subcategory)
      let nextPageToken = '';
      do {
        console.log(`[DriveSync] Fetching files for folder ${folder.id}...`);
        const fileRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folder.id}'+in+parents+and+mimeType+contains+'image/'+and+trashed=false&fields=nextPageToken,files(id,name,mimeType,createdTime)&pageToken=${nextPageToken}&key=${GOOGLE_API_KEY}`
        );

        if (!fileRes.ok) {
          console.error(`[DriveSync] File API Error for folder ${folder.id}: ${fileRes.status}`);
          break;
        }

        const fileData = await fileRes.json();
        const files = fileData.files || [];
        console.log(`[DriveSync] Found ${files.length} files in folder ${folder.name}.`);

        files.forEach((file: any) => {
          allImages.push({
            src: `drive://${file.id}`,
            category: imgCategory,
            subcategory: imgSubcategory,
            title: file.name.split('.')[0],
            year: year || new Date().getFullYear().toString(),
            featured: false,
            created_at: file.createdTime
          });
        });

        nextPageToken = fileData.nextPageToken || '';
      } while (nextPageToken);
    }

    // Also scan the root folder for any loose images
    console.log(`[DriveSync] Scanning root folder ${folderId} for loose images...`);
    let rootPageToken = '';
    do {
      const rootFileRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'+and+trashed=false&fields=nextPageToken,files(id,name,mimeType,createdTime)&pageToken=${rootPageToken}&key=${GOOGLE_API_KEY}`
      );
      
      if (!rootFileRes.ok) {
        console.error(`[DriveSync] Root File API Error: ${rootFileRes.status}`);
        break;
      }

      const rootFileData = await rootFileRes.json();
      console.log(`[DriveSync] Root File Data:`, JSON.stringify(rootFileData));
      const rootFiles = rootFileData.files || [];

      console.log(`[DriveSync] Found ${rootFiles.length} images in root folder.`);

      rootFiles.forEach((file: any) => {
        allImages.push({
          src: `drive://${file.id}`,
          category: useSubcategoryMode ? category : 'General',
          subcategory: '',
          title: file.name.split('.')[0],
          year: year || new Date().getFullYear().toString(),
          featured: false,
          created_at: file.createdTime
        });
      });
      rootPageToken = rootFileData.nextPageToken || '';
    } while (rootPageToken);

    if (allImages.length === 0) {
      console.log(`[DriveSync] No images found. Total categories checked: ${subfolders.length}`);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No images found in the specified folder. Please ensure the folder is public and contains images.' })
      };
    }

    console.log(`[DriveSync] Syncing ${allImages.length} images to Supabase...`);

    // 3. Upsert into Supabase (avoiding duplicates based on src)
    // Increased chunk size to 500 for better performance with large galleries
    const CHUNK_SIZE = 500;
    for (let i = 0; i < allImages.length; i += CHUNK_SIZE) {
      const chunk = allImages.slice(i, i + CHUNK_SIZE);
      console.log(`[DriveSync] Upserting chunk ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} items)...`);
      const { error } = await supabase
        .from('gallery_images')
        .upsert(chunk, { onConflict: 'src' } as any);

      if (error) {
        console.error(`[DriveSync] Batch upsert error at index ${i}:`, error);
        throw new Error(`Database upsert error: ${error.message}`);
      }
    }

    console.log(`[DriveSync] Successfully synced ${allImages.length} images.`);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Google Drive sync complete!', 
        imagesCount: allImages.length,
        categoriesCount: subfolders.length + 1
      })
    };

  } catch (error: any) {
    console.error('[DriveSync] Critical Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
};
