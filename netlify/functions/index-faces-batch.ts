import { secureEvent } from './lib/api-security';
import { fetchImage } from './lib/media-fetch';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'node:module';
import { TextEncoder, TextDecoder } from 'util';

// Native vision dependencies are initialized only after API authorization succeeds.
let faceapi: any;
let loadImage: any;
async function initializeVision() {
    if (faceapi) return;
    const canvas = await import('canvas');
    loadImage = canvas.loadImage;
    (global as any).Canvas = canvas.Canvas;
    (global as any).Image = canvas.Image;
    (global as any).ImageData = canvas.ImageData;
    (global as any).TextEncoder = TextEncoder;
    (global as any).TextDecoder = TextDecoder;
    const require = createRequire(`${process.cwd()}/package.json`);
    require('@tensorflow/tfjs-backend-wasm');
    faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
    faceapi.env.monkeyPatch({ Canvas: canvas.Canvas, Image: canvas.Image, ImageData: canvas.ImageData } as any);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    await initializeVision();

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

const implementation: Handler = async (event, context) => {
    console.log('[FaceIndex] Function invoked.');
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        console.log('[FaceIndex] Ensuring models are loaded...');
        await loadModels();
        
        const body = JSON.parse(event.body || '{}');
        const limit = body.limit ?? 5;
        if (!Number.isInteger(limit) || limit < 1 || limit > 10) return { statusCode: 400, body: JSON.stringify({ error: 'Choose a batch of 1 to 10 images' }) };
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
                
                const source = img.src.startsWith('drive://')
                    ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(img.src.slice(8))}`
                    : img.src;
                const { buffer } = await fetchImage(source);
                const loadedImage = await loadImage(buffer);

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

export const handler = secureEvent('index-faces-batch', implementation);
