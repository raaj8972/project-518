import { type Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { callAI, AIMessage } from './lib/ai';

export const handler: Handler = async (event) => {
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

    if (!images || !Array.isArray(images) || images.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'At least one image is required.' }),
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

CRITICAL: Return ONLY raw JSON. Do not include any text before or after the JSON.
`;

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: "Extract all schedule slots from the images above into the required JSON format.",
        images: images.map(img => img.replace(/^data:image\/(png|jpeg|webp);base64,/, ""))
      }
    ];

    const aiResponse = await callAI(
      model,
      messages,
      systemInstruction,
      0.1
    );

    if (!aiResponse.success) {
      throw new Error(aiResponse.error || 'AI Failed to respond');
    }

    // Try to parse JSON from response
    let slots = [];
    try {
      const cleanJson = aiResponse.message.replace(/```json\n?|\n?```/g, '').trim();
      slots = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse AI JSON:', aiResponse.message);
      throw new Error('AI returned invalid format');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, slots, model: aiResponse.model }),
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
