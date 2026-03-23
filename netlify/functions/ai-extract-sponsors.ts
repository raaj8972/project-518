import { type Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { callAI, AIMessage, AIModel } from './lib/ai';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
    const { isAdmin, user: authUser } = await verifyAdminHelper(authHeader, supabase);

    if (!authUser || !isAdmin) {
       return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Admin access required' }) };
    }

    const { images, model } = JSON.parse(event.body || '{}');

    if (!images || !Array.isArray(images) || images.length === 0) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'At least one image is required.' }) };
    }

    const systemInstruction = `
You are an expert at analyzing sponsor/partner branding materials for a college/school cultural festival.
The user is providing images that show sponsor logos, banners, partnership documents, or brochures.
Extract ALL sponsors/partners visible across ALL provided images.

CRITICAL INSTRUCTIONS:
1. Return ONLY raw JSON. No markdown blocks.
2. Each image may contain multiple sponsors. Extract ALL of them.
3. Identify the tier/category from context (Title Sponsor, Gold, Silver, Bronze, Media Partner, Food Partner, Tech Partner, Associate Sponsor, etc.).
4. If a logo is visible, describe it briefly (we cannot extract the image URL itself).
5. Generate a short professional description of the company/brand relationship.

Required JSON structure - an Array of Sponsor objects:
[
  {
    "name": "String (exact company/brand name)",
    "category": "String (Title Sponsor, Gold, Silver, Bronze, Media Partner, Food Partner, Tech Partner, Associate Sponsor, etc.)",
    "description": "String (1-2 sentence description of the sponsor or their contribution)",
    "website": "String (website URL if visible, else '')",
    "logo_description": "String (brief description of the logo for reference)"
  }
]
`;

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: "Extract all sponsors/partners from the images above into the required JSON format.",
        images: images.map(img => img.replace(/^data:image\/(png|jpeg|webp);base64,/, ""))
      }
    ];

    const aiResponse = await callAI(model as AIModel, messages, systemInstruction, 0.1);

    if (!aiResponse.success) {
      return { 
        statusCode: aiResponse.status || 500, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ error: aiResponse.error || 'AI request failed' }) 
      };
    }

    // Try to parse the JSON
    let sponsors = [];
    try {
      const cleanJson = aiResponse.message.replace(/```json\n?|\n?```/g, '').trim();
      sponsors = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse AI JSON:', aiResponse.message);
      throw new Error('AI returned invalid format');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, sponsors, model: aiResponse.model }),
    };
  } catch (error: any) {
    console.error('AI Sponsor Extraction Error:', error);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message || 'Internal Server Error' }) };
  }
};
