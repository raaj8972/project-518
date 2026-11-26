import { secureEvent } from './lib/api-security';
import { driveApi, listDriveFiles } from './lib/google-drive';
import { driveFolderId } from '../../shared/galleryMedia';
import type { Handler } from '@netlify/functions';
const implementation: Handler = async event => {
  try {
    const body = JSON.parse(event.body || '{}'); const folderId = typeof body.folderId === 'string' ? driveFolderId(body.folderId) : '';
    if (!folderId) return { statusCode: 400, body: JSON.stringify({ error: 'Enter a valid Drive folder link.' }) };
    const metadata = await driveApi(`files/${folderId}`, { fields: 'id,name,mimeType' });
    if (metadata.mimeType !== 'application/vnd.google-apps.folder') return { statusCode: 400, body: JSON.stringify({ error: 'This link is a file. Choose its album folder instead.' }) };
    const folders = await listDriveFiles(`'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const counts = [];
    for (let from = 0; from < folders.length; from += 4) counts.push(...await Promise.all(folders.slice(from, from + 4).map(async folder => {
      const images = await listDriveFiles(`'${folder.id}' in parents and mimeType contains 'image/' and trashed=false`, 'id');
      return { id: folder.id, name: folder.name, imageCount: images.length };
    })));
    return { statusCode: 200, body: JSON.stringify({ folders: counts, totalFolders: counts.length, rootName: metadata.name }) };
  } catch (error) { return { statusCode: 400, body: JSON.stringify({ error: error instanceof Error ? error.message : 'The folder could not be opened.' }) }; }
};
export const handler = secureEvent('sync-drive-folders', implementation);
