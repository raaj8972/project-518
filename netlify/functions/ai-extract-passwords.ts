const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro-latest'];

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.GOOGLE_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  try {
    const { images, model } = JSON.parse(event.body);

    if (!images || !Array.isArray(images) || images.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No images provided' }) };
    }

    const selectedModel = ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL;

    // Construct image parts
    const imageParts = images.map((base64Image: string) => ({
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    }));

    const response = await fetch(`${GEMINI_BASE}/${selectedModel}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: `You are an AI that extracts event coordinator assignments and passwords from uploaded documents (spreadsheets, lists, handwritten notes, etc).
Your ONLY goal is to extract the Event Name, Coordinator Name (if available), and the assigned Password.
Return a STRICT JSON array of objects.

Follow this EXACT schema for each object:
{
  "event_name": "String (the title of the event)",
  "coordinator_name": "String (the name of the coordinator, or empty string if not found)",
  "password": "String (the assigned login password for this coordinator/event)"
}

Rules:
1. ONLY return the JSON array. Do not include markdown code blocks like \`\`\`json.
2. If you see variations of an event name (e.g., 'Hackathon 2026', 'Codefest'), extract the exact name you see.
3. If passwords are not explicitly labeled, look for alphanumeric strings next to event or person names.
4. Correct obvious typos in common names if possible, but keep event names strictly as written.
5. If the document is unreadable or contains no valid data, return an empty array [].`
          }]
        },
        contents: [{
          role: 'user',
          parts: [
            ...imageParts,
            { text: "Extract the coordinator passwords from these documents and return them as a JSON array." }
          ]
        }],
        generationConfig: {
          temperature: 0.1, // Low temp for extraction tasks to reduce hallucinations
          responseMimeType: "application/json",
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      if (response.status === 429 || response.status === 503) {
        return { statusCode: response.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Model "${selectedModel}" is busy. Try a different model from the list.` }) };
      }
      return { statusCode: response.status, body: JSON.stringify({ error: 'Failed to communicate with AI service' }) };
    }

    const aiData = await response.json();
    let textResponse = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Invalid response from AI' }) };
    }

    // Clean up response if it wrapped it in markdown
    textResponse = textResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsedData = JSON.parse(textResponse);
      const validatedData = Array.isArray(parsedData) ? parsedData : [];
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: validatedData })
      };
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', textResponse);
      return { statusCode: 500, body: JSON.stringify({ error: 'AI returned invalid JSON format' }) };
    }

  } catch (error) {
    console.error('Error processing request:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
