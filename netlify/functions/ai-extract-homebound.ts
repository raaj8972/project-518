import { type Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash-lite';
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro-latest'];

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
    const { isAdmin, user: authUser } = await verifyAdminHelper(authHeader?.toString(), supabase);

    if (!authUser || !isAdmin) {
      return { 
        statusCode: 403, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ error: 'Unauthorized: Admin access required' }) 
      };
    }

    const { prompt, images, model } = JSON.parse(event.body || '{}');
    const selectedModel = ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL;

    if (!prompt && (!images || images.length === 0)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt or images are required' }),
      };
    }

    const API_KEY = process.env.GOOGLE_API_KEY;
    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'AI configuration error (missing API key)' }),
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

    const userParts: any[] = [{ text: `${systemInstruction}\n\nUSER INPUT:\n${prompt || 'Extract members from the provided images.'}` }];

    if (images && images.length > 0) {
      images.forEach((img: { data: string, mimeType: string }, index: number) => {
        userParts.push({
          inline_data: {
            data: img.data,
            mime_type: img.mimeType || "image/jpeg"
          }
        });
        userParts.push({ text: `Image ${index + 1} provided above.` });
      });
    }

    const requestBody = {
      contents: [{ role: 'user', parts: userParts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };

    const apiUrl = `${GEMINI_BASE}/${selectedModel}:generateContent?key=${API_KEY}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to communicate with Gemini API');
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) throw new Error('Gemini API returned an empty response');

    // Parse to ensure it's valid JSON before returning
    const parsedData = JSON.parse(generatedText);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, members: parsedData }),
    };
  } catch (error: any) {
    console.error('AI Extraction Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};
