export async function driveApi(path: string, params: Record<string, string>) {
  if (!process.env.GOOGLE_API_KEY) throw new Error('Drive import is not configured on this server.');
  const url = new URL(`https://www.googleapis.com/drive/v3/${path}`);
  Object.entries({ ...params, key: process.env.GOOGLE_API_KEY }).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(response.status === 404 || response.status === 403 ? 'This Drive folder is unavailable. Check its public sharing settings.' : 'Google Drive could not finish the request. Please retry.');
  return response.json();
}
export async function listDriveFiles(q: string, fields = 'id,name') {
  const files: any[] = []; let pageToken = '';
  do { const page = await driveApi('files', { q, fields: `nextPageToken,files(${fields})`, pageSize: '1000', pageToken }); files.push(...(page.files || [])); pageToken = page.nextPageToken || ''; } while (pageToken);
  return files;
}
