import { type Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { callAI, AIMessage, AIModel } from './lib/ai';

export const handler: Handler = async (event: any) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { verifyAdmin: verifyAdminHelper } = await import('./lib/auth-verify');
    const { isAdmin, user: authUser } = await verifyAdminHelper(authHeader?.toString(), supabase);

    if (!authUser || !isAdmin) {
       return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Admin access required' }) };
    }

    const { prompt, systemInstruction, model } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' }),
      };
    }

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    const aiResponse = await callAI(
      model as AIModel, 
      messages, 
      systemInstruction || 'You are a helpful assistant.', 
      0.7
    );

    if (!aiResponse.success) {
      return { 
        statusCode: aiResponse.status || 500, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ error: aiResponse.error || 'AI request failed' }) 
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, text: aiResponse.message, model: aiResponse.model }),
    };
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};
