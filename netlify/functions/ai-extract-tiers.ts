import { type Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { callAI, AIMessage, AIModel } from './lib/ai';

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

export const handler: Handler = async (event: any) => {
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

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: "Extract all sponsorship tiers/packages from the brochure images provided.",
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
    let rawTiers = [];
    try {
      const cleanJson = aiResponse.message.replace(/```json\n?|\n?```/g, '').trim();
      rawTiers = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse AI JSON:', aiResponse.message);
      throw new Error('AI returned invalid format');
    }

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
      body: JSON.stringify({ success: true, tiers: enrichedTiers, model: aiResponse.model }),
    };
  } catch (error: any) {
    console.error('AI Tier Extraction Error:', error);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message || 'Internal Server Error' }) };
  }
};
