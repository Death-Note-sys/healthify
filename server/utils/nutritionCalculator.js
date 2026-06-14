/**
 * Nutrition Calculator
 * 
 * Aggregates scaled nutrient values from multiple food items
 * and produces a clean, rounded totals object.
 */

const TRACKED_NUTRIENTS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'iron', 'calcium', 'vitD', 'vitB12', 'magnesium', 'zinc'];

function emptyTotals() {
  const t = {};
  for (const k of TRACKED_NUTRIENTS) t[k] = 0;
  return t;
}

const META = {
  calories: { name: 'Energy', unit: 'kcal' },
  protein: { name: 'Protein', unit: 'g' },
  carbs: { name: 'Carbohydrates', unit: 'g' },
  fat: { name: 'Total Fat', unit: 'g' },
  fiber: { name: 'Fiber', unit: 'g' },
  sugar: { name: 'Sugar', unit: 'g' },
  iron: { name: 'Iron', unit: 'mg' },
  calcium: { name: 'Calcium', unit: 'mg' },
  vitD: { name: 'Vitamin D', unit: 'µg' },
  vitB12: { name: 'Vitamin B-12', unit: 'µg' },
  magnesium: { name: 'Magnesium', unit: 'mg' },
  zinc: { name: 'Zinc', unit: 'mg' },
};

export function getNutrientMeta(key) {
  return META[key] || { name: key, unit: '' };
}

/**
 * Aggregate nutrients from an array of scaled food results.
 * 
 * @param {Array<Object>} scaledFoodsArray - Array of { food_name, scaledNutrients, grams, ... }
 * @returns {Object} Aggregated totals with rounded values
 */
export function aggregateNutrients(scaledFoodsArray) {
  const totals = emptyTotals();

  for (const food of scaledFoodsArray) {
    if (!food.scaledNutrients) continue;

    for (const key of TRACKED_NUTRIENTS) {
      if (food.scaledNutrients[key] !== undefined) {
        totals[key] += food.scaledNutrients[key];
      }
    }
  }

  // Round everything appropriately
  return roundTotals(totals);
}

/**
 * Round nutrient totals to appropriate decimal places.
 * Calories → integer, macros → 1dp, micros → 2dp.
 */
export function roundTotals(totals) {
  const rounded = {};

  for (const [key, value] of Object.entries(totals)) {
    if (key === 'calories') {
      rounded[key] = Math.round(value);
    } else if (['protein', 'carbs', 'fat', 'fiber', 'sugar'].includes(key)) {
      rounded[key] = Math.round(value * 10) / 10;
    } else {
      // Micronutrients — 2 decimal places
      rounded[key] = Math.round(value * 100) / 100;
    }
  }

  return rounded;
}

/**
 * Format totals into a human-readable summary string.
 */
export function formatTotalsSummary(totals) {
  const lines = [];
  for (const key of TRACKED_NUTRIENTS) {
    const meta = getNutrientMeta(key);
    const val = totals[key] ?? 0;
    lines.push(`${meta.label}: ${val} ${meta.unit}`);
  }
  return lines.join('\n');
}
