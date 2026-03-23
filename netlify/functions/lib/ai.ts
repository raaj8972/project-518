import { type Handler } from '@netlify/functions';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export type AIModel = 
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'
  | 'gemini-2.0-flash' 
  | 'gemini-2.0-flash-lite' 
  | 'gemini-pro-latest'
  | 'gemini-3-flash-preview'
  | 'gemini-3.1-pro-preview';

export interface AIMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
  images?: string[]; // base64 strings
}

export interface AIResponse {
  success: boolean;
  message: string;
  model: string;
  error?: string;
  status?: number;
}

export async function pingAI(model: AIModel): Promise<boolean> {
  try {
    const API_KEY = process.env.GOOGLE_API_KEY;
    if (!API_KEY) return false;

    const response = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 1 }
      }),
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function callAI(
  model: AIModel,
  messages: AIMessage[],
  systemInstruction?: string,
  temperature: number = 0.2
): Promise<AIResponse> {
  return callGemini(model, messages, systemInstruction, temperature);
}

async function callGemini(
  model: string,
  messages: AIMessage[],
  systemInstruction?: string,
  temperature: number = 0.2
): Promise<AIResponse> {
  const API_KEY = process.env.GOOGLE_API_KEY;
  if (!API_KEY) {
    return { success: false, message: '', model, error: 'GOOGLE_API_KEY not configured', status: 500 };
  }

  const contents = messages.map(msg => ({
    role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
    parts: [
      { text: msg.content },
      ...(msg.images || []).map(base64 => ({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64.replace(/^data:image\/(png|jpeg|webp);base64,/, "")
        }
      }))
    ]
  }));

  const requestBody: any = {
    contents,
    generationConfig: { temperature },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  try {
    const response = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        message: '', 
        model, 
        error: errorData.error?.message || `Gemini Error ${response.status}`,
        status: response.status 
      };
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      return { success: false, message: '', model, error: 'Gemini returned empty response', status: 500 };
    }

    return { success: true, message: generatedText, model };
  } catch (error: any) {
    return { success: false, message: '', model, error: error.message, status: 500 };
  }
}
