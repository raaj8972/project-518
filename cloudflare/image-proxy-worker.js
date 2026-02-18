/**
 * Cloudflare Worker: Image Proxy & Resizer
 * 
 * This worker proxies requests to an R2 bucket and performs dynamic image resizing
 * using the Cloudflare Image Resizing service (requires a paid plan or specific setup).
 * 
 * Usage:
 * https://images.yourdomain.com/path/to/image.jpg?w=400&q=75
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.substring(1); // Remove leading slash

    if (!path) {
      return new Response('Missing image path', { status: 400 });
    }

    // 1. Get resizing options from query parameters
    const width = url.searchParams.get('w');
    const height = url.searchParams.get('h');
    const quality = url.searchParams.get('q') || 80;
    const format = url.searchParams.get('f') || 'auto'; // 'webp', 'avif', etc.

    // 2. Build Cloudflare Image Resizing options
    // Note: This 'cf' object only works on the Cloudflare network.
    const resizeOptions = {
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      quality: parseInt(quality),
      format: format,
      fit: 'cover', // Default to cover, can be made dynamic
    };

    // 3. Construct the source URL (the R2 asset)
    // You should replace this with your actual R2 public bucket URL or use env.R2_BUCKET.get(path)
    const sourceUrl = `${env.R2_BUCKET_URL}/${path}`;

    // 4. Fetch the image with resizing options
    // If you have Cloudflare Image Resizing enabled on your zone:
    const response = await fetch(sourceUrl, {
      cf: {
        image: resizeOptions
      }
    });

    // 5. Fallback logic if 'cf' image resizing is not available or fails
    // (Optional: You could use a library like 'photoshop' or similar if working in a thick worker, 
    // but typically you'd trigger resizing via the 'cf' object).

    if (!response.ok) {
      return new Response(`Failed to fetch source image: ${response.statusText}`, { status: response.status });
    }

    // 6. Return the processed image with appropriate cache headers
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    newResponse.headers.set('Vary', 'Accept'); // Important for serving different formats based on browser support
    
    return newResponse;
  },
};
