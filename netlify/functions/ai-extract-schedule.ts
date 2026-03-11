const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash-lite';
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro-latest'];

export const handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { images, model } = JSON.parse(event.body || '{}');
    const selectedModel = ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'At least one image is required.' }),
      };
    }

    const API_KEY = process.env.GOOGLE_API_KEY;

    if (!API_KEY) {
      console.error('GOOGLE_API_KEY is not defined in environment variables.');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AI configuration error (missing API key)' }),
      };
    }

    // Explicit instructions for Gemini to output JSON for multiple schedule days
    const systemInstruction = `
You are an expert event data extractor.
The user is providing one or more images of a festival/event schedule (like a poster, brochure, or handwritten note).
Your job is to read all the provided images together, understand the flow of the entire event, and extract every single scheduled item into a structured JSON format.

CRITICAL INSTRUCTIONS:
1. Return ONLY raw JSON. Do not include markdown \`\`\`json block markers. Just the JSON array.
2. Group the events logically by "Day". Look for dates or "Day 1", "Day 2" headers.
3. If no specific Day/Date is found, group everything under "Day 1".
4. Try to determine a general duration from the start/end time if possible (e.g. "2 hours"). 
5. Categorize the type if possible (e.g., "Registration", "Cultural", "Technical", "Sports", "Break", "General").

The required JSON structure is an Array of Day Objects:
[
  {
    "date": "String (YYYY-MM-DD if found, else just put 'Day 1' or 'TBA')",
    "day": "String (e.g. 'Day 1', 'Day 2' or 'Monday')",
    "title": "String (A general title for the day, if mentioned, else '')",
    "events": [
      {
        "title": "String (Name of the event/activity)",
        "time": "String (e.g., '9:00 AM - 1:00 PM', or '14:00')",
        "venue": "String (Where it takes place, if mentioned, else '')",
        "type": "String (e.g., 'Cultural', 'Technical', 'Break', 'Sports', 'General')",
        "duration": "String (e.g., '2 hours', '30 min', if calculable/mentioned, else '')"
      }
    ]
  }
]
`;

    // Construct the parts array with all images and the prompt
    const parts: any[] = [
      { text: systemInstruction }
    ];

    // Add each image to the parts array
    images.forEach((base64Data, index) => {
        // Strip the data:image/jpeg;base64, prefix if it exists
        const base64Clean = base64Data.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
        
        parts.push({
            inline_data: {
              mime_type: "image/jpeg", // Assume JPEG/PNG/WEBP, Gemini handles it as long as it's an image
              data: base64Clean
            }
        });
        parts.push({ text: `Image ${index + 1} provided above.` });
    });

    parts.push({ text: "Please extract the full schedule from the images above into the required JSON format." });

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: parts,
        },
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for factual extraction
        responseMimeType: 'application/json', // Force JSON structure
      },
    };

    const apiUrl = `${GEMINI_BASE}/${selectedModel}:generateContent?key=${API_KEY}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error:', errorData);
        
        if (response.status === 429 || response.status === 503) {
           return {
             statusCode: response.status,
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ error: 'AI service is busy. Please try processing fewer images (e.g. 1 at a time) or try again later.' }),
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
        schedule: JSON.parse(generatedText) // Parse it to ensure it's valid JSON before sending to frontend
      }),
    };
  } catch (error) {
    console.error('AI Schedule Extraction Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: (error as Error).message || 'Internal Server Error' }),
    };
  }
};
