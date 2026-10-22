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

function isValidImageBuffer(buf) {
  if (!buf || buf.length < 32) return false;
  // JPEG
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
  // WebP
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true;
  return false;
}

export function extractNumber(val) {
  if (val == null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const match = String(val).replace(/,/g, '.').match(/[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function extractCalories(val) {
  if (val == null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).replace(/,/g, '.');
  const kcalMatch = str.match(/(\d+(?:\.\d+)?)\s*k?cal/i);
  if (kcalMatch) return parseFloat(kcalMatch[1]);
  const kjMatch = str.match(/(\d+(?:\.\d+)?)\s*kj/i);
  if (kjMatch) return Math.round(parseFloat(kjMatch[1]) / 4.184);
  const match = str.match(/[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function findNutrient(obj, ...possibleKeys) {
  if (!obj || typeof obj !== 'object') return 0;
  for (const k of possibleKeys) {
    if (obj[k] != null) {
      const num = extractNumber(obj[k]);
      if (num !== 0 || obj[k] === 0 || obj[k] === '0') return num;
    }
  }
  const lowerObj = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof k === 'string') {
      lowerObj[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = v;
    }
  }
  for (const k of possibleKeys) {
    const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lowerObj[cleanK] != null) return extractNumber(lowerObj[cleanK]);
  }
  return 0;
}

// ── Persistent OCR Worker Singleton (initializes once, reuses in ~400ms) ──
let ocrWorkerPromise = null;
async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      return worker;
    })().catch(err => {
      ocrWorkerPromise = null;
      throw err;
    });
  }
  return ocrWorkerPromise;
}

/**
 * POST /api/nutrition/scan-label
 * 
 * Takes base64 image of a nutrition facts table (FSSAI/FDA/EU),
 * runs Gemini Vision (if configured) or fast persistent OCR + Groq parsing.
 */
export async function scanNutritionLabel(req, res) {
  const { image, productHint } = req.body;

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: { message: 'Image (base64 string) is required.' } });
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  try {
    const mimeMatch = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // ── 1. If Gemini API key is available, try Gemini Multimodal Vision (~1.5s) ──
    if (geminiApiKey) {
      try {
        console.log('[Label Scanner] Querying Gemini Vision model...');
        const geminiPrompt = `You are an expert AI clinical nutrition and food packaging recognition system.
Analyze this photo of a food product or package (front, back, side, or nutrition facts / FSSAI table).
User product hint: "${productHint || 'None'}".

Instructions:
1. If a nutrition facts / FSSAI table is visible, extract the exact values printed.
2. If the nutrition table is angled, partially cut off, or if this photo shows the front/branding of an identifiable food item, identify the product name and brand, and provide its standard authentic nutritional values (per 100g and per serving) so the user can log it seamlessly.
3. Only set "foodIdentified": false if the photo is completely blank, black, or unrelated to food.

Return a STRICT JSON object in this exact format:
{
  "foodIdentified": true,
  "productName": "Product Name",
  "brand": "Brand name",
  "servingLabel": "e.g. 1 pack (40g) or 30g",
  "servingGrams": 40,
  "per100g": { "cal": 450, "protein": 8.5, "carbs": 62.0, "fat": 18.0, "fiber": 3.2, "sugar": 12.0 },
  "perServing": { "cal": 180, "protein": 3.4, "carbs": 24.8, "fat": 7.2 },
  "micronutrients": { "sodium": 320, "iron": 0, "calcium": 0, "vitD": 0, "vitB12": 0 }
}
Return ONLY valid JSON.`;

        const requestPayload = {
          contents: [{
            parts: [
              { text: geminiPrompt },
              { inline_data: { mime_type: mimeType, data: base64Data } }
            ]
          }],
          generationConfig: {
            response_mime_type: 'application/json',
            thinking_config: { thinking_budget: 0 }
          }
        };

        const GEMINI_MODELS = [
          'gemini-3.8-flash',      // current production recommended (Oct 2025)
          'gemini-2.5-flash',      // stable fallback
        ];

        let gRes = null;
        let successfulModel = '';

        for (const modelName of GEMINI_MODELS) {
          try {
            console.log(`[Label Scanner] Trying Gemini model: ${modelName}...`);
            const resAttempt = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(12000),
              body: JSON.stringify(requestPayload)
            });

            if (resAttempt.ok) {
              gRes = resAttempt;
              successfulModel = modelName;
              break;
            } else if (resAttempt.status === 429) {
              console.warn(`[Label Scanner] ${modelName} hit rate limit / quota, trying next model in pool...`);
            } else {
              const errJson = await resAttempt.json().catch(() => ({}));
              console.warn(`[Label Scanner] ${modelName} returned status ${resAttempt.status}:`, errJson.error?.message || '');
            }
          } catch (modelErr) {
            console.warn(`[Label Scanner] ${modelName} attempt error:`, modelErr.message);
          }
        }

        if (gRes && gRes.ok) {
          const gData = await gRes.json();
          let rawContent = gData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);

          const p100Raw = parsed.per100g || {};
          const pServRaw = parsed.perServing || {};
          const microsRaw = parsed.micronutrients || {};

          let cal100 = extractCalories(findNutrient(p100Raw, 'cal', 'calories', 'energy', 'kcal', 'energykcal')) ||
                       extractCalories(findNutrient(parsed, 'cal', 'calories', 'energy', 'kcal', 'energykcal'));
          let protein100 = findNutrient(p100Raw, 'protein', 'prot', 'proteins') ||
                           findNutrient(parsed, 'protein', 'prot', 'proteins');
          let carbs100 = findNutrient(p100Raw, 'carbs', 'carbohydrate', 'carbohydrates', 'totalcarbohydrate', 'totalcarbs') ||
                         findNutrient(parsed, 'carbs', 'carbohydrate', 'carbohydrates', 'totalcarbohydrate', 'totalcarbs');
          let fat100 = findNutrient(p100Raw, 'fat', 'totalfat', 'fats', 'totalfats') ||
                       findNutrient(parsed, 'fat', 'totalfat', 'fats', 'totalfats');
          let fiber100 = findNutrient(p100Raw, 'fiber', 'dietaryfiber', 'fibre') ||
                         findNutrient(parsed, 'fiber', 'dietaryfiber', 'fibre');
          let sugar100 = findNutrient(p100Raw, 'sugar', 'sugars', 'totalsugars', 'addedsugars') ||
                         findNutrient(parsed, 'sugar', 'sugars', 'totalsugars', 'addedsugars');

          let calServ = extractCalories(findNutrient(pServRaw, 'cal', 'calories', 'energy', 'kcal', 'energykcal'));
          let proteinServ = findNutrient(pServRaw, 'protein', 'prot', 'proteins');
          let carbsServ = findNutrient(pServRaw, 'carbs', 'carbohydrate', 'carbohydrates', 'totalcarbohydrate', 'totalcarbs');
          let fatServ = findNutrient(pServRaw, 'fat', 'totalfat', 'fats', 'totalfats');

          const servingGrams = extractNumber(parsed.servingGrams) || extractNumber(parsed.servingLabel) || 100;
          const servingRatio = servingGrams > 0 ? (servingGrams / 100) : 1;

          // Cross-calculate missing calories or macros
          if (!cal100 && (protein100 || carbs100 || fat100)) {
            cal100 = Math.round((protein100 * 4) + (carbs100 * 4) + (fat100 * 9));
          }
          if (!calServ && cal100) {
            calServ = Math.round(cal100 * servingRatio);
            if (!proteinServ) proteinServ = Math.round(protein100 * servingRatio * 10) / 10;
            if (!carbsServ) carbsServ = Math.round(carbs100 * servingRatio * 10) / 10;
            if (!fatServ) fatServ = Math.round(fat100 * servingRatio * 10) / 10;
          }
          if (!cal100 && calServ && servingRatio > 0) {
            cal100 = Math.round(calServ / servingRatio);
            if (!protein100) protein100 = Math.round((proteinServ / servingRatio) * 10) / 10;
            if (!carbs100) carbs100 = Math.round((carbsServ / servingRatio) * 10) / 10;
            if (!fat100) fat100 = Math.round((fatServ / servingRatio) * 10) / 10;
          }

          const hasCalories = cal100 > 0 || calServ > 0;
          const hasMacros = protein100 > 0 || carbs100 > 0 || fat100 > 0 || proteinServ > 0;
          const name = parsed.productName || productHint || 'Scanned Nutrition Item';
          const brand = parsed.brand || '';
          const fullName = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name;

          if (parsed.foodIdentified === false || (!hasCalories && !hasMacros && (!name || name === 'Scanned Nutrition Item'))) {
            return res.json({
              found: false,
              error: 'Could not detect clear food packaging or nutrition values in this photo. Please hold steady with good lighting and tap Snap again.'
            });
          }

          const micros = parsed.micronutrients || {};

          console.log(`[Label Scanner] ✓ Gemini Vision (${successfulModel}) extracted: ${fullName} (${calServ || cal100} kcal)`);
          return res.json({
            found: true,
            name: fullName,
            rawName: name,
            brand,
            isLabelScan: true,
            servingLabel: parsed.servingLabel || (servingGrams ? `${servingGrams}g` : '100g'),
            servingGrams,
            per100g: {
              cal: Math.round(cal100),
              protein: Math.round(protein100 * 10) / 10,
              carbs: Math.round(carbs100 * 10) / 10,
              fat: Math.round(fat100 * 10) / 10,
              fiber: Math.round(fiber100 * 10) / 10,
            },
            perServing: {
              cal: Math.round(calServ || cal100),
              protein: Math.round((proteinServ || protein100) * 10) / 10,
              carbs: Math.round((carbsServ || carbs100) * 10) / 10,
              fat: Math.round((fatServ || fat100) * 10) / 10,
            },
            micronutrients: {
              sodium: Math.round(findNutrient(microsRaw, 'sodium', 'salt') || findNutrient(p100Raw, 'sodium', 'salt')),
              iron: Math.round((findNutrient(microsRaw, 'iron', 'fe') || findNutrient(p100Raw, 'iron')) * 10) / 10,
              calcium: Math.round((findNutrient(microsRaw, 'calcium', 'ca') || findNutrient(p100Raw, 'calcium')) * 10) / 10,
              vitD: findNutrient(microsRaw, 'vitd', 'vit_d', 'vitamind') || 0,
              vitB12: findNutrient(microsRaw, 'vitb12', 'vit_b12', 'vitaminb12') || 0
            }
          });
        }
      } catch (geminiErr) {
        console.warn('[Label Scanner] Gemini Vision failed or timed out, falling back to OCR + Groq:', geminiErr.message);
      }
    }

    // ── 2. Fast Persistent Tesseract OCR + Groq LLM Parsing Fallback ──
    if (!groqApiKey) {
      return res.status(500).json({
        found: false,
        error: 'Vision processing failed and GROQ_API_KEY is not configured for OCR fallback.'
      });
    }

    console.log('[Label Scanner] Processing snapshot with persistent Tesseract worker fallback...');
    const startTime = Date.now();
    const buffer = Buffer.from(base64Data, 'base64');

    if (!isValidImageBuffer(buffer)) {
      return res.status(400).json({
        found: false,
        error: 'Invalid or incomplete image captured. Please hold your phone steady and tap Snap again.'
      });
    }

    let ocrText = '';
    try {
      const worker = await getOcrWorker();
      const ret = await worker.recognize(buffer);
      ocrText = ret.data?.text?.trim() || '';
    } catch (ocrErr) {
      console.warn('[Label Scanner] OCR processing error:', ocrErr.message);
      ocrWorkerPromise = null;
    }
    const ocrDuration = Date.now() - startTime;
    console.log(`[Label Scanner] OCR extracted ${ocrText.length} characters in ${ocrDuration}ms.`);

    if (ocrText.length < 15) {
      return res.status(422).json({
        found: false,
        error: 'Could not read clear text from the image. Tip: Hold your phone steady with good lighting, or use "Gallery" to upload a clear photo from your camera.'
      });
    }

    // Call Groq to extract structured nutrition facts
    const prompt = `You are a certified clinical nutrition analyst and label extraction engine.
Analyze this raw OCR text extracted from a food product's nutrition table (FSSAI / FDA / EU format).
Extract the product title, brand, serving size, and all nutritional values per 100g and/or per serving.

PRODUCT HINT (if provided by user): "${productHint || 'None'}"

RAW OCR TEXT:
"""
${ocrText}
"""

Return a STRICT JSON object in this EXACT format:
{
  "productName": "Product Name or inferred name",
  "brand": "Brand name or empty string",
  "servingLabel": "e.g. 1 pack (40g) or 30g",
  "servingGrams": 40,
  "per100g": {
    "cal": 450,
    "protein": 8.5,
    "carbs": 62.0,
    "fat": 18.0,
    "fiber": 3.2,
    "sugar": 12.0
  },
  "perServing": {
    "cal": 180,
    "protein": 3.4,
    "carbs": 24.8,
    "fat": 7.2
  },
  "micronutrients": {
    "sodium": 320,
    "iron": 1.2,
    "calcium": 80,
    "vitD": 0,
    "vitB12": 0
  }
}
If perServing is not explicitly listed, calculate it mathematically from per100g and servingGrams.
Return ONLY valid JSON.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!groqRes.ok) {
      const errData = await groqRes.json().catch(() => ({}));
      throw new Error(`Groq API error: ${errData.error?.message || groqRes.statusText}`);
    }

    const groqJson = await groqRes.json();
    const rawContent = groqJson.choices?.[0]?.message?.content || '{}';
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);

    const name = parsed.productName || productHint || 'Scanned Nutrition Item';
    const brand = parsed.brand || '';
    const fullName = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name;

    const p100Raw = parsed.per100g || {};
    const pServRaw = parsed.perServing || {};
    const microsRaw = parsed.micronutrients || {};

    let cal100 = findNutrient(p100Raw, 'cal', 'calories', 'energy', 'kcal', 'energykcal');
    let protein100 = findNutrient(p100Raw, 'protein', 'prot');
    let carbs100 = findNutrient(p100Raw, 'carbs', 'carbohydrate', 'carbohydrates', 'totalcarbohydrate', 'totalcarbs');
    let fat100 = findNutrient(p100Raw, 'fat', 'totalfat', 'fats');
    let fiber100 = findNutrient(p100Raw, 'fiber', 'dietaryfiber', 'fibre');

    let calServ = findNutrient(pServRaw, 'cal', 'calories', 'energy', 'kcal', 'energykcal');
    let proteinServ = findNutrient(pServRaw, 'protein', 'prot');
    let carbsServ = findNutrient(pServRaw, 'carbs', 'carbohydrate', 'carbohydrates', 'totalcarbohydrate', 'totalcarbs');
    let fatServ = findNutrient(pServRaw, 'fat', 'totalfat', 'fats');

    const servingGrams = extractNumber(parsed.servingGrams) || extractNumber(parsed.servingLabel) || 100;
    const servingRatio = servingGrams > 0 ? (servingGrams / 100) : 1;

    if (!cal100 && (protein100 || carbs100 || fat100)) {
      cal100 = Math.round((protein100 * 4) + (carbs100 * 4) + (fat100 * 9));
    }
    if (!calServ && cal100) {
      calServ = Math.round(cal100 * servingRatio);
      if (!proteinServ) proteinServ = Math.round(protein100 * servingRatio * 10) / 10;
      if (!carbsServ) carbsServ = Math.round(carbs100 * servingRatio * 10) / 10;
      if (!fatServ) fatServ = Math.round(fat100 * servingRatio * 10) / 10;
    }

    const normalized = {
      found: true,
      name: fullName,
      rawName: name,
      brand,
      isLabelScan: true,
      servingLabel: parsed.servingLabel || (servingGrams ? `${servingGrams}g` : '100g'),
      servingGrams,
      per100g: {
        cal: Math.round(cal100),
        protein: Math.round(protein100 * 10) / 10,
        carbs: Math.round(carbs100 * 10) / 10,
        fat: Math.round(fat100 * 10) / 10,
        fiber: Math.round(fiber100 * 10) / 10,
      },
      perServing: {
        cal: Math.round(calServ || cal100),
        protein: Math.round((proteinServ || protein100) * 10) / 10,
        carbs: Math.round((carbsServ || carbs100) * 10) / 10,
        fat: Math.round((fatServ || fat100) * 10) / 10,
      },
      micronutrients: {
        sodium: Math.round(findNutrient(microsRaw, 'sodium', 'salt') || findNutrient(p100Raw, 'sodium', 'salt')),
        iron: Math.round((findNutrient(microsRaw, 'iron', 'fe') || findNutrient(p100Raw, 'iron')) * 10) / 10,
        calcium: Math.round((findNutrient(microsRaw, 'calcium', 'ca') || findNutrient(p100Raw, 'calcium')) * 10) / 10,
        vitD: findNutrient(microsRaw, 'vitd', 'vit_d', 'vitamind') || 0,
        vitB12: findNutrient(microsRaw, 'vitb12', 'vit_b12', 'vitaminb12') || 0
      }
    };

    res.json(normalized);
  } catch (err) {
    console.error('[Label Scanner] Error analyzing label:', err);
    res.status(500).json({
      found: false,
      error: err.message || 'Failed to analyze nutrition label.'
    });
  }
}
