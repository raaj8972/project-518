import { type Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro-latest'];

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.GOOGLE_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: 'AI configuration error (missing API key)' };
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

    if (!images || !Array.isArray(images) || images.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No images provided' }) };
    }

    const selectedModel = ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL;

    const systemInstruction = `
You are an expert OCR and data extraction AI. 
Extract all student names, their unique IDs, and assigned passwords from the provided images of printed lists.
Return the result as a raw JSON array of objects.

JSON Structure:
[
  {
    "name": "Full Name",
    "uid": "Student ID/UID",
    "password": "Assigned Password"
  }
]

CRITICAL: Return ONLY raw JSON. No markdown blocks.
`;

    const imageParts = images.map(base64 => ({
      inline_data: {
        mime_type: 'image/jpeg',
        data: base64.replace(/^data:image\/(png|jpeg|webp);base64,/, "")
      }
    }));

    const response = await fetch(`${GEMINI_BASE}/${selectedModel}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemInstruction }, ...imageParts] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Gemini API Error');
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) throw new Error('AI returned empty response');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, students: JSON.parse(resultText) })
    };

  } catch (error: any) {
    console.error('AI Password Extraction Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
