const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash-lite';
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro-latest'];

export const handler = async (event: any) => {
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

    const parts: any[] = [{ text: systemInstruction }];

    images.forEach((base64Data: string, index: number) => {
      const base64Clean = base64Data.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
      parts.push({ inline_data: { mime_type: "image/jpeg", data: base64Clean } });
      parts.push({ text: `Image ${index + 1} provided above.` });
    });

    parts.push({ text: "Extract all sponsors/partners from the images above into the required JSON format." });

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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, sponsors: JSON.parse(generatedText), model: selectedModel }),
    };
  } catch (error: any) {
    console.error('AI Sponsor Extraction Error:', error);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message || 'Internal Server Error' }) };
  }
};
