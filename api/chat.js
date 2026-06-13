export default async function handler(req, res) {
  // Add CORS headers if needed for local testing vs prod
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your-groq-api-key-here') {
      return res.status(500).json({
        error: { message: 'Server not configured: missing GROQ_API_KEY environment variable.' },
      });
    }

    const { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: { message: 'Invalid request — messages array is required.' },
      });
    }

    // Convert Gemini-format messages to OpenAI format (used by Groq)
    const openAiMessages = [];
    if (systemPrompt) {
      openAiMessages.push({ role: 'system', content: systemPrompt });
    }
    for (const msg of messages) {
      openAiMessages.push({
        role:    msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.parts?.[0]?.text || '',
      });
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages:    openAiMessages,
        max_tokens:  2048,
        temperature: 0.7,
      }),
    });

    const data = await groqRes.json();

    if (data.error) {
      return res.json({ error: { message: data.error.message || JSON.stringify(data.error) } });
    }

    const reply = data.choices?.[0]?.message?.content || '';
    return res.json({
      candidates: [{ content: { parts: [{ text: reply }] } }],
    });
  } catch (err) {
    console.error('[/api/chat] Error:', err.message);
    return res.status(500).json({
      error: { message: 'Failed to reach AI service. Please try again.' },
    });
  }
}
