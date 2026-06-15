/**
 * Groq API Service
 * 
 * Handles two responsibilities:
 * 1. parseFoodText()  — NLP extraction of structured food items from free text
 * 2. analyzeNutrition() — Generate AI nutrition analysis from aggregated totals
 * 
 * Uses qwen/qwen3-32b via the Groq API (OpenAI-compatible endpoint).
 * Includes retry logic, response sanitization, and structured validation.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const MAX_RETRIES = 2;
const TIMEOUT_MS = 30000;

/**
 * Make a Groq API call with timeout and retry logic.
 */
async function callGroq(messages, { temperature = 0.3, maxTokens = 2048, jsonMode = false } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in .env.local');
  }

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const body = {
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
      };

      // Groq supports response_format for JSON mode
      if (jsonMode) {
        body.response_format = { type: 'json_object' };
      }

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const errMsg = errBody.error?.message || `HTTP ${response.status}`;
        
        // Rate limit — wait and retry
        if (response.status === 429 && attempt < MAX_RETRIES) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '3', 10);
          console.warn(`[Groq] Rate limited. Retrying after ${retryAfter}s (attempt ${attempt + 1})`);
          await sleep(retryAfter * 1000);
          continue;
        }

        throw new Error(`Groq API error: ${errMsg}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      return content;

    } catch (err) {
      lastError = err;

      if (err.name === 'AbortError') {
        console.warn(`[Groq] Request timed out (attempt ${attempt + 1})`);
      } else if (attempt < MAX_RETRIES) {
        console.warn(`[Groq] Error: ${err.message}. Retrying (attempt ${attempt + 1})...`);
        await sleep(1000 * (attempt + 1)); // exponential-ish backoff
      }
    }
  }

  throw lastError || new Error('Groq API call failed after retries');
}

// ── STEP 1: Parse Food Text ──────────────────────────────────

const PARSE_SYSTEM_PROMPT = `You are an expert nutrition data engine. Given free-form food text, extract each food item into a structured JSON array and estimate its exact nutritional macros based on the provided quantity.

Rules:
1. Return ONLY a valid JSON array — no markdown, no explanation.
2. Each object in the array MUST contain exactly these keys:
   - "food_name" (string)
   - "quantity" (number)
   - "unit" (string)
   - "nutrition": an object with keys: "calories" (number), "protein" (number), "carbs" (number), "fat" (number), "fiber" (number), "iron" (number in mg), "calcium" (number in mg), "vitD" (number in mcg), "vitB12" (number in mcg), "magnesium" (number in mg), "zinc" (number in mg).
3. If no quantity is specified, default to 1.
4. If no unit is specified, default to "piece" or "g".
5. Keep food names simple (e.g., "boiled egg", "chapati", "paneer").
6. ACCURATELY ESTIMATE the macros for the SPECIFIED QUANTITY. For example, if it says "2 eggs", the calories should be for 2 eggs (~140 kcal), not 1.

Example input: "2 eggs, 200 ml buttermilk"
Example output:
[
  {
    "food_name": "egg", "quantity": 2, "unit": "piece",
    "nutrition": { "calories": 143, "protein": 12.6, "carbs": 0.7, "fat": 9.5, "fiber": 0, "iron": 1.8, "calcium": 56, "vitD": 2, "vitB12": 0.9, "magnesium": 12, "zinc": 1.3 }
  },
  {
    "food_name": "buttermilk", "quantity": 200, "unit": "ml",
    "nutrition": { "calories": 80, "protein": 6.6, "carbs": 9.6, "fat": 1.8, "fiber": 0, "iron": 0.1, "calcium": 232, "vitD": 0.2, "vitB12": 0.4, "magnesium": 22, "zinc": 0.8 }
  }
]`;

/**
 * Parse free-form food text into structured JSON.
 * 
 * @param {string} foodText - Natural language food description
 * @returns {Array<{food_name: string, quantity: number, unit: string}>}
 */
export async function parseFoodText(foodText) {
  console.log(`[Groq] Parsing food text: "${foodText}"`);

  const raw = await callGroq([
    { role: 'system', content: PARSE_SYSTEM_PROMPT },
    { role: 'user', content: foodText },
  ], {
    temperature: 0.1,   // low creativity for data extraction
    maxTokens: 1024,
    jsonMode: true,
  });

  // Sanitize: strip markdown code fences if present
  const cleaned = sanitizeJSON(raw);

  let parsed;
  try {
    console.log(`[Groq Raw] ${cleaned}`);
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error(`[Groq] Failed to parse response as JSON:`, cleaned);
    throw new Error(`AI returned invalid JSON. Raw: ${cleaned.substring(0, 200)}`);
  }

  // Handle case where model wraps array in an object like { "foods": [...] }
  // OR returns a single food item object instead of an array.
  if (!Array.isArray(parsed)) {
    if (parsed.food_name) {
      // It's a single item object
      parsed = [parsed];
    } else if (parsed.foods && Array.isArray(parsed.foods)) {
      parsed = parsed.foods;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      parsed = parsed.items;
    } else if (parsed.result && Array.isArray(parsed.result)) {
      parsed = parsed.result;
    } else {
      throw new Error(`AI returned unexpected structure: ${JSON.stringify(parsed).substring(0, 200)}`);
    }
  }

  // Validate each item
  const validated = parsed
    .filter(item => item && typeof item.food_name === 'string')
    .map(item => ({
      food_name: item.food_name.trim().toLowerCase(),
      quantity:  Number(item.quantity) || 1,
      unit:      (item.unit || 'piece').trim().toLowerCase(),
      nutrition: item.nutrition || null,
    }));

  if (validated.length === 0) {
    throw new Error('No valid food items could be extracted from the input.');
  }

  console.log(`[Groq] Extracted ${validated.length} food items`);
  return validated;
}


// ── STEP 6: AI Nutrition Analysis ────────────────────────────

const ANALYSIS_SYSTEM_PROMPT = `You are an expert nutritionist AI. Given the aggregated nutrient totals for a meal or day's food intake, provide a detailed but concise nutrition analysis.

Return ONLY a JSON object with this exact structure — no markdown, no explanation:
{
  "summary": "A 2-3 sentence overview of the meal's nutritional profile.",
  "strengths": ["strength 1", "strength 2", ...],
  "deficiencies": ["deficiency warning 1", "deficiency warning 2", ...],
  "recommendations": ["actionable suggestion 1", "actionable suggestion 2", ...]
}

Guidelines:
- Compare against standard RDA values for an adult.
- Flag any macronutrient imbalances.
- Note any micronutrient deficiencies relative to daily needs.
- Provide specific food suggestions to address deficiencies (prefer Indian foods where relevant).
- Keep each array item under 100 characters.
- Limit to 3-5 items per array.`;

/**
 * Generate an AI nutrition analysis from aggregated totals.
 * 
 * @param {Object} totals - Aggregated nutrient totals
 * @param {Array} foods   - Original parsed food list (for context)
 * @returns {{ summary: string, strengths: string[], deficiencies: string[], recommendations: string[] }}
 */
export async function analyzeNutrition(totals, foods = []) {
  const foodList = foods.map(f => `${f.quantity} ${f.unit} ${f.food_name}`).join(', ');

  const userContent = `
Meal/Intake: ${foodList}

Nutrient Totals:
- Calories: ${totals.calories} kcal
- Protein: ${totals.protein} g
- Carbohydrates: ${totals.carbs} g
- Fat: ${totals.fat} g
- Fiber: ${totals.fiber} g
- Iron: ${totals.iron} mg
- Calcium: ${totals.calcium} mg
- Magnesium: ${totals.magnesium} mg
- Zinc: ${totals.zinc} mg
- Potassium: ${totals.potassium} mg
- Vitamin B12: ${totals.vitamin_b12} µg
- Vitamin D: ${totals.vitamin_d} µg
- Vitamin A: ${totals.vitamin_a || 0} µg
- Vitamin C: ${totals.vitamin_c || 0} mg
- Folate: ${totals.folate || 0} µg

Analyze this nutritional intake and return JSON.`;

  console.log(`[Groq] Generating nutrition analysis...`);

  const raw = await callGroq([
    { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ], {
    temperature: 0.5,
    maxTokens: 1500,
    jsonMode: true,
  });

  const cleaned = sanitizeJSON(raw);

  try {
    const analysis = JSON.parse(cleaned);

    // Validate structure
    return {
      summary:         typeof analysis.summary === 'string' ? analysis.summary : '',
      strengths:       Array.isArray(analysis.strengths) ? analysis.strengths : [],
      deficiencies:    Array.isArray(analysis.deficiencies) ? analysis.deficiencies : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
    };
  } catch (e) {
    console.error(`[Groq] Failed to parse analysis JSON:`, cleaned);
    // Graceful degradation — return the raw text as summary
    return {
      summary: cleaned.substring(0, 500),
      strengths: [],
      deficiencies: [],
      recommendations: [],
    };
  }
}


// ── Helpers ──────────────────────────────────────────────────

function sanitizeJSON(raw) {
  let s = raw.trim();

  // Remove markdown code fences: ```json ... ``` or ``` ... ```
  s = s.replace(/^```(?:json)?\s*\n?/i, '');
  s = s.replace(/\n?```\s*$/i, '');

  // Remove any leading/trailing non-JSON characters
  // Find the first [ or { and last ] or }
  const firstBracket = Math.min(
    s.indexOf('[') === -1 ? Infinity : s.indexOf('['),
    s.indexOf('{') === -1 ? Infinity : s.indexOf('{'),
  );
  const lastBracket = Math.max(
    s.lastIndexOf(']'),
    s.lastIndexOf('}'),
  );

  if (firstBracket !== Infinity && lastBracket !== -1) {
    s = s.substring(firstBracket, lastBracket + 1);
  }

  return s;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
