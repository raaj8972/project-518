import { type Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';
import { callAI, AIMessage, AIModel } from './lib/ai';

export const handler: Handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
    
    // Initialize Supabase with centralized utility (includes fallbacks)
    const supabase = getSupabaseClient(true);
    const { isAdmin, user: authUser } = await verifyAdminHelper(authHeader?.toString(), supabase);

    if (!authUser || !isAdmin) {
       return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Admin access required' }) };
    }

    const { images, model } = JSON.parse(event.body || '{}');

    if (!images || !Array.isArray(images) || images.length === 0) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'At least one image is required.' }) };
    }

    const systemInstruction = `
You are an expert event HR manager analyzing images of core team rosters, organization charts, or committee lists for a festival or event.
Extract ALL committees and their corresponding team members visible across ALL provided images into a structured JSON object.

CRITICAL INSTRUCTIONS:
1. Return ONLY raw JSON. No markdown blocks.
2. An image may contain a list of committees and their members. Extract ALL of them.
3. For committees, infer a short description if none exists.
4. For members, associate them with their respective committee. Identify if they are the "head" or a regular "member".
5. Generate a short missing bio/description for members if needed based on their role.

Required JSON structure - an Object containing 'committees' and 'members' arrays:
{
  "committees": [
    {
      "name": "String (exact committee name from the document)",
      "description": "String (A 1-2 sentence professional description of the committee's responsibility)",
      "is_core": true
    }
  ],
  "members": [
    {
      "name": "String (full name of the member)",
      "committee_name": "String (Must exactly match a name in the committees array)",
      "role": "String (Their title/role, e.g. 'Lead Coordinator', 'Developer')",
      "is_head": "Boolean (true if they are head/lead/director, false otherwise)",
      "specialty": "String (Short 1-3 word tag describing their specialty or domain)",
      "phone": "String (Their phone number if visible, else '')",
      "description": "String (A 1-2 sentence professional bio)"
    }
  ]
}
`;

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: "Extract all committees and members from the images above into the required JSON format.",
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
    let parsedData;
    try {
      const cleanJson = aiResponse.message.replace(/```json\n?|\n?```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse AI JSON:', aiResponse.message);
      throw new Error('AI returned invalid format');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, data: parsedData, model: aiResponse.model }),
    };
  } catch (error: any) {
    console.error('AI Core Team Extraction Error:', error);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message || 'Internal Server Error' }) };
  }
};
