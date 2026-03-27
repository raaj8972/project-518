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

  if (status === 0 || msg.includes('http 0') || msg.includes('unknown error')) {
    return new Error('Network/CORS error during upload. Check your Supabase configuration rules and retry.');
  }

  if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('permission') || msg.includes('not allowed')) {
    return new Error(
      `Upload not permitted. Ensure Supabase storage security rules for bucket '${bucket}' allow authenticated inserts.`
    );
  }

  if (msg.includes('bucket not found') || msg.includes('not found') || msg.includes('no such file or directory')) {
    return new Error(`Storage bucket '${bucket}' might not exist in Supabase. Please check Supabase dashboard.`);
  }

  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('timeout')) {
    return new Error('Network error during upload. Check your internet connection or try a smaller file.');
  }

  return new Error(`Upload failed${status ? ` (HTTP ${status})` : ''}: ${msgRaw}`);
};

/**
 * Delete a file from Supabase Storage given its public URL.
 *
 * Supabase public URL format:
 *   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
 *
 * @param urlStr   Full public URL of the stored object
 * @param bucketId Optional bucket override (auto-detected from URL if omitted)
 */
export const deleteFromStorageByPublicUrl = async (urlStr: string, bucketId?: string): Promise<void> => {
  if (!urlStr) return;

  try {
    const url = new URL(urlStr);
    const parts = url.pathname.split('/');
    const publicIdx = parts.indexOf('public');

    let bucket: string;
    let objectPath: string;

    if (publicIdx !== -1 && parts.length > publicIdx + 2) {
      bucket = bucketId || parts[publicIdx + 1];
      objectPath = parts.slice(publicIdx + 2).join('/');
    } else if (bucketId) {
      const idx = parts.findIndex(p => p === bucketId);
      bucket = bucketId;
      objectPath = idx >= 0 ? parts.slice(idx + 1).join('/') : '';
    } else {
      console.warn('[Storage] Could not parse bucket/path from URL:', urlStr);
      return;
    }

    if (!objectPath) {
      console.warn('[Storage] Could not extract object path from URL:', urlStr);
      return;
    }

    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.storage.from(bucket).remove([decodeURIComponent(objectPath)]);

    if (error) {
      console.warn(`[Storage] Failed to delete ${objectPath} from ${bucket}:`, error.message);
    }
  } catch (e) {
    console.warn('[Storage] deleteFromStorageByPublicUrl error:', e);
  }
};
