import { type Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';
import { callAI, type AIModel, type AIMessage } from './lib/ai';

const DEFAULT_MODEL: AIModel = 'gemini-2.5-flash';
const ALLOWED_MODELS: string[] = [
  'gemini-3-flash-preview', 'gemini-3.1-pro-preview', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro-latest',
  'claude-3-5-sonnet-20240620', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'
];

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
    
    const supabase = getSupabaseClient(true);
    const { isAdmin, user: authUser } = await verifyAdminHelper(authHeader?.toString(), supabase);

    if (!authUser || !isAdmin) {
       console.log('[AI Chat] Unauthorized access attempt:', { hasUser: !!authUser, isAdmin });
       return { 
         statusCode: 403, 
         headers: { 'Content-Type': 'application/json' }, 
         body: JSON.stringify({ 
           error: `Unauthorized: Admin access required.`,
           details: 'Please ensure you are logged in as an authorized administrator.'
         }) 
       };
    }

    const { messages, systemInstruction, model } = JSON.parse(event.body || '{}');
    const selectedModel = (ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL) as AIModel;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Messages array is required.' }) };
    }

    // Map messages to our utility format
    const aiMessages: AIMessage[] = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      images: msg.images
    }));

    const result = await callAI(selectedModel, aiMessages, systemInstruction);

    if (!result.success) {
      return { 
        statusCode: result.status || 500, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ error: result.error }) 
      };
    }

    let generatedText = result.message;
    let isComplete = false;
    let extractedData = null;
    let responseText = generatedText.trim();

    // Check if the response contains JSON wrapped in triple backticks (```json ... ```)
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*```/i);
    if (jsonMatch) {
      try {
          extractedData = JSON.parse(jsonMatch[1]);
          isComplete = true;
          responseText = "Extraction complete.";
      } catch (e) {
          console.warn("Found JSON block but failed to parse.", e);
      }
    } else {
        // Try parsing directly just in case the entire response is raw JSON
        try {
            if ((responseText.startsWith("{") && responseText.endsWith("}")) || (responseText.startsWith("[") && responseText.endsWith("]"))) {
               extractedData = JSON.parse(responseText);
               isComplete = true;
               responseText = "Extraction complete.";
            }
        } catch {
            // Ignore parse errors
        }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: responseText,
        isComplete,
        data: extractedData,
        model: selectedModel 
      }),
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('AI Chat Error:', err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message || 'Internal Server Error' }) };
  }
};
