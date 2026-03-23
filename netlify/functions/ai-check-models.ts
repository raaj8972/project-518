import { type Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';
import { pingAI, type AIModel } from './lib/ai';

const ALLOWED_MODELS: AIModel[] = [
  'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro-latest',
  'gemini-3-flash-preview', 'gemini-3.1-pro-preview'
];

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
    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
    
    const supabase = getSupabaseClient(true);
    const { isAdmin, user: authUser } = await verifyAdminHelper(authHeader?.toString(), supabase);

    if (!authUser || !isAdmin) {
       return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Admin access required' }) };
    }

    const now = Date.now();
    if (cachedStatuses && (now - lastCheckTime < CACHE_DURATION_MS)) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cached: true, models: cachedStatuses })
      };
    }

    const statuses: Record<string, boolean> = {};
    const results = await Promise.all(
      ALLOWED_MODELS.map(async (model) => {
        const isAvailable = await pingAI(model);
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
