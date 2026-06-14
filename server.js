import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import nutritionRoutes from './server/routes/nutritionRoutes.js';
import { errorHandler } from './server/middleware/errorHandler.js';

// Load .env.local (same file Vite reads)
config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50kb' }));

// ── Rate limiter: 20 requests per minute per IP ──
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a moment and try again.' },
});

// ── POST /api/chat — Groq (Llama 3.3 70B) proxy ──
app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your-groq-api-key-here') {
      return res.status(500).json({
        error: {
          message: 'Server not configured: add your GROQ_API_KEY to .env.local',
        },
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

    // Forward to Groq API (key stays server-side)
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

    // Convert Groq response back to Gemini-like format (so frontend stays unchanged)
    if (data.error) {
      res.json({ error: { message: data.error.message || JSON.stringify(data.error) } });
    } else {
      const reply = data.choices?.[0]?.message?.content || '';
      res.json({
        candidates: [{ content: { parts: [{ text: reply }] } }],
      });
    }
  } catch (err) {
    console.error('[/api/chat] Error:', err.message);
    res.status(500).json({
      error: { message: 'Failed to reach AI service. Please try again.' },
    });
  }
});

// ── Nutrition Analysis API ──
app.use('/api/nutrition', nutritionRoutes);

// ── Centralized error handler (must be after all routes) ──
app.use(errorHandler);

// ── Production: serve Vite build ──
if (process.env.NODE_ENV === 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  app.use(express.static(join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✅ Healthify API server running → http://localhost:${PORT}`);
});
