import { type Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';
import { callAI, type AIModel, type AIMessage } from './lib/ai';

const DEFAULT_MODEL: AIModel = 'gemini-2.0-flash-lite';
const ALLOWED_MODELS: string[] = [
  'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro-latest',
  'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'
];

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
    
    const supabase = getSupabaseClient(true);
    const { isAdmin, user: authUser } = await verifyAdminHelper(authHeader?.toString(), supabase);

    if (!authUser || !isAdmin) {
       return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Admin access required' }) };
    }

    const { images, model } = JSON.parse(event.body || '{}');
    const selectedModel = (ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL) as AIModel;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'At least one image is required.' }) };
    }

    const systemInstruction = `
You are an expert event planner analyzing images of event posters, flyers, or brochures for a college/school cultural festival.
Extract ALL events visible across ALL provided images into a structured JSON array.

CRITICAL INSTRUCTIONS:
1. Return ONLY raw JSON. No markdown blocks.
2. Each image may contain one or multiple events. Extract ALL of them.
3. Generate professional, engaging descriptions for each event.
4. Infer the category from context (Technical, Non-Technical, Cultural, Sports, Arts, General).
5. Generate 3-5 highlights and 3-5 rules per event from context.

Required JSON structure - an Array of Event objects:
[
  {
    "title": "String (exact event name from the poster)",
    "category": "String (Technical, Non-Technical, Cultural, Sports, Arts, or General)",
    "description": "String (A 2-3 sentence professional description of the event)",
    "date": "String (YYYY-MM-DD if found, else '')",
    "time": "String (e.g. '10:00 AM' or '14:00', else '')",
    "venue": "String (location if mentioned, else '')",
    "participants": "String (who can participate, e.g. 'All UG Students', 'Teams of 3-5')",
    "highlights": ["Array of 3-5 exciting feature points"],
    "rules": ["Array of 3-5 clear rules"],
    "registration_open": true
  }
]
`;

    const aiMessages: AIMessage[] = [
      {
        role: 'user',
        content: "Extract all events from the provided images into the required JSON format.",
        images: images
      }
    ];

    const result = await callAI(selectedModel, aiMessages, systemInstruction, 0.1);

    if (!result.success) {
      return { 
        statusCode: result.status || 500, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ error: result.error }) 
      };
    }

    let responseText = result.message.trim();
    // Clean up markdown code blocks if present
    responseText = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, events: JSON.parse(responseText), model: selectedModel }),
    };
  } catch (error: any) {
    console.error('AI Event Extraction Error:', error);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message || 'Internal Server Error' }) };
  }
};
