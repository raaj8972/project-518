const { Canvas, Image, ImageData, loadImage } = require('canvas');

// Monkey-patch globals
global.Canvas = Canvas;
global.Image = Image;
global.ImageData = ImageData;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

console.log('Polyfills set. Requiring face-api (node-wasm)...');

try {
    // Require backend-wasm to register it
    require('@tensorflow/tfjs-backend-wasm');
    const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
    console.log('face-api loaded successfully');
    
    (async () => {
        // Set backend
        await faceapi.tf.setBackend('wasm');
        console.log('Backend set to:', faceapi.tf.getBackend());
        
        // Patch env
        const { Canvas, Image, ImageData } = require('canvas');
        faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
        console.log('Env patched');
    })();
    
} catch (error) {
    console.error('CRASHED:', error);
}
