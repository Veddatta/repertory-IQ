// File: netlify/functions/generate-rubric.js

exports.handler = async function(event, context) {
  // CORS headers for all responses
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { symptom, repertory } = requestData;
    const apiKey = process.env.GEMINI_API_KEY;

    // Validate inputs
    if (!symptom || typeof symptom !== 'string' || symptom.trim() === '') {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'Symptom is required and must be a non-empty string.' })
      };
    }
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return { 
        statusCode: 500, 
        headers,
        body: JSON.stringify({ error: 'API key is not configured.' })
      };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    // Define chapter lists for each repertory
    const KENT_CHAPTERS = [
      'ABDOMEN', 'BACK', 'BLADDER', 'CHEST', 'CHILL', 'COUGH', 'EAR', 
      'EXPECTORATION', 'EXTERNAL THROAT', 'EXTREMITIES', 'EYE', 'FACE', 
      'FEVER', 'GENERALITIES', 'GENITALIA FEMALE', 'GENITALIA MALE', 
      'HEAD', 'HEARING', 'KIDNEYS', 'LARYNX AND TRACHEA', 'MIND', 'MOUTH', 
      'NOSE', 'PERSPIRATION', 'PROSTATE GLAND', 'RECTUM', 'RESPIRATION', 'SKIN', 
      'SLEEP', 'SMELL', 'STOMACH', 'STOOL', 'TEETH', 'THROAT', 'URETHRA', 
      'URINARY ORGANS', 'URINE', 'VERTIGO', 'VISION', 'VOICE'
    ];

    const BOERICKE_CHAPTERS = [
      'MIND', 'HEAD', 'EYES', 'EARS', 'NOSE', 'FACE', 'MOUTH', 'TONGUE', 'TASTE', 
      'GUMS', 'TEETH', 'THROAT', 'STOMACH', 'ABDOMEN', 'URINARY SYSTEM', 
      'MALE SEXUAL SYSTEM', 'FEMALE SEXUAL SYSTEM', 'CIRCULATORY SYSTEM', 
      'LOCOMOTOR SYSTEM', 'RESPIRATORY SYSTEM', 'SKIN', 'FEVER', 'NERVOUS SYSTEM', 
      'GENERALITIES', 'MODALITIES'
    ];

    const BTPB_CHAPTERS = [
      'MIND AND INTELLECT',
      'PARTS OF THE BODY AND ORGANS',
      'SENSATIONS AND COMPLAINTS',
      'SLEEP AND DREAMS',
      'FEVER',
      'AGGRAVATIONS AND AMELIORATIONS',
      'RELATIONSHIP OF REMEDIES'
    ];

    const CLARKE_CHAPTERS = [
      'MIND', 'HEAD', 'EYES', 'EARS', 'NOSE', 'FACE', 'MOUTH', 'THROAT', 'STOMACH',
      'ABDOMEN', 'STOOL', 'URINARY ORGANS', 'MALE SEXUAL ORGANS', 'FEMALE SEXUAL ORGANS',
      'RESPIRATORY ORGANS', 'CHEST', 'HEART', 'NECK AND BACK', 'EXTREMITIES', 'SLEEP',
      'FEVER', 'SKIN', 'GENERALITIES'
    ];

    let selectedChapters;
    let repertoryName;

    // Select the appropriate chapter list based on user's choice
    switch(repertory?.toLowerCase()) {
      case 'boericke':
        selectedChapters = BOERICKE_CHAPTERS.join(', ');
        repertoryName = "Boericke's Repertory";
        break;
      case 'btpb':
        selectedChapters = BTPB_CHAPTERS.join(', ');
        repertoryName = "Boenninghausen's Therapeutic Pocket Book (BTPB)";
        break;
      case 'clarke':
        selectedChapters = CLARKE_CHAPTERS.join(', ');
        repertoryName = "Clarke's Repertory";
        break;
      default: // Default to Kent
        selectedChapters = KENT_CHAPTERS.join(', ');
        repertoryName = "Kent's Repertory";
    }

    // Enhanced prompt for better rubric generation
    const prompt = `You are an expert homeopathic repertory consultant with deep knowledge of ${repertoryName}. 

Your task: Generate ONE accurate, well-structured rubric in standard repertory format for the given symptom.

STRICT RULES:
1. Start with ONLY one of these official chapter names: ${selectedChapters}
2. Use exact format: CHAPTER - SUB-RUBRIC - sub-rubric (if needed)
3. Be clinically accurate and specific
4. Use proper repertory terminology
5. Return ONLY the rubric - no explanations or extra text

Symptom: "${symptom.trim()}"

Generated Rubric:`;

    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 150,
        topK: 10,
        topP: 0.8
      }
    };
    
    console.log('Calling Gemini API...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", response.status, errorText);
      return { 
        statusCode: response.status, 
        headers,
        body: JSON.stringify({ 
          error: `AI service error: ${response.statusText}`,
          details: errorText
        })
      };
    }

    const result = await response.json();
    
    // Validate response structure
    if (!result.candidates || 
        !result.candidates[0] || 
        !result.candidates[0].content ||
        !result.candidates[0].content.parts ||
        !result.candidates[0].content.parts[0] ||
        !result.candidates[0].content.parts[0].text) {
      console.error('Invalid Gemini response structure:', JSON.stringify(result, null, 2));
      return { 
        statusCode: 500, 
        headers,
        body: JSON.stringify({ 
          error: 'Invalid response from AI service',
          details: 'The AI service returned an unexpected response format'
        })
      };
    }

    console.log('Gemini API call successful');
    
    return { 
      statusCode: 200, 
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error("Function Error:", error);
    return { 
      statusCode: 500, 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};