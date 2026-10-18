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

/**
 * GET /api/nutrition/barcode/:barcode
 * 
 * Fetches product metadata from Open Food Facts by barcode (UPC / EAN).
 * Normalizes serving size, calories, protein, carbs, fat, micronutrients, brand, and product image.
 */
export async function getFoodByBarcode(req, res) {
  const { barcode } = req.params;
  if (!barcode || !/^\d{4,18}$/.test(barcode.trim())) {
    return res.status(400).json({ error: { message: 'Invalid barcode format.' } });
  }

  const cleanBarcode = barcode.trim();
  const url = `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HealthifyApp - Web - Version 1.0 - https://github.com/Death-Note-sys/healthify'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        found: false,
        barcode: cleanBarcode,
        error: `Open Food Facts returned status ${response.status}`
      });
    }

    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      return res.json({
        found: false,
        barcode: cleanBarcode,
        message: data.status_verbose || 'Product not found in Open Food Facts database.'
      });
    }

    const p = data.product;
    const n = p.nutriments || {};

    let cal100 = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);
    cal100 = Math.round(Number(cal100) || 0);

    const prot100 = Math.round((Number(n.proteins_100g ?? n.proteins ?? 0)) * 10) / 10;
    const carb100 = Math.round((Number(n.carbohydrates_100g ?? n.carbohydrates ?? 0)) * 10) / 10;
    const fat100  = Math.round((Number(n.fat_100g ?? n.fat ?? 0)) * 10) / 10;
    const fib100  = Math.round((Number(n.fiber_100g ?? n.fiber ?? 0)) * 10) / 10;

    let servingGrams = 100;
    let servingLabel = p.serving_size || '100g';
    if (p.serving_quantity) {
      servingGrams = Number(p.serving_quantity) || 100;
    } else if (p.serving_size) {
      const match = p.serving_size.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i);
      if (match) servingGrams = parseFloat(match[1]);
    }

    let calServing = n['energy-kcal_serving'] ?? (n['energy_serving'] ? n['energy_serving'] / 4.184 : null);
    if (calServing == null && servingGrams && cal100) {
      calServing = Math.round((cal100 * servingGrams) / 100);
    } else {
      calServing = calServing != null ? Math.round(Number(calServing)) : cal100;
    }

    const protServing = n.proteins_serving != null
      ? Math.round(Number(n.proteins_serving) * 10) / 10
      : Math.round(((prot100 * servingGrams) / 100) * 10) / 10;

    const carbServing = n.carbohydrates_serving != null
      ? Math.round(Number(n.carbohydrates_serving) * 10) / 10
      : Math.round(((carb100 * servingGrams) / 100) * 10) / 10;

    const fatServing = n.fat_serving != null
      ? Math.round(Number(n.fat_serving) * 10) / 10
      : Math.round(((fat100 * servingGrams) / 100) * 10) / 10;

    const brand = p.brands ? p.brands.split(',')[0].trim() : '';
    const rawName = p.product_name || p.product_name_en || p.generic_name || 'Packaged Item';
    const fullName = brand ? `${rawName} (${brand})` : rawName;

    const normalized = {
      found: true,
      barcode: cleanBarcode,
      name: fullName,
      rawName,
      brand,
      image: p.image_front_small_url || p.image_url || null,
      servingLabel,
      servingGrams,
      per100g: {
        cal: cal100,
        protein: prot100,
        carbs: carb100,
        fat: fat100,
        fiber: fib100
      },
      perServing: {
        cal: calServing,
        protein: protServing,
        carbs: carbServing,
        fat: fatServing
      },
      micronutrients: {
        iron: Math.round(Number(n.iron_100g || 0) * 1000 * 10) / 10,
        calcium: Math.round(Number(n.calcium_100g || 0) * 1000 * 10) / 10,
        sodium: Math.round(Number(n.sodium_100g || 0) * 1000 * 10) / 10,
        vitD: Number(n['vitamin-d_100g'] || 0),
        vitB12: Number(n['vitamin-b12_100g'] || 0)
      },
      nutriscore: p.nutriscore_grade || null
    };

    res.json(normalized);
  } catch (error) {
    console.error(`[Barcode API] Error fetching barcode ${cleanBarcode}:`, error);
    res.status(500).json({
      found: false,
      barcode: cleanBarcode,
      error: error.message || 'Internal server error while fetching barcode data.'
    });
  }
}
