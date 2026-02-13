import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

/**
 * Load all necessary face-api.js models.
 * Models should be placed in /public/models/
 */
export const loadFaceModels = async () => {
  if (modelsLoaded) return;

  const tryLoad = async (url: string) => {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(url),
      faceapi.nets.faceLandmark68Net.loadFromUri(url),
      faceapi.nets.faceRecognitionNet.loadFromUri(url)
    ]);
  };

  try {
    console.log('[FaceUtils] Attempting to load models from local assets...');
    await tryLoad('/models');
    modelsLoaded = true;
    console.log('[FaceUtils] Local models loaded successfully');
  } catch (localError) {
    console.warn('[FaceUtils] Local model load failed, trying CDN fallback...', localError);
    try {
      // Use JSDelivr for reliable CDN access to models
      const CDN_URL = 'https://cdn.jsdelivr.net/gh/vladmandic/face-api@master/model';
      await tryLoad(CDN_URL);
      modelsLoaded = true;
      console.log('[FaceUtils] CDN models loaded successfully');
    } catch (cdnError) {
      modelsLoaded = false;
      console.error('[FaceUtils] All model loading attempts failed:', cdnError);
      throw new Error('Face recognition models failed to load from both local and CDN sources. Please check your internet connection and project assets.');
    }
  }
};

/**
 * Detect faces in an image and return their descriptors and bounds.
 * Optimized for group photos by lowering detection threshold and increasing input size.
 * @param element - The image or video element to process
 */
export const extractFaceDescriptors = async (element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => {
  await loadFaceModels();

  // Optimized detector options: 0.40 threshold is a good balance for accuracy vs detection rate.
  const options = new faceapi.SsdMobilenetv1Options({ 
    minConfidence: 0.40, 
    maxResults: 100      
  });

  // Detect all faces with landmarks and descriptors
  try {
    const detections = await faceapi.detectAllFaces(element, options)
      .withFaceLandmarks()
      .withFaceDescriptors();

    return detections.map(d => ({
      descriptor: Array.from(d.descriptor),
      bounds: {
        x: d.detection.box.x,
        y: d.detection.box.y,
        width: d.detection.box.width,
        height: d.detection.box.height
      }
    }));
  } catch (err) {
    console.error('[FaceDetect] Detection failed:', err);
    throw err;
  }
};

/**
 * Find the most similar face in a set of descriptors.
 * (Utility for client-side matching if needed)
 */
export const findMatch = (descriptor: number[], faces: { embedding: number[], image_id: number }[]) => {
  const floatDescriptor = new Float32Array(descriptor);
  let bestMatch = { image_id: -1, distance: 1 };

  for (const face of faces) {
    const distance = faceapi.euclideanDistance(floatDescriptor, new Float32Array(face.embedding));
    if (distance < bestMatch.distance) {
      bestMatch = { image_id: face.image_id, distance };
    }
  }

  return bestMatch;
};

/**
 * Load an image from a URL into an HTMLImageElement.
 */
export const loadImageFromUrl = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      reject(new Error(`Timeout loading image: ${url}`));
    }, 15000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = (e) => {
      clearTimeout(timeout);
      console.error('[FaceUtils] Failed to load image:', url, e);
      reject(new Error(`Failed to load image for face detection. Check CORS settings for ${url}`));
    };
    img.src = url;
  });
};

/**
 * Convenience helper to extract faces from a URL.
 */
export const extractFaceDescriptorsFromUrl = async (url: string) => {
  const img = await loadImageFromUrl(url);
  return extractFaceDescriptors(img);
};
