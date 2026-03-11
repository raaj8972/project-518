const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash-lite';
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro-latest'];

const TIER_COLOR_MAP: Record<string, string> = {
  'title': 'from-yellow-400 to-amber-600',
  'platinum': 'from-slate-300 to-slate-500',
  'diamond': 'from-cyan-300 to-blue-500',
  'gold': 'from-yellow-500 to-orange-500',
  'silver': 'from-gray-300 to-gray-500',
  'bronze': 'from-orange-400 to-orange-700',
  'media': 'from-purple-500 to-violet-600',
  'associate': 'from-green-500 to-emerald-600',
  'food': 'from-red-400 to-pink-600',
  'tech': 'from-blue-500 to-indigo-600',
  'default': 'from-gray-500 to-gray-600',
};

const TIER_ICON_MAP: Record<string, string> = {
  'title': 'Crown',
  'platinum': 'Gem',
  'diamond': 'Diamond',
  'gold': 'Award',
  'silver': 'Medal',
  'bronze': 'Shield',
  'media': 'Tv',
  'associate': 'Handshake',
  'food': 'UtensilsCrossed',
  'tech': 'Cpu',
  'default': 'Star',
};

function inferColorAndIcon(tierName: string) {
  const lower = tierName.toLowerCase();
  let color = TIER_COLOR_MAP['default'];
  let icon = TIER_ICON_MAP['default'];

  for (const key of Object.keys(TIER_COLOR_MAP)) {
    if (lower.includes(key)) {
      color = TIER_COLOR_MAP[key];
      icon = TIER_ICON_MAP[key] || icon;
      break;
    }
  }
  return { color, icon };
}

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
You are an expert at analyzing sponsorship brochures, pricing documents, and partnership materials for college/school cultural festivals.
The user is providing images of sponsorship brochures that contain different sponsorship TIERS/PACKAGES with their pricing and benefits.

CRITICAL INSTRUCTIONS:
1. Return ONLY raw JSON. No markdown blocks, no extra text.
2. Extract ALL sponsorship tiers/packages visible across ALL provided images.
3. For each tier, extract the name, price, and list of benefits/perks.
4. Order tiers from highest value to lowest.
5. Prices should be strings (e.g., "₹1,00,000", "$5000", "Contact Us").

Required JSON structure - an Array of Tier objects:
[
  {
    "tier": "String (exact tier name, e.g. 'Title Sponsor', 'Gold Partner', 'Silver Sponsor')",
    "price": "String (price as shown, e.g. '₹1,00,000', '$5000', 'Contact Us')",
    "benefits": ["Array of benefit strings extracted from the brochure"],
    "order_position": "Number (1 = highest tier, ascending)"
  }
]
`;

    const parts: any[] = [{ text: systemInstruction }];

    images.forEach((base64Data: string, index: number) => {
      const base64Clean = base64Data.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
      parts.push({ inline_data: { mime_type: "image/jpeg", data: base64Clean } });
      parts.push({ text: `Brochure image ${index + 1} provided above.` });
    });

    parts.push({ text: "Extract all sponsorship tiers/packages from the brochure images above into the required JSON format." });

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

    const rawTiers = JSON.parse(generatedText);

    const enrichedTiers = rawTiers.map((t: any, i: number) => {
      const { color, icon } = inferColorAndIcon(t.tier || '');
      return {
        tier: t.tier || `Tier ${i + 1}`,
        price: t.price || 'Contact Us',
        color,
        icon,
        benefits: t.benefits || [],
        order_position: t.order_position || i + 1,
        enabled: true,
      };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, tiers: enrichedTiers, model: selectedModel }),
    };
  } catch (error: any) {
    console.error('AI Tier Extraction Error:', error);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message || 'Internal Server Error' }) };
  }
};
