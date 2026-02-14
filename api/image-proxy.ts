
export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  const { url } = event.queryStringParameters || {};

  if (!url) {
    return new Response('Missing "url" parameter', { status: 400, headers });
  }

  try {
    // Determine if we can use native fetch (Node 18+)
    const response = await fetch(url);

    if (!response.ok) {
      return { 
        statusCode: response.status, 
        body: `Failed to fetch image: ${response.statusText}` 
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*', // Allow all origins (fixes CORS)
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Proxy Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to proxy image', details: String(error) }), { status: 500, headers });
  }
};
