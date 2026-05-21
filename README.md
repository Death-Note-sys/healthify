# Healthify 🌿
> AI-powered personalized nutrition tracking — calorie goals, macros, micros, water tracking & AI coaching.

---

## ⚡ Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Start dev server  (opens at http://localhost:3000)
npm run dev
```

---

## 🚀 Deploy to Vercel (Recommended — Free)

### Option A — Via GitHub (best)
```bash
# Push to GitHub first
git init
git add .
git commit -m "Initial commit — Healthify app"
git remote add origin https://github.com/YOUR_USERNAME/healthify.git
git push -u origin main
```
Then:
1. Go to **vercel.com** → Sign in with GitHub
2. Click **Add New Project** → Import your repo
3. Leave all settings as default → click **Deploy**
4. Your app is live at `healthify-xyz.vercel.app` 🎉

### Option B — Vercel CLI (faster)
```bash
npm install -g vercel
vercel        # follow prompts
```

---

## 🌐 Deploy to Netlify (Drag & Drop — No Git needed)

```bash
npm run build    # creates /dist folder
```
1. Go to **netlify.com/drop**
2. Drag your `/dist` folder onto the page
3. Done — live link in seconds ✅

---

## 🤖 Setting Up the AI Chatbot (Part 6)

When Part 6 is added, the AI coach uses the Anthropic API.
**Never hardcode your API key in the frontend.**

### For Vercel:
1. Go to your project → **Settings → Environment Variables**
2. Add: `VITE_ANTHROPIC_API_KEY` = your key
3. Redeploy

### For local development:
Create a `.env.local` file (already gitignored):
```
VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here
```

In the code, access it as:
```js
const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
```

---

## 📁 Project Structure

```
healthify/
├── index.html              # HTML entry point + meta tags
├── vite.config.js          # Vite + React config
├── package.json            # Dependencies
├── .gitignore              # Git ignore rules
└── src/
    ├── main.jsx            # React DOM mount
    └── App.jsx             # Full Healthify app (all parts)
```

---

## 🛠 Tech Stack

| Layer      | Tech                          |
|------------|-------------------------------|
| Framework  | React 18                      |
| Bundler    | Vite 5                        |
| Charts     | Recharts                      |
| Fonts      | Syne + Plus Jakarta Sans      |
| Styling    | Inline styles + CSS-in-JS     |
| AI Coach   | Anthropic Claude API          |
| Hosting    | Vercel / Netlify (free tier)  |

---

## 🏗 Build Status

| Part | Feature              | Status  |
|------|----------------------|---------|
| 1    | Landing + Onboarding | ✅ Done |
| 2    | Dashboard            | ✅ Done |
| 3    | Food Log             | ✅ Done |
| 4    | Analytics            | 🔜 Next |
| 5    | Profile Page         | 🔜 Soon |
| 6    | AI Chatbot           | 🔜 Soon |

---

## 💼 Showcase Tips

- Add the live Vercel URL to your **resume** and **LinkedIn**
- Record a **Loom walkthrough** of all features
- Star the repo and add topics: `react`, `nutrition`, `fitness`, `vite`, `ai`
