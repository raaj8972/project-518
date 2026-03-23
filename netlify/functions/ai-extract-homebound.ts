import { type Handler } from '@netlify/functions';
import { callAI, AIMessage, AIModel } from './lib/ai';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const { getSupabaseClient } = await import('./lib/supabase');
    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
    
    const supabase = getSupabaseClient(true);
    const { isAdmin, user: authUser } = await verifyAdminHelper(authHeader?.toString(), supabase);

    if (!authUser || !isAdmin) {
      return { 
        statusCode: 403, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ error: 'Unauthorized: Admin access required' }) 
      };
    }

    const { prompt, images, model } = JSON.parse(event.body || '{}');

    if (!prompt && (!images || images.length === 0)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt or images are required' }),
      };
    }

    const systemInstruction = `
You are an expert talent scout and professional data coordinator for RICORRENZA, a premium talent management platform.
Your task is to extract a list of artists/members from the provided text or images with 100% accuracy.

MATCHING LOGIC:
- If provided with multiple images, perform visual recognition to match each artist's name to their respective portrait photo.
- If an image contains a roster/list and you have separate headshots, link the name from the list to the index of the matching headshot.
- "image_index" (integer): 
  - 0-based index targeting the 'images' array provided.
  - Set to -1 only if no visual match exists in the provided images.

EXTRACTION FIELDS:
- name (string: Full Name)
- role (string: Primary talent title, e.g., "Lead Vocalist", "Synthesizer Lead")
- description (string: Professional bio, 2-3 sentences. High-end, engaging tone.)
- specialty (string: Primary skill/instrument)
- category (string: EXACTLY one of: "Vocals", "Guitar", "Bass", "Drums", "Keyboard", "Other")
- is_featured (boolean): Set to true if they appear to be a lead member, founder, or highlighted artist in the text/roster.
- social_links (object):
  - instagram (string: Full URL. Convert handles like "@username" or "username" to "https://instagram.com/username")
  - youtube (string: Full URL if found)
  - spotify (string: Full URL if found)
- image_index (number: index of the matched image, or -1)

QUALITY RULES:
1. SOCIAL NORMALIZATION: ALWAYS convert Instagram identifiers to complete https://instagram.com/ urls.
2. TONE: Bios must feel premium and "ready for publication".
3. ACCURACY: If you find an Instagram link in a caption next to a photo, ensure that photo is linked to that artist.
4. OUTPUT: Return EXCLUSIVELY a strictly valid JSON array of objects.
`;

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `USER INPUT:\n${prompt || 'Extract members from the provided images.'}`,
        images: (images || []).map((img: any) => img.data.replace(/^data:image\/(png|jpeg|webp);base64,/, ""))
      }
    ];

    const aiResponse = await callAI(model as AIModel, messages, systemInstruction, 0.2);

    if (!aiResponse.success) {
      return { 
        statusCode: aiResponse.status || 500, 
        body: JSON.stringify({ error: aiResponse.error || 'AI request failed' }) 
      };
    }

    // Try to parse JSON from response
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
      body: JSON.stringify({ success: true, members: parsedData, model: aiResponse.model }),
    };
  } catch (error: any) {
    console.error('AI Extraction Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};
