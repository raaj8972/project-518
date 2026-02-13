
/**
 * Uploads an image to Cloudinary using an unsigned upload preset.
 * 
 * Requires VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET 
 * to be set in your .env file.
 */
export const uploadToCloudinary = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary configuration missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  // specific folder behavior can be set in the preset settings on Cloudinary dashboard,
  // or we can append 'folder' here if the preset allows overriding.
  // formData.append('folder', 'gallery'); 

  const parsedCloudName = cloudName.trim();
  const endpoint = `https://api.cloudinary.com/v1_1/${parsedCloudName}/image/upload`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Cloudinary upload failed');
    }

    const data = await response.json();
    return data.secure_url; // Returns the HTTPS URL of the uploaded image
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};
