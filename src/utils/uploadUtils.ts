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
    return new Error('Network/CORS error during upload. Check your Firebase configuration rules and retry.');
  }
  
  if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('permission') || msg.includes('not allowed')) {
    return new Error(
      `Upload not permitted. Ensure Firebase storage security rules for bucket '${bucket}' allow authenticated inserts.`
    );
  }
  
  if (msg.includes('bucket not found') || msg.includes('not found') || msg.includes('no such file or directory')) {
    return new Error(`Storage bucket '${bucket}' might not exist in Firebase. Please check Firebase console.`);
  }
  
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('timeout')) {
    return new Error('Network error during upload. Check your internet connection or try a smaller file.');
  }
  
  return new Error(`Upload failed${status ? ` (HTTP ${status})` : ''}: ${msgRaw}`);
};

// Extract storage object path from a Firebase Storage public URL
export const extractFirebasePathFromUrl = (urlStr: string): string | null => {
  try {
    // Basic heuristics to extract the path from a firebase storage URL
    // Format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?alt=media...
    const url = new URL(urlStr);
    if (url.hostname.includes('firebasestorage.googleapis.com')) {
      const pathParam = url.pathname.split('/o/')[1];
      if (pathParam) {
        return decodeURIComponent(pathParam);
      }
    }
    return null;
  } catch {
    return null;
  }
};

export const deleteFromStorageByPublicUrl = async (urlStr: string) => {
  if (!urlStr) return;

  const objectPath = extractFirebasePathFromUrl(urlStr);
  
  if (objectPath) {
    try {
      const { firebaseDeleteFile } = await import('../lib/firebase');
      await firebaseDeleteFile(objectPath);
    } catch (e) {
      console.warn('Failed to delete from Firebase Storage:', e);
    }
  } else {
    console.warn('Could not extract valid Firebase path from URL for deletion:', urlStr);
  }
};
