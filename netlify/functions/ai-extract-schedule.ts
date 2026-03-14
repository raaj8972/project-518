import { type Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash-lite';
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro-latest'];

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
    const { isAdmin, user: authUser } = await verifyAdminHelper(authHeader?.toString(), supabase);

    if (!authUser || !isAdmin) {
       return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Admin access required' }) };
    }

    const { images, model } = JSON.parse(event.body || '{}');
    const selectedModel = ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'At least one image is required.' }),
      };
    }

    const API_KEY = process.env.GOOGLE_API_KEY;
    if (!API_KEY) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AI configuration error (missing API key)' }),
      };
    }

    const systemInstruction = `
You are an expert scheduler analyzing images of event schedules, timetables, or agendas for a festival.
Extract ALL slots and their corresponding details visible across ALL provided images into a structured JSON array.

REQUIRED JSON STRUCTURE (Array of Slots):
[
  {
    "title": "String (Event/Session name)",
    "category": "String (Technical, Non-Technical, Cultural, Sports, Arts, or General)",
    "description": "String (A 1-sentence description if possible, else '')",
    "date": "String (YYYY-MM-DD if found, else '')",
    "start_time": "String (e.g. '10:00 AM' or '14:00', else '')",
    "end_time": "String (e.g. '11:30 AM' or '15:30', else '')",
    "venue": "String (location if mentioned, else '')",
    "is_highlight": false
  }
]

CRITICAL: Return ONLY raw JSON. No markdown blocks.
`;

    const parts: any[] = [{ text: systemInstruction }];

    images.forEach((base64Data: string, index: number) => {
      const base64Clean = base64Data.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
      parts.push({ inline_data: { mime_type: "image/jpeg", data: base64Clean } });
      parts.push({ text: `Image ${index + 1} provided above.` });
    });

    parts.push({ text: "Extract all schedule slots from the images above into the required JSON format." });

    const requestBody = {
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    };

    const apiUrl = `${GEMINI_BASE}/${selectedModel}:generateContent?key=${API_KEY}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      console.error('Gemini API Error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to communicate with Gemini API');
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) throw new Error('Gemini API returned an empty response');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, slots: JSON.parse(generatedText), model: selectedModel }),
    };

  } catch (error: any) {
    console.error('AI Schedule Extraction Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};
