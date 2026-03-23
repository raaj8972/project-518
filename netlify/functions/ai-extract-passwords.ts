import { type Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { callAI, AIMessage, AIModel } from './lib/ai';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
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

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: "Extract student names, IDs, and passwords from these images.",
        images: images.map(img => img.replace(/^data:image\/(png|jpeg|webp);base64,/, ""))
      }
    ];

    const aiResponse = await callAI(model as AIModel, messages, systemInstruction, 0.1);

    if (!aiResponse.success) {
      return { 
        statusCode: aiResponse.status || 500, 
        body: JSON.stringify({ error: aiResponse.error || 'AI request failed' }) 
      };
    }

    // Try to parse JSON from response
    let students = [];
    try {
      const cleanJson = aiResponse.message.replace(/```json\n?|\n?```/g, '').trim();
      students = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse AI JSON:', aiResponse.message);
      throw new Error('AI returned invalid format');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, students, model: aiResponse.model })
    };

  } catch (error: any) {
    console.error('AI Password Extraction Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
