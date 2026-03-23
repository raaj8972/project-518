import { type Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { callAI, AIMessage, AIModel } from './lib/ai';

export const handler: Handler = async (event: any) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
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

    const { prompt, model } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' }),
      };
    }

    // Explicit instructions for Gemini to output JSON for our Event Form
    const systemInstruction = `
You are an expert event coordinator creating an event for a college/school festival. 
The user will provide a rough, messy idea or description of an event.
Your job is to parse it, improve it, and return pure JSON that matches the required EventFormState structure.
Generate professional, exciting descriptions and clear, structured rules.

CRITICAL: Return ONLY raw JSON. Do not include markdown \`\`\`json block markers. Just the JSON object.

The required JSON structure:
{
  "title": "String (A catchy title for the event)",
  "category": "String (Choose one: Technical, Non-Technical, Cultural, Sports, Arts, General)",
  "description": "String (A professional, engaging 2-3 paragraph description formatted with HTML <p> or <br> tags)",
  "date": "String (YYYY-MM-DD if provided, else leave empty '')",
  "time": "String (HH:MM if provided, else leave empty '')",
  "venue": "String (e.g., 'Main Auditorium', 'Lab 1', 'TBA' if not specified)",
  "participants": "String (Description of who can participate, e.g., 'All UG Students', 'Max 50 teams')",
  "highlights": [
    "Array of Strings (4-5 exciting bullet points to feature about the event)"
  ],
  "rules": [
    "Array of Strings (5-8 clear, concise rules for the event)"
  ],
  "registration_open": true,
  "registration_timer_enabled": false
}
`;

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    const aiResponse = await callAI(model as AIModel, messages, systemInstruction, 0.7);

    if (!aiResponse.success) {
      return { 
        statusCode: aiResponse.status || 500, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ error: aiResponse.error || 'AI request failed' }) 
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, text: aiResponse.message, model: aiResponse.model }),
    };
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};
