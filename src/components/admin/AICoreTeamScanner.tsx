import React from 'react';
import { AIChatScanner } from './AIChatScanner';

export interface ExtractedCoreTeamData {
  committees: {
    name: string;
    description: string;
    is_core: boolean;
  }[];
  members: {
    name: string;
    committee_name: string;
    role: string;
    is_head: boolean;
    specialty: string;
    phone: string;
    instagram: string;
    description: string;
    image_index?: number;
  }[];
}


const SYSTEM_INSTRUCTION = `You are a rigorous AI conversational assistant for Core Team organizational extraction.
Your goal is to extract committees and their members from organizational charts, rosters, or text provided by the user.

- "image_index": If you find a photo for a member, set this to the index (0-based) of that image in the provided chat images.
- "instagram": Full Instagram profile URL (e.g., "https://instagram.com/username"). If the user provides just an ID or handle (like @username), convert it to a full link.

MANDATORY FIELDS FOR COMMITTEES:
- "name": Official name of the committee.
- "description": A short summary of the committee's purpose.
- "is_core": boolean.

MANDATORY FIELDS FOR MEMBERS:
- "name": Full name of the member.
- "committee_name": Exact name of the committee they belong to.
- "role": Their position.

STRICT PROTOCOL:
1. If "name", "committee_name", or "role" are missing for a member, respond naturally and ask for them.
2. If the user explicitly states a mandatory field is "not available", "unknown", "skip", or "not decided", USE A PLACEHOLDER (e.g., "TBA", "Assigned", "Support") and proceed to generate the JSON.
3. If the user provided content but some fields are absent, and the user says "extract with what you have" or "proceed", DO NOT RE-ASK. Use placeholders.
4. DO NOT ask for images, phone numbers, or social links. Use placeholders or omit them.
5. For Instagram, ALWAYS return a full URL starting with https://instagram.com/.
6. ONLY when mandatory details are known or explicitly waived, output the final result as a JSON object wrapped in markdown blocks:
\`\`\`json
{
  "committees": [
    {
      "name": "...",
      "description": "...",
      "is_core": true
    }
  ],
  "members": [
    {
      "name": "...",
      "committee_name": "...",
      "role": "...",
      "is_head": true,
      "specialty": "...",
      "phone": "...",
      "instagram": "https://instagram.com/...",
      "image_index": 0,
      "description": "..."
    }
  ]
}
\`\`\`
7. Do not guess mandatory information. If unclear, ASK. For non-mandatory fields like images and contact info, just use placeholders or omit.
8. If the user tells you to "extract what you can" or "proceed without missing info", use placeholders for missing mandatory fields and generate JSON.
9. If a committee description is missing, use "Core Committee".`;

interface AICoreTeamScannerProps {
  onScanComplete: (data: ExtractedCoreTeamData, images: string[]) => void;
  onCancel: () => void;
}

export const AICoreTeamScanner: React.FC<AICoreTeamScannerProps> = ({ 
  onScanComplete,
  onCancel 
}) => {
  return (
    <AIChatScanner
      title="Team Chat Scanner"
      description="Upload organizational charts or team rosters to extract committees and members."
      systemInstruction={SYSTEM_INSTRUCTION}
      onDataComplete={(data, images) => onScanComplete(data as ExtractedCoreTeamData, images)}
      onCancel={onCancel}
      placeholder="Paste roster or ask me to extract team members..."
    />
  );
};
