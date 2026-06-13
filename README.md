<div align="center">
  <img src="https://raw.githubusercontent.com/Death-Note-sys/healthify/main/public/vite.svg" width="80" alt="Healthify Logo"/>
  <h1 align="center">Healthify 🌿</h1>
  <p align="center">
    <strong>AI-Powered Personalized Nutrition & Fitness Tracker</strong>
  </p>
</div>

<p align="center">
  Healthify is a next-generation health tracking application built with React and powered by Llama 3.3 (Groq). It goes beyond standard calorie counters by allowing you to instantly log any food using natural language AI, complete with full macro and micronutrient estimations.
</p>

---

## ✨ Features

- **🤖 AI "Food API"**: Type any food and weight (e.g. "150g sweet potato") and the AI will instantly calculate precise macros and 6 key micronutrients.
- **💬 AI Nutrition Coach**: A built-in chat interface powered by Llama 3.3 that answers your fitness questions and can secretly log your meals when you mention them in conversation!
- **📊 Advanced Analytics**: Visual breakdowns of your daily macro split, 7-day protein consistency, and daily micronutrient targets using Recharts.
- **🔐 Secure Cloud Sync**: Full user authentication and database syncing powered by Supabase. Your data is protected with strict Row Level Security.
- **🎨 Premium UI/UX**: Built with a stunning dark-mode glassmorphism aesthetic using Syne and Plus Jakarta Sans fonts.

## 🛠 Tech Stack

- **Frontend:** React 18, Vite, Recharts
- **Backend/Database:** Supabase (PostgreSQL + Auth)
- **AI Integration:** Groq (Llama 3.3 70B) via a custom Express/Vercel serverless proxy
- **Deployment:** Vercel

---

## 🚀 Getting Started Locally

To run Healthify on your local machine:

### 1. Clone the repository
```bash
git clone https://github.com/Death-Note-sys/healthify.git
cd healthify
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and add your keys:
```env
# Server-side (Groq API for AI)
GROQ_API_KEY=your_groq_key

# Client-side (Supabase)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup
Run the `supabase_setup.sql`, `upgrade.sql`, and `upgrade2.sql` files in your Supabase SQL editor to create the necessary tables and Row Level Security policies.

### 5. Start the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to see the app in action! The local dev server will automatically run the Vite frontend and proxy the `/api/chat` endpoint to the Groq backend.

---

## ☁️ Deployment

Healthify is configured for seamless deployment on **Vercel**. 
The AI proxy is written as a Vercel Serverless Function (`api/chat.js`), ensuring your Groq API keys remain completely hidden from the browser.

When deploying, simply add your three environment variables in the Vercel Dashboard and deploy the `main` branch.

<div align="center">
  <i>Built with ❤️ for a healthier tomorrow.</i>
</div>
