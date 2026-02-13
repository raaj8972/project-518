
/**
 * Uploads a file to Cloudflare R2 via a presigned URL.
 * 
 * 1. Calls the Netlify function `get-r2-upload-url` to get a secure upload URL.
 * 2. Uploads the file directly to R2 using PUT.
 * 3. Returns the public URL of the uploaded file.
 */
export const uploadToR2 = async (file: File, folder = 'gallery'): Promise<string> => {
  try {
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // 1. Get Presigned URL
    const response = await fetch('/.netlify/functions/get-r2-upload-url', {
      method: 'POST',
      body: JSON.stringify({
        filename,
        filetype: file.type
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to get upload URL');
    }

    const { uploadUrl, publicUrl } = await response.json();

    // 2. Upload to R2
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload to R2');
    }

    return publicUrl;

  } catch (error) {
    console.error('R2 Upload Error:', error);
    throw error;
  }
};

export const deleteFromR2 = async (publicUrl: string): Promise<boolean> => {
  try {
    // Extract key from URL
    // Format: https://domain/folder/filename
    // We need 'folder/filename'
    const url = new URL(publicUrl);
    // Path includes the leading slash, remove it
    const fileKey = url.pathname.substring(1); 
    
    if (!fileKey) return false;

    await fetch('/.netlify/functions/delete-r2-file', {
      method: 'POST',
      body: JSON.stringify({ fileKey }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    return true;
  } catch (e) {
    console.warn('Failed to delete R2 file:', e);
    return false;
  }
};
