
async function test() {
  const sq = "150g sweet potato";
  try {
    const res = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: `You are a nutrition API. Respond ONLY with a valid JSON object. No markdown, no backticks, no text. Keys: "name" (string), "cal" (number), "protein" (number), "carbs" (number), "fat" (number), "e" (emoji). Estimate macros for the exact quantity requested.`,
        messages: [{ role: 'user', parts: [{ text: sq }] }]
      })
    });
    const data = await res.json();
    console.log("Raw Response:", JSON.stringify(data, null, 2));
    
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log("Extracted Text:", reply);
    
    const jsonStr = reply.replace(/```json/g, '').replace(/```/g, '').trim();
    console.log("Cleaned JSON String:", jsonStr);
    
    const customFood = JSON.parse(jsonStr);
    console.log("Parsed JSON:", customFood);
    
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
