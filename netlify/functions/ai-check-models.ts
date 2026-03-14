import { type Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro-latest'];

// Using a simple cache so we don't spam the API and use up the quota just checking availability
let cachedStatuses: Record<string, boolean> | null = null;
let lastCheckTime = 0;
const CACHE_DURATION_MS = 60 * 1000; // Cache for 1 minute

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const { getSupabaseClient } = await import('./lib/supabase');
    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
    
    const supabase = getSupabaseClient(true);
    const { isAdmin, user: authUser } = await verifyAdminHelper(authHeader?.toString(), supabase);

    if (!authUser || !isAdmin) {
       return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Admin access required' }) };
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
          signal: AbortSignal.timeout(3000)
        });

        if (response.ok) return true;
        if (response.status === 429 || response.status === 503) return false;
        return false;
      } catch (error) {
        console.error(`Error checking model ${model}:`, error);
        return false;
      }
    };

    const statuses: Record<string, boolean> = {};
    const results = await Promise.all(
      ALLOWED_MODELS.map(async (model) => {
        const isAvailable = await pingModel(model);
        return { model, isAvailable };
      })
    );

    for (const res of results) {
      statuses[res.model] = res.isAvailable;
    }

    cachedStatuses = statuses;
    lastCheckTime = now;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cached: false, models: statuses })
    };

  } catch (error: any) {
    console.error('Error checking models:', error);
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
