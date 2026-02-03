import { supabase } from '../lib/supabase';

// Format bytes to human readable string
export const humanSize = (bytes: number): string => {
  return bytes >= 1024 * 1024
    ? `${Math.round(bytes / (1024 * 1024))}MB`
    : `${Math.ceil(bytes / 1024)}KB`;
};

// Extract filename from URL
export const getFileName = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    return pathParts[pathParts.length - 1];
  } catch {
    return 'Document';
  }
};

// Extract storage object path from a public URL for a given bucket
export const extractObjectPathFromPublicUrl = (urlStr: string, bucketId: string): string => {
  try {
    const url = new URL(urlStr);
    const publicPrefix = `/storage/v1/object/public/${bucketId}/`;
    if (url.pathname.includes(publicPrefix)) {
      return url.pathname.substring(url.pathname.indexOf(publicPrefix) + publicPrefix.length);
    }
    const parts = url.pathname.split('/');
    const idx = parts.findIndex((p) => p === bucketId);
    return idx >= 0 ? parts.slice(idx + 1).join('/') : '';
  } catch {
    return '';
  }
};

// Map upload errors to user-friendly messages
export const mapUploadError = (error: any, bucket: string): Error => {
  const status = (error as any)?.status as number | undefined;
  const msgRaw = (error && (error as any).message) ? (error as any).message : String(error);
  const msg = msgRaw.toLowerCase();
  
  // Handle generic/opaque network errors (status 0) with actionable hints
  if (status === 0 || msg.includes('http 0') || msg.includes('unknown error')) {
    return new Error('Network/CORS error during upload (HTTP 0). Check your Supabase URL/key configuration, browser extensions (ad blockers), and retry. If this persists, try logging in to Admin and uploading from there.');
  }
  
  if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('permission') || msg.includes('not allowed')) {
    return new Error(
      `Upload not permitted (HTTP ${status ?? '403'}). You must be logged in as admin. Please log in to the Admin dashboard and retry. If already logged in, ensure storage policies for bucket '${bucket}' allow authenticated inserts.`
    );
  }
  
  if (msg.includes('bucket not found') || msg.includes('not found') || msg.includes('no such file or directory')) {
    return new Error(`Storage bucket '${bucket}' not found. Please contact support or run the SQL setup script.`);
  }
  
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('timeout')) {
    return new Error('Network error during upload. Check your internet connection or try a smaller image.');
  }
  
  return new Error(`Upload failed${status ? ` (HTTP ${status})` : ''}: ${msgRaw}`);
};

// Best-effort deletion of a storage object by its public URL
export const deleteFromStorageByPublicUrl = async (urlStr: string, bucket: string) => {
  if (!urlStr || !urlStr.includes(bucket)) return;
  const objectPath = extractObjectPathFromPublicUrl(urlStr, bucket);
  if (!objectPath) return;
  try {
    await supabase.storage.from(bucket).remove([objectPath]);
  } catch (e) {
    console.warn('Unable to delete storage object', objectPath, e);
  }
};
