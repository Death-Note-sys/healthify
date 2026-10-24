<div align="center">
  <img src="https://via.placeholder.com/150/FAFAFA/3B82F6?text=Healthify" alt="Healthify Logo" width="100" />

  # Healthify AI
  **Premium, AI-powered nutrition, macro, barcode scanning, and fitness tracking.**
</div>

<br />

Healthify AI is a beautifully designed, modern health dashboard that removes the friction from calorie and macro counting. Instead of manually searching through endless clunky databases to find food items, Healthify empowers users with natural language AI parsing, instant barcode lookups, camera-based nutrition label scanning, and interactive fitness tracking.

Designed with an *Emil Kowalski-inspired* spatial interface, the application features "Warm Sand" premium aesthetics, fluid Framer Motion micro-animations, and glassmorphic depth.

---

## ✨ Features

### 🧠 Intelligent AI Nutrition Engine
* **Natural Language Logging:** Type *"I ate 6 eggs, 2 rotis, and 200ml of buttermilk"* and the AI extracts items, computes mathematical scaling for exact portions, and logs precise macros.
* **AI Coach:** A dedicated conversational assistant loaded with strict dietary guardrails. Discuss fitness goals, meal prep, or daily macros, and the AI will auto-log foods mentioned in chat directly into your tracker.
* **Smart Meal Classification:** Auto-categorizes food entries with dynamic emojis (🍳 Breakfast, 🥗 Lunch, 🍽️ Dinner, 🍎 Snack).

### 📷 Barcode & Multimodal Label Scanner
* **Barcode Lookup:** Scan any standard UPC/EAN barcode using your device camera or uploaded image to instantly fetch product data and macros via Open Food Facts.
* **AI Nutrition Label Scanner:** Snap a photo of any nutrition table (e.g. FSSAI or standard nutrition facts). Powered by Google Gemini Vision (`gemini-3.8-flash` / `gemini-2.5-flash`) with automatic fallback to persistent Tesseract.js OCR + Groq AI parsing.
* **Serving Breakdown:** Seamlessly toggle and log nutrition either per 100g or per package serving.

### ⚖️ Weight & Body Metrics Tracking
* **Weight Timeline:** Log your weight changes over time with date stamps and personal notes.
* **Target Weight & Progress:** Track your distance to target weight, body mass index (BMI), and visualize weekly, monthly, and yearly trend aggregations.

### 🎯 Profile & Custom Goals
* **Custom Fitness Goals:** Set individualized targets for daily calories, protein, carbohydrates, fats, and hydration.
* **Inline Modals:** Seamlessly edit profile details (name, age, height in cm/ft-in) and target goals via dedicated in-app modals without losing account state.

### 💧 Hydration & Habit Tracking
* **Dynamic Hydration Tracker:** Incrementally log water consumption against a customizable daily hydration target.
* **Streak Counter:** Automatically calculates and displays your active daily logging streak with celebration animations.
* **Visual Analytics:** Interactive Recharts pie charts, macro distributions, and multi-day historical trend graphs.

### 🛡️ Production-Ready Security & Reliability
* **Demo Mode Protection:** Protects AI quotas by gracefully intercepting unauthenticated AI queries with an interactive sign-in guard.
* **Supabase Authentication:** Secure email/password authentication backed by PostgreSQL Row Level Security (RLS) guaranteeing data isolation.
* **Clock-Skew Resilience:** Built-in automatic handling for JWT clock skew (`PGRST303`) between client devices and authentication servers.
* **Rate Limiting:** Protects backend endpoints with IP-based rate limiting to prevent API exhaustion.

---

## 🛠️ Tech Stack

### Frontend
* **Framework:** React 18 (Vite)
* **Styling & Motion:** Vanilla CSS Design System ("Warm Sand"), Framer Motion
* **Scanning & OCR:** `html5-qrcode`, `tesseract.js`
* **Data Visualization:** Recharts
* **Icons:** Lucide React

### Backend / API
* **Server:** Node.js / Express (Modular MVC Architecture)
* **Serverless:** Vercel Serverless Functions (`api/index.mjs`)
* **AI Engines:**
  * **Groq API** (`openai/gpt-oss-120b` / LLaMA) for NLP extraction and AI coaching
  * **Google Gemini API** (`gemini-3.8-flash` / `gemini-2.5-flash`) for multimodal vision & nutrition label recognition
* **Database & Auth:** Supabase (PostgreSQL with RLS)
* **External APIs:** Open Food Facts (Barcode database)

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* A [Supabase](https://supabase.com) project
* A [Groq](https://groq.com) API key
* *(Optional)* A [Google Gemini](https://ai.google.dev/) API key (for AI vision label scanning)

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

# Google Gemini API (Optional, for AI Nutrition Label Scanner)
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run Locally
The project uses `concurrently` to boot both the Vite frontend and Express backend simultaneously:
```bash
npm run dev
```
* **Frontend:** `http://localhost:5173`
* **Backend:** `http://localhost:3001`

---

## 🌍 Deployment

### Vercel Serverless
Healthify is pre-configured for Vercel Serverless deployments.
1. Import the repository into your Vercel Dashboard.
2. Add your environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GROQ_API_KEY`, and optionally `GEMINI_API_KEY`).
3. Deploy! Vercel routes `/api/*` requests through the serverless backend configured via `vercel.json`.

*Note: Update your Supabase "Site URL" and redirect URLs to match your live Vercel domain in your Supabase Auth settings.*

---

## 📁 Project Structure

```text
├── api/
│   └── index.mjs               # Vercel Serverless entrypoint
├── server/
│   ├── controllers/
│   │   ├── nutritionController.js  # NLP parsing, barcode lookup & label scanner
│   │   └── weightController.js     # Weight metrics & timeline aggregations
│   ├── middleware/             # Error handling & async wrappers
│   ├── routes/
│   │   ├── nutritionRoutes.js  # /api/nutrition routes
│   │   └── weightRoutes.js     # /api/weight routes
│   ├── services/
│   │   └── groqService.js      # Groq AI integration & prompt orchestration
│   └── utils/                  # Aggregation & formatting utilities
├── src/
│   ├── components/
│   │   ├── Auth.jsx            # Authentication modal & forms
│   │   └── BarcodeScannerModal.jsx # Camera barcode & AI label scanner modal
│   ├── hooks/                  # Custom React hooks (Supabase state & queries)
│   ├── lib/                    # Supabase client & clock-skew handling
│   ├── index.css               # Design system & CSS tokens
│   └── App.jsx                 # Main application dashboard
├── server.js                   # Express application setup
└── vercel.json                 # Vercel serverless configuration
```

---

## 📄 License
MIT License. Feel free to use and adapt this project for your own health tracking needs.
