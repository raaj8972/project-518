import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Canvas, Image, ImageData, loadImage } from 'canvas';
import { TextEncoder, TextDecoder } from 'util';

// Monkey-patch globals BEFORE requiring face-api
// This is critical for the browser/wasm bundle to work in Node
(global as any).Canvas = Canvas;
(global as any).Image = Image;
(global as any).ImageData = ImageData;
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Use node-wasm bundle with explicit backend
require('@tensorflow/tfjs-backend-wasm');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');

// Explicitly patch env as well
faceapi.env.monkeyPatch({ Canvas, Image, ImageData } as any);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('[FaceIndex] Init: Checking Env Vars...');
if (!supabaseUrl || !supabaseKey) {
  console.error('[FaceIndex] Missing Supabase Keys:', { url: !!supabaseUrl, key: !!supabaseKey });
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Higher resolution = better accuracy for small faces, but slower
const INPUT_SIZE = 608; 
const SCORE_THRESHOLD = 0.2; // Lowered to capture more faces

// ... models loading ...

let modelsLoaded = false;

const loadModels = async () => {
    if (modelsLoaded) return;

    try {
        console.log('[FaceIndex] Initializing TensorFlow WASM backend...');
        try {
            await faceapi.tf.setBackend('wasm');
            console.log('[FaceIndex] Backend set to:', faceapi.tf.getBackend());
        } catch (backendError) {
            console.warn('[FaceIndex] WASM backend failed, falling back to CPU:', backendError);
            await faceapi.tf.setBackend('cpu');
        }
    } catch (e) {
        console.error('[FaceIndex] Critical error during TFJS initialization:', e);
    }
    
    console.log('[FaceIndex] Loading models from CDN...');
    // Primary CDN
    const modelUrl = 'https://cdn.jsdelivr.net/gh/vladmandic/face-api@master/model';
    // Fallback CDN if needed (future proofing)
    
    try {
        // Test CDN connectivity
        const testRes = await fetch(`${modelUrl}/ssd_mobilenet_v1_model-weights_manifest.json`, { method: 'HEAD' });
        if (!testRes.ok) {
            console.warn('[FaceIndex] Primary CDN seems unreachable, attempting load anyway...');
        }

        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
            faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
            faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
        ]);
        modelsLoaded = true;
        console.log('[FaceIndex] Models loaded successfully.');
    } catch (err) {
        console.error('[FaceIndex] Failed to load models from CDN:', err);
        throw new Error(`Vision models unreachable: ${err instanceof Error ? err.message : String(err)}`);
    }
};

export const handler: Handler = async (event, context) => {
    console.log('[FaceIndex] Function invoked.');
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        console.log('[FaceIndex] Ensuring models are loaded...');
        await loadModels();
        
        const body = JSON.parse(event.body || '{}');
        const { limit = 5 } = body;
        console.log('[FaceIndex] Processing batch with limit:', limit);
        
        // Fetch unindexed images using 'faces_indexed'
        const { data: images, error: fetchError } = await supabase
            .from('gallery_images')
            .select('id, src')
            .or('faces_indexed.is.null,faces_indexed.eq.false')
            .limit(limit);

        if (fetchError) {
            console.error('[FaceIndex] Database fetch error:', fetchError);
            throw fetchError;
        }
        
        if (!images || images.length === 0) {
            console.log('[FaceIndex] No unindexed images found.');
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'No unindexed images found.', count: 0, processed: 0 })
            };
        }

        console.log(`[FaceIndex] Processing ${images.length} images...`);
        
        let processed = 0;
        let facesFound = 0;

        for (const img of images) {
            try {
                console.log(`[FaceIndex] Image ${img.id} start: ${img.src}`);
                
                let loadedImage;
                
                if (img.src.startsWith('drive://')) {
                    const fileId = img.src.replace('drive://', '');
                    const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                    
                    const res = await fetch(driveUrl);
                    if (!res.ok) throw new Error(`Google Drive access failed: ${res.status} ${res.statusText}`);
                    const arrayBuffer = await res.arrayBuffer();
                    loadedImage = await loadImage(Buffer.from(arrayBuffer));
                    
                } else {
                    loadedImage = await loadImage(img.src);
                }

                console.log(`[FaceIndex] Image loaded successfully (${loadedImage.width}x${loadedImage.height})`);
                
                const options = new faceapi.SsdMobilenetv1Options({ 
                    minConfidence: SCORE_THRESHOLD, 
                    maxResults: 100 
                });
                
                const detections = await faceapi.detectAllFaces(loadedImage as any, options)
                    .withFaceLandmarks()
                    .withFaceDescriptors();
                
                console.log(`[FaceIndex] Detections for ${img.id}: ${detections.length}`);
                
                if (detections.length > 0) {
                    const faceRecords = detections.map(d => ({
                        image_id: img.id,
                        embedding: Array.from(d.descriptor),
                        bounds: {
                            x: Math.round(d.detection.box.x),
                            y: Math.round(d.detection.box.y),
                            width: Math.round(d.detection.box.width),
                            height: Math.round(d.detection.box.height)
                        }
                    }));
                    
                    const { error: insertError } = await supabase.from('gallery_faces').insert(faceRecords);
                    if (insertError) {
                        console.error(`[FaceIndex] Failed to insert faces for ${img.id}:`, insertError);
                    } else {
                        facesFound += detections.length;
                    }
                }
                
                // Mark success
                await supabase.from('gallery_images').update({ faces_indexed: true }).eq('id', img.id);
                processed++;

            } catch (err: any) {
                console.error(`[FaceIndex] Error on image ${img.id}:`, err.message);
                // Still mark as indexed (with null or special state if we had one) to avoid infinite retry loops on corrupt images
                // In this schema, we just set faces_indexed = true to skip it next time
                await supabase.from('gallery_images').update({ faces_indexed: true }).eq('id', img.id);
                processed++;
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true,
                message: `Batch complete: ${processed} images processed, ${facesFound} faces indexed.`, 
                processed, 
                facesFound 
            })
        };

    } catch (error: any) {
        console.error('[FaceIndex] Fatal processing error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: 'Face indexing failed', 
                details: error.message 
            }) 
        };
    }
};
