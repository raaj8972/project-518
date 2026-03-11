// removed handler import to fix local dev syntax error

// Using the Lite model for better stability and quota resilience
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';

export const handler = async (event: any) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { prompt, systemInstruction } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' }),
      };
    }

    const API_KEY = process.env.GOOGLE_API_KEY;
    console.log('Loading API Key, length:', API_KEY?.length, 'start:', API_KEY?.substring(0, 5));

    if (!API_KEY) {
      console.error('GOOGLE_API_KEY is not defined in environment variables.');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'AI configuration error (missing API key)' }),
      };
    }

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction || 'You are a helpful assistant.'}\n\nUSER PROMPT:\n${prompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json', // Force JSON structure!
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error:', errorData);
        
        // Handle rate limiting/quota issues gracefully
        if (response.status === 429 || response.status === 503) {
           return {
             statusCode: response.status,
             body: JSON.stringify({ error: 'AI service is currently busy. Please try again in a few moments.' }),
           };
        }
        
        throw new Error(errorData.error?.message || 'Failed to communicate with Gemini API');
    }

    const data = await response.json();
    
    // Extract the text from the Gemini response structure
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
        throw new Error('Gemini API returned an empty response');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        success: true, 
        text: generatedText 
      }),
    };
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};
