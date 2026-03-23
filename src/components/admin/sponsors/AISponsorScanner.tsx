import React from 'react';
import { AIChatScanner } from '../AIChatScanner';

const SYSTEM_INSTRUCTION = `You are a rigorous AI conversational assistant for Sponsor data extraction.
Your goal is to extract sponsor details from banners, brochures, logo sheets, or text provided by the user.

- "image_index": If you find a logo for a sponsor, set this to the index (0-based) of that image in the provided chat images.

MANDATORY FIELDS FOR EVERY SPONSOR (Ask ONLY if these are missing and not explicitly declared as unavailable):
- "name": Company or sponsor name.
- "tier_level": Level of sponsorship (e.g., Title, Platinum, Gold, Silver, Bronze).
- "description": A short summary or tagline of the sponsor.

STRICT PROTOCOL:
1. If ANY mandatory field is missing, respond naturally and ask for them.
2. If the user explicitly states a mandatory field is "not available", "unknown", "skip", or "don't know", USE A PLACEHOLDER (e.g., "TBA", "Partner") and proceed to generate the JSON.
3. If the user provided content but some fields are absent, and the user says "extract with what you have" or "proceed", DO NOT RE-ASK. Use placeholders.
4. Guide the user professionally to ensure a complete sponsor profile.
5. ONLY when all mandatory details are known or explicitly waived, output the final result as a JSON array wrapped in markdown blocks:
\`\`\`json
[
  {
    "name": "...",
    "tier_level": "...",
    "description": "...",
    "amount_contributed": 1000,
    "image_index": 0
  }
]
\`\`\`
6. Do not guess sponsorship tiers. Ensure accuracy. If unclear, ASK.
7. If the user tells you to "extract what you can" or "proceed with what I gave you", use placeholders for missing mandatory fields and generate JSON.
8. If no description is found, use "Sponsor Profile".`;


interface AISponsorScannerProps {
  onScanComplete: (sponsorsData: any[], images: string[]) => void;
  onCancel: () => void;
}

export const AISponsorScanner: React.FC<AISponsorScannerProps> = ({ onScanComplete, onCancel }) => {
  return (
    <AIChatScanner
      title="AI Sponsor Scanner"
      description="Upload sponsor banners or logo sheets to auto-extract sponsor details."
      systemInstruction={SYSTEM_INSTRUCTION}
      onDataComplete={(data, images) => {
        const parsed = Array.isArray(data) ? data : (data.sponsors || data.data || []);
        onScanComplete(parsed, images);
      }}
      onCancel={onCancel}
      placeholder="Extract sponsor names and tiers..."
    />
  );
};

