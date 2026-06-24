<div align="center">
  <img src="https://via.placeholder.com/150/FAFAFA/3B82F6?text=Healthify" alt="Healthify Logo" width="100" />

  # Healthify AI
  **Premium, AI-powered nutrition, macro, and fitness tracking.**
</div>

<br />

Healthify AI is a beautifully designed, modern health dashboard that removes the friction from calorie counting. Instead of manually searching through massive databases to find exact food matches, Healthify uses a state-of-the-art Large Language Model (Llama 3.3 70B via Groq) to instantly extract, scale, and log perfect macro profiles from natural language input.

Designed with an *Emil Kowalski-inspired* spatial interface, the application features "Warm Sand" premium aesthetics, fluid Framer Motion micro-animations, and glassmorphic depth.

## ✨ Features

### 🧠 Intelligent AI Nutrition Engine
*   **Natural Language Logging:** Type *"I ate 6 eggs and 200ml of buttermilk"* and the AI perfectly extracts the items, calculates the correct mathematical scaling for the quantities, and logs the macros.
*   **AI Coach:** A dedicated chat assistant loaded with strict dietary guardrails. Discuss fitness goals, meal prep, or macros, and the AI will auto-log any foods you mention eating directly into your daily tracker.
*   **Smart Emojis:** The system auto-categorizes foods with dynamic meal emojis (🍳 Breakfast, 🥗 Lunch, 🍽️ Dinner, 🍎 Snack).

### 🎨 Premium UI/UX Design System
*   **"Warm Sand" Light Mode:** Eye-pleasing off-white backgrounds, elevated pure-white glass cards, and soft ambient shadows.
*   **Micro-Animations:** Physics-based spring animations (`framer-motion`) provide staggering load effects, tactile button presses, and smooth tab transitions.
*   **Mono-Num Typography:** Fixed-width numerical rendering ensures calories and macros never jitter when changing.

### 📊 Comprehensive Tracking
*   **Dynamic Dashboard:** Real-time progress bars mapping your daily calorie, protein, carb, and fat intakes.
*   **Custom Hydration Tracking:** Incrementally track your water intake against a customizable daily hydration goal.
*   **Streak Counter:** Automatically calculates your active daily logging streak.
*   **Visual Analytics:** Recharts-powered interactive pie charts and multi-day trend graphs.

### 🛡️ Production-Ready Security
*   **Demo Mode Protection:** Protects expensive AI tokens by gracefully intercepting unauthenticated AI queries with a "Sign in to use AI" guard.
*   **Supabase Authentication:** Secure email/password login flow with Row Level Security (RLS) guaranteeing data privacy.
*   **Serverless Rate Limiting:** The backend is protected by IP-based rate limiting to prevent abuse.

## 🛠️ Tech Stack

**Frontend:**
*   **React 18** (Vite)
*   **Framer Motion** (Fluid Animations)
*   **Recharts** (Data Visualization)
*   **Lucide React** (Iconography)

**Backend / API:**
*   **Node.js / Express** (Modular MVC Architecture)
*   **Vercel Serverless Functions** (`api/index.mjs` entrypoint)
*   **Groq API** (Llama 3.3 70b Versatile for NLP extraction)
*   **Supabase** (PostgreSQL Database & Auth)

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   A [Supabase](https://supabase.com) account and project
*   A [Groq](https://groq.com) API key

### 1. Clone & Install
```bash
git clone https://github.com/Death-Note-sys/healthify.git
cd healthify
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Groq AI Configuration
GROQ_API_KEY=your_groq_api_key
```

### 3. Run Locally
The project uses `concurrently` to boot both the Vite frontend and the Express backend simultaneously.
```bash
npm run dev
```
*   Frontend: `http://localhost:5173`
*   Backend: `http://localhost:3001`

## 🌍 Deployment

### Vercel
Healthify is fully optimized for Vercel Serverless deployments.
1. Import the repository into Vercel.
2. In the Vercel Dashboard, add your **Environment Variables** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GROQ_API_KEY`).
3. Deploy! Vercel's Edge Network will automatically intercept `/api/*` requests and route them through the `.mjs` serverless backend via the `vercel.json` rewrites.

*Note: Be sure to update your Supabase "Site URL" to match your live Vercel domain in the Supabase Authentication settings!*

## 📁 Project Structure

```text
├── api/
│   └── index.mjs           # Vercel Serverless entrypoint
├── server/
│   ├── controllers/        # Express route logic (analyzeFood)
│   ├── middleware/         # Centralized error handling
│   ├── routes/             # API routing
│   ├── services/           # Groq AI integration logic
│   └── utils/              # Math aggregation & formatting
├── src/
│   ├── components/         # React Components (Auth, Dashboard, Analytics, Chat)
│   ├── hooks/              # Supabase DB integration & State
│   ├── index.css           # Premium Design System (CSS Variables)
│   └── App.jsx.jsx         # Main application orchestrator
├── server.js               # Express application setup
└── vercel.json             # Vercel deployment rewrites
```
