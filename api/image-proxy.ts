export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing "url" parameter', { status: 400 });
  }

  try {
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      return new Response(`Failed to fetch image: ${imageResponse.statusText}`, { status: imageResponse.status });
    }

    const newHeaders = new Headers(imageResponse.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Remove headers that might cause issues or are not needed for proxy
    newHeaders.delete('Content-Encoding');
    newHeaders.delete('Content-Length'); // Let the browser handle stream length
    
    // Pass the stream directly
    return new Response(imageResponse.body, {
      status: 200,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response('Internal Server Error: ' + String(error), { status: 500 });
  }
}
