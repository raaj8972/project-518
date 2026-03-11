import React from 'react';
import { GenericAIGenerator } from '../GenericAIGenerator';

export interface EventFormState {
  title: string;
  category: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  participants: string;
  highlights: string[];
  rules: string[];
  registration_open: boolean;
  registration_timer_enabled: boolean;
  watch_live_url?: string;
}

interface EventAIGeneratorProps {
  onGenerated: (data: Partial<EventFormState>) => void;
}

export const EventAIGenerator: React.FC<EventAIGeneratorProps> = ({ onGenerated }) => {
  const systemInstruction = `
You are an expert event coordinator creating an event for a college/school festival. 
The user will provide a rough, messy idea or description of an event.
Your job is to parse it, improve it, and return pure JSON that matches the required EventFormState structure.
Generate professional, exciting descriptions and clear, structured rules.

CRITICAL: Return ONLY raw JSON. No markdown blocks.

The required JSON structure:
{
  "title": "String (A catchy title for the event)",
  "category": "String (Choose one: Technical, Non-Technical, Cultural, Sports, Arts, General)",
  "description": "String (A professional, engaging 2-3 paragraph description formatted with HTML <p> or <br> tags)",
  "date": "String (YYYY-MM-DD if provided, else leave empty '')",
  "time": "String (HH:MM if provided, else leave empty '')",
  "venue": "String (e.g., 'Main Auditorium', 'Lab 1', 'TBA' if not specified)",
  "participants": "String (Description of who can participate, e.g., 'All UG Students', 'Max 50 teams')",
  "highlights": [
    "Array of Strings (4-5 exciting bullet points to feature about the event)"
  ],
  "rules": [
    "Array of Strings (5-8 clear, concise rules for the event)"
  ],
  "registration_open": true,
  "registration_timer_enabled": false
}
`;

  return (
    <GenericAIGenerator
      uiTitle="AI Magic Fill"
      uiDescription="Describe your event, and AI will generate the title, category, description, highlights, and rules for you."
      placeholder="e.g., 'I want to organize a hackathon called CodeRush for CSE students focus on web dev with 5k prize'"
      systemInstruction={systemInstruction.trim()}
      onGenerated={onGenerated}
    />
  );
};
