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
        await faceapi.tf.setBackend('wasm');
        console.log('[FaceIndex] Backend set to:', faceapi.tf.getBackend());
    } catch (e) {
        console.error('[FaceIndex] Error setting backend:', e);
    }
    
    console.log('[FaceIndex] Loading models from CDN...');
    const modelUrl = 'https://cdn.jsdelivr.net/gh/vladmandic/face-api@master/model';
    
    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
            faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
            faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
        ]);
        modelsLoaded = true;
        console.log('[FaceIndex] Models loaded successfully.');
    } catch (err) {
        console.error('[FaceIndex] Failed to load models:', err);
        throw err;
    }
};

export const handler: Handler = async (event, context) => {
    console.log('[FaceIndex] Function invoked.');
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        console.log('[FaceIndex] Loading models...');
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

        if (fetchError) throw fetchError;
        
        if (!images || images.length === 0) {
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
                console.log(`[FaceIndex] Processing ${img.id}: ${img.src}`);
                
                let loadedImage;
                
                if (img.src.startsWith('drive://')) {
                    const fileId = img.src.replace('drive://', '');
                    // Use Google Drive thumbnail/download URL. 
                    // 'https://drive.google.com/thumbnail?id=xxx&sz=w1000' is reliable for public/shared files.
                    // Or use the API key if we have it? We don't verify permissions here, assuming public or valid key.
                    // But 'drive://' implies we scanned it.
                    // Let's use a standard download URL which follows redirects.
                    
                    const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                    console.log(`[FaceIndex] Fetching Drive URL: ${driveUrl}`);
                    
                    // Fetch buffer directly because canvas.loadImage might struggle with 302 redirects on some platforms
                    const res = await fetch(driveUrl);
                    if (!res.ok) throw new Error(`Failed to fetch drive image: ${res.status} ${res.statusText}`);
                    const arrayBuffer = await res.arrayBuffer();
                    loadedImage = await loadImage(Buffer.from(arrayBuffer));
                    
                } else {
                    loadedImage = await loadImage(img.src);
                }

                console.log(`[FaceIndex] Image loaded: ${loadedImage.width}x${loadedImage.height}`);
                
                const options = new faceapi.SsdMobilenetv1Options({ 
                    minConfidence: SCORE_THRESHOLD, 
                    maxResults: 100 
                });
                
                const detections = await faceapi.detectAllFaces(loadedImage as any, options)
                    .withFaceLandmarks()
                    .withFaceDescriptors();
                
                console.log(`[FaceIndex] Detections for ${img.id}: ${detections.length}`);
                
                if (detections.length > 0) {
                    // Log scores for debugging
                    detections.forEach((d, i) => console.log(`[FaceIndex] Face ${i} score: ${d.detection.score}`));

                    const faceRecords = detections.map(d => ({
                        image_id: img.id,
                        embedding: Array.from(d.descriptor),
                        bounds: {
                            x: d.detection.box.x,
                            y: d.detection.box.y,
                            width: d.detection.box.width,
                            height: d.detection.box.height
                        }
                    }));
                    
                    const { error: insertError } = await supabase.from('gallery_faces').insert(faceRecords);
                    if (insertError) console.error(`[FaceIndex] Failed to insert faces for ${img.id}:`, insertError);
                    else facesFound += detections.length;
                }
                
            } catch (err) {
                console.error(`[FaceIndex] Error processing image ${img.id}:`, err);
            } finally {
                // Always mark as indexed so we don't get stuck in a loop of failing images
                await supabase.from('gallery_images').update({ faces_indexed: true }).eq('id', img.id);
                processed++;
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: `Processed ${processed} images, found ${facesFound} faces.`, 
                processed, 
                facesFound 
            })
        };

    } catch (error: any) {
        console.error('[FaceIndex] Fatal error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
