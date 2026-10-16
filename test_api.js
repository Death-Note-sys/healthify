const url = 'http://localhost:3001/api/nutrition/analyze';
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ foodText: "200ml buttermilk" })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
