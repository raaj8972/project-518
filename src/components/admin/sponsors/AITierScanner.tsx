import React from 'react';
import { AIChatScanner } from '../AIChatScanner';

const SYSTEM_INSTRUCTION = `You are a rigorous AI conversational assistant for sponsorship tier extraction.
Your goal is to extract sponsorship tiers from brochures, pricing tables, or text provided by the user.

MANDATORY FIELDS FOR EVERY TIER (Ask ONLY if these are missing and not explicitly declared as unavailable):
- "name": The tier name (e.g., Platinum, Gold, Silver).
- "amount": The required sponsorship amount (number). 
- "benefits": A list of perks (array of strings).

STRICT PROTOCOL:
1. If ANY mandatory field is missing, respond naturally and ask for them.
2. If the user explicitly states a mandatory field is "not available", "unknown", "skip", or "don't know", USE A PLACEHOLDER (e.g., 0 for amount, ["TBA"] for benefits) and proceed to generate the JSON.
3. If the user provided content but some fields are absent, and the user says "extract with what you have" or "proceed", DO NOT RE-ASK. Use placeholders.
4. ONLY when all mandatory fields are known for at least one tier, or explicitly waived by the user, output the final result as a JSON array wrapped in markdown blocks:
\`\`\`json
[
  {
    "name": "...",
    "amount": 5000,
    "benefits": ["Benefit 1", "Benefit 2"],
    "max_sponsors": 5
  }
]
\`\`\`
5. Be thorough and ensure all benefits are listed.
6. If the user tells you to "extract what you can" or "skip missing info", use placeholders and generate JSON.
7. If benefits are not found and user doesn't specify, use ["Benefits TBA"].`;


interface AITierScannerProps {
  onScanComplete: (tiersData: any[]) => void;
  onCancel: () => void;
}

export const AITierScanner: React.FC<AITierScannerProps> = ({ onScanComplete, onCancel }) => {
  return (
    <AIChatScanner
      title="AI Brochure Scanner"
      description="Upload sponsorship brochures or tables to auto-create standardized tiers."
      systemInstruction={SYSTEM_INSTRUCTION}
      onDataComplete={(data) => {
        const parsed = Array.isArray(data) ? data : (data.tiers || data.data || []);
        onScanComplete(parsed);
      }}
      onCancel={onCancel}
      placeholder="Extract tier names, amounts, and benefits..."
    />
  );
};

