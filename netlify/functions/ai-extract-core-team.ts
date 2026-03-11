import { type Handler } from '@netlify/functions';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash-lite';
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro-latest'];

export const handler: Handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { images, model } = JSON.parse(event.body || '{}');
    const selectedModel = ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'At least one image is required.' }) };
    }

    const API_KEY = process.env.GOOGLE_API_KEY;
    if (!API_KEY) {
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'AI configuration error (missing API key)' }) };
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

    const parts: any[] = [{ text: systemInstruction }];

    images.forEach((base64Data: string, index: number) => {
      const base64Clean = base64Data.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
      parts.push({ inline_data: { mime_type: "image/jpeg", data: base64Clean } });
      parts.push({ text: `Image ${index + 1} provided above.` });
    });

    parts.push({ text: "Extract all committees and members from the images above into the required JSON format." });

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
      if (response.status === 429 || response.status === 503) {
        return { statusCode: response.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Model "${selectedModel}" is busy. Try a different model.` }) };
      }
      throw new Error(errorData.error?.message || 'Failed to communicate with Gemini API');
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) throw new Error('Gemini API returned an empty response');

    const parsedData = JSON.parse(generatedText);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, data: parsedData, model: selectedModel }),
    };
  } catch (error: any) {
    console.error('AI Core Team Extraction Error:', error);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message || 'Internal Server Error' }) };
  }
};
