import { Handler } from '@netlify/functions';
import { verifyAdmin } from './lib/auth-verify';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { getSupabaseClient } = await import('./lib/supabase');
  const supabase = getSupabaseClient(true);

  // 1. Verify Authorization
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing authorization header' }) };
  }

  const { isAdmin, user: authUser } = await verifyAdmin(authHeader.toString(), supabase);
  if (!isAdmin || !authUser) {
    console.warn('[Folder List] Unauthorized access attempt detected');
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: Admin access required' }) };
  }

  console.log(`[Folder List] Authorized access by: ${authUser.email || authUser.id}`);

  try {
    const { folderId } = JSON.parse(event.body || '{}');

    if (!folderId) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'folderId is required' }) 
      };
    }

    if (!GOOGLE_API_KEY) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'GOOGLE_API_KEY not configured' }) 
      };
    }

    console.log(`[Folder List] Fetching subfolders for: ${folderId}`);

    // Fetch only subfolders (no files) - this is fast
    const folderRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)&key=${GOOGLE_API_KEY}`
    );

    if (!folderRes.ok) {
      const errText = await folderRes.text();
      console.error(`Google Drive API Error (${folderRes.status}):`, errText);
      return { 
        statusCode: folderRes.status, 
        body: JSON.stringify({ 
          error: `Google Drive API Error: ${folderRes.statusText}`, 
          details: errText 
        }) 
      };
    }

    const { files: subfolders = [] } = await folderRes.json();

    console.log(`[Folder List] Found ${subfolders.length} subfolders`);

    // For each subfolder, get a quick count of images
    const foldersWithCounts = await Promise.all(
      subfolders.map(async (folder: any) => {
        try {
          // Quick count query (doesn't fetch actual files, just counts)
          const q = `'${folder.id}' in parents and (mimeType contains 'image/' or name contains '.jpg' or name contains '.jpeg' or name contains '.png') and trashed = false`;
          const countRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1000&key=${GOOGLE_API_KEY}`
          );

          if (countRes.ok) {
            const { files = [] } = await countRes.json();
            return {
              id: folder.id,
              name: folder.name,
              imageCount: files.length
            };
          }
        } catch (err) {
          console.warn(`Failed to count images in ${folder.name}:`, err);
        }

        return {
          id: folder.id,
          name: folder.name,
          imageCount: 0
        };
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        folders: foldersWithCounts,
        totalFolders: foldersWithCounts.length
      })
    };

  } catch (error: any) {
    console.error('[Folder List] Error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: 'Failed to fetch folder structure', 
        details: error.message 
      }) 
    };
  }
};
