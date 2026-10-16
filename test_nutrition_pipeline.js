/**
 * End-to-End Test Script for Nutrition Analysis Pipeline
 * 
 * Tests the POST /api/nutrition/analyze endpoint with sample inputs.
 * Run: node test_nutrition_pipeline.js
 * 
 * Requires the server to be running on localhost:3001.
 */

const API_URL = 'http://localhost:3001/api/nutrition/analyze';

const TEST_CASES = [
  {
    name: 'Indian Breakfast',
    foodText: '2 eggs, 250 ml milk, 100g paneer, 3 chapatis, 1 banana',
  },
  {
    name: 'Simple Lunch',
    foodText: '1 cup rice, 1 bowl dal, 1 roti, 1 apple',
  },
  {
    name: 'Single Item',
    foodText: '200g chicken breast',
  },
];

async function runTest(testCase) {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`📝 Test: ${testCase.name}`);
  console.log(`   Input: "${testCase.foodText}"`);
  console.log(`${'━'.repeat(60)}`);

  try {
    const start = Date.now();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodText: testCase.foodText }),
    });

    const duration = Date.now() - start;

    if (!response.ok) {
      const err = await response.json();
      console.error(`   ❌ HTTP ${response.status}: ${err.error?.message || JSON.stringify(err)}`);
      return false;
    }

    const data = await response.json();

    // Display results
    console.log(`\n   ⏱️  Processing time: ${data.meta?.processingTimeMs || duration}ms`);
    console.log(`   📊 Foods found: ${data.meta?.foodsFound}/${data.meta?.foodsTotal}`);

    console.log(`\n   🍽️  Foods:`);
    for (const food of data.foods) {
      const n = food.nutrition;
      const usda = food.usdaMatch?.description || 'No USDA match';
      console.log(`      • ${food.quantity} ${food.unit} ${food.food_name} (${food.grams}g)`);
      console.log(`        USDA: ${usda}`);
      if (n) {
        console.log(`        ${n.calories} kcal | ${n.protein}g P | ${n.carbs}g C | ${n.fat}g F`);
      }
    }

    console.log(`\n   📈 Totals:`);
    const t = data.totals;
    console.log(`      Calories:  ${t.calories} kcal`);
    console.log(`      Protein:   ${t.protein} g`);
    console.log(`      Carbs:     ${t.carbs} g`);
    console.log(`      Fat:       ${t.fat} g`);
    console.log(`      Fiber:     ${t.fiber} g`);
    console.log(`      Iron:      ${t.iron} mg`);
    console.log(`      Calcium:   ${t.calcium} mg`);
    console.log(`      Vit B12:   ${t.vitamin_b12} µg`);
    console.log(`      Vit D:     ${t.vitamin_d} µg`);

    console.log(`\n   🤖 AI Analysis:`);
    console.log(`      Summary: ${data.analysis?.summary}`);
    if (data.analysis?.strengths?.length) {
      console.log(`      ✅ Strengths:`);
      data.analysis.strengths.forEach(s => console.log(`         • ${s}`));
    }
    if (data.analysis?.deficiencies?.length) {
      console.log(`      ⚠️  Deficiencies:`);
      data.analysis.deficiencies.forEach(d => console.log(`         • ${d}`));
    }
    if (data.analysis?.recommendations?.length) {
      console.log(`      💡 Recommendations:`);
      data.analysis.recommendations.forEach(r => console.log(`         • ${r}`));
    }

    console.log(`\n   ✅ Test PASSED`);
    return true;

  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🧪 Nutrition Analysis Pipeline — End-to-End Test');
  console.log(`   Server: ${API_URL}`);

  // Check server is running
  try {
    await fetch(API_URL, { method: 'OPTIONS' });
  } catch {
    console.error('\n❌ Server is not running! Start it with: npm run dev:server');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  // Run only the first test by default to save API calls
  const testToRun = process.argv[2] === '--all' ? TEST_CASES : [TEST_CASES[0]];

  for (const tc of testToRun) {
    const ok = await runTest(tc);
    if (ok) passed++;
    else failed++;
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 Results: ${passed} passed, ${failed} failed (of ${testToRun.length})`);
  if (testToRun.length < TEST_CASES.length) {
    console.log(`   Run with --all flag to test all ${TEST_CASES.length} cases`);
  }
  console.log(`${'═'.repeat(60)}`);
}

main();
