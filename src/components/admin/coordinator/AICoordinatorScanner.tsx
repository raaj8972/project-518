import React from 'react';
import { AIChatScanner } from '../AIChatScanner';

const SYSTEM_INSTRUCTION = `You are an AI assistant designed to extract coordinator password assignments from documents or images.
Your task is to analyze the provided images and extract a list of event names, coordinator names, and their assigned passwords.
Please return ONLY a valid JSON array of objects. Each object must have the following keys:
- "event_name" (string)
- "coordinator_name" (string)
- "password" (string)
STRICT PROTOCOL:
1. If "event_name" or "coordinator_name" are missing, ask for them unless user says "skip".
2. If the password is "not available", "missing", "unknown", or "skip", use "TBA" as the password.
3. If the user provided content but some fields are absent, and the user says "extract with what you have" or "proceed", DO NOT RE-ASK. Use placeholders.
4. If no relevant data is found, return an empty array [].
5. Do not include any markdown formatting like \`\`\`json in your response.
6. If the user says "extract what you can" or "proceed without missing info", use "TBA" for missing fields and generate JSON.`;

interface ExtractedPasswordData {
  event_name: string;
  coordinator_name: string;
  password: string;
}

interface AICoordinatorScannerProps {
  onScanComplete: (data: ExtractedPasswordData[]) => void;
  onCancel: () => void;
}

export const AICoordinatorScanner: React.FC<AICoordinatorScannerProps> = ({ 
  onScanComplete, 
  onCancel 
}) => {
  return (
    <AIChatScanner
      title="AI Coordinator Scanner"
      description="Upload documents to automatically extract and assign passwords to coordinators."
      systemInstruction={SYSTEM_INSTRUCTION}
      onDataComplete={(data) => {
        const parsed = Array.isArray(data) ? data : (data.data || []);
        onScanComplete(parsed);
      }}
      onCancel={onCancel}
      placeholder="E.g., Find the passwords assigned for XYZ event..."
    />
  );
};

