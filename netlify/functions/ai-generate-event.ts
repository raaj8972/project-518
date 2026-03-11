// removed handler import to fix local dev syntax error

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export const handler = async (event: any) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' }),
      };
    }

    const API_KEY = process.env.GOOGLE_API_KEY;

    if (!API_KEY) {
      console.error('GOOGLE_API_KEY is not defined in environment variables.');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'AI configuration error (missing API key)' }),
      };
    }

    // Explicit instructions for Gemini to output JSON for our Event Form
    const systemInstruction = `
You are an expert event coordinator creating an event for a college/school festival. 
The user will provide a rough, messy idea or description of an event.
Your job is to parse it, improve it, and return pure JSON that matches the required EventFormState structure.
Generate professional, exciting descriptions and clear, structured rules.

CRITICAL: Return ONLY raw JSON. Do not include markdown \`\`\`json block markers. Just the JSON object.

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

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\nUSER PROMPT:\n${prompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.7, // A bit of creativity for the descriptions
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
