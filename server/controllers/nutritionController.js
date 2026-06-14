/**
 * Nutrition Analysis Controller
 * 
 * Orchestrates the 6-step pipeline:
 * 
 * 1. Parse free-text → structured food list         (Groq)
 * 2. Search USDA for each food → fdcIds             (USDA)
 * 3. Fetch nutrient profiles per food               (USDA)
 * 4. Convert quantities → grams & scale nutrients   (Local)
 * 5. Aggregate totals                               (Local)
 * 6. Generate AI analysis                           (Groq)
 */

import { parseFoodText, analyzeNutrition } from '../services/groqService.js';
import { aggregateNutrients } from '../utils/nutritionCalculator.js';

/**
 * POST /api/nutrition/analyze
 * 
 * Request body: { foodText: string }
 * Response: { foods: [...], totals: {...}, analysis: {...} }
 */
export async function analyzeFood(req, res) {
  const startTime = Date.now();
  const { foodText } = req.body;

  // ── Validation ─────────────────────────────────────────────
  if (!foodText || typeof foodText !== 'string' || foodText.trim().length === 0) {
    return res.status(400).json({
      error: { message: 'foodText is required and must be a non-empty string.' },
    });
  }

  if (foodText.length > 1000) {
    return res.status(400).json({
      error: { message: 'foodText must be under 1000 characters.' },
    });
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`[Pipeline] Starting nutrition analysis`);
  console.log(`[Pipeline] Input: "${foodText}"`);
  console.log(`${'═'.repeat(60)}`);

  // ── STEP 1: Parse food text & estimate macros with Groq ────
  console.log(`\n[Step 1/3] Parsing food text with AI...`);
  const parsedFoods = await parseFoodText(foodText);
  console.log(`[Step 1/3] ✓ Extracted & estimated ${parsedFoods.length} items:`,
    parsedFoods.map(f => `${f.quantity} ${f.unit} ${f.food_name}`).join(', '));

  // ── STEP 2: Aggregate totals ───────────────────────────────
  console.log(`\n[Step 2/3] Aggregating nutrient totals...`);
  const totals = aggregateNutrients(parsedFoods.map(f => ({ scaledNutrients: f.nutrition })));
  console.log(`[Step 2/3] ✓ Totals: ${totals.calories} kcal, ${totals.protein}g protein, ${totals.carbs}g carbs, ${totals.fat}g fat`);

  // ── STEP 3: AI analysis ────────────────────────────────────
  console.log(`\n[Step 3/3] Generating AI nutrition analysis...`);
  const analysis = await analyzeNutrition(totals, parsedFoods);
  console.log(`[Step 3/3] ✓ Analysis complete`);

  // ── Build response ─────────────────────────────────────────
  const duration = Date.now() - startTime;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`[Pipeline] ✓ Complete in ${duration}ms`);
  console.log(`${'═'.repeat(60)}\n`);

  res.json({
    foods:    parsedFoods,
    totals,
    analysis,
    meta: {
      processingTimeMs: duration,
      foodsFound:       parsedFoods.filter(f => f.nutrition).length,
      foodsTotal:       parsedFoods.length,
    },
  });
}
