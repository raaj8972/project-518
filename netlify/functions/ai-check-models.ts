const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro-latest'];

// Using a simple cache so we don't spam the API and use up the quota just checking availability
let cachedStatuses: Record<string, boolean> | null = null;
let lastCheckTime = 0;
const CACHE_DURATION_MS = 60 * 1000; // Cache for 1 minute

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.GOOGLE_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const now = Date.now();
  if (cachedStatuses && (now - lastCheckTime < CACHE_DURATION_MS)) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cached: true, models: cachedStatuses })
    };
  }

  const pingModel = async (model: string): Promise<boolean> => {
    try {
      const data = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 1 }
      });

      const response = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        // Extremely short timeout so the UI doesn't hang
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        return true;
      }
      
      // If 429 (Too Many Requests) or 503 (Service Unavailable)
      if (response.status === 429 || response.status === 503) {
        return false;
      }
      
      // For any other unexpected error, we assume it's offline/failing
      return false;
    } catch (error) {
      console.error(`Error checking model ${model}:`, error);
      return false;
    }
  };

  try {
    const statuses: Record<string, boolean> = {};
    
    // Ping all models in parallel to save time
    const results = await Promise.all(
      ALLOWED_MODELS.map(async (model) => {
        const isAvailable = await pingModel(model);
        return { model, isAvailable };
      })
    );

    for (const res of results) {
      statuses[res.model] = res.isAvailable;
    }

    // Update cache
    cachedStatuses = statuses;
    lastCheckTime = now;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cached: false, models: statuses })
    };

  } catch (error) {
    console.error('Error checking models:', error);
    // If totally failed, return whatever cache we have or assume all are busy
    return { 
      statusCode: 200, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cached: true, 
        error: true,
        models: cachedStatuses || ALLOWED_MODELS.reduce((acc, m) => ({ ...acc, [m]: false }), {}) 
      }) 
    };
  }
};
