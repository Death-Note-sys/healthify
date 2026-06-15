import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Plus, Home, BarChart2, User, ChevronRight, Activity, Target, Zap, Droplets, Utensils, Check, Coffee, Carrot, Fish, Apple, X, Loader2 } from "lucide-react";

import { useAuth } from './hooks/useAuth';
import { useSupabaseData } from './hooks/useSupabaseData';
import Auth from './components/Auth';

// ── Global styles (fonts + animations) ──────────────────────
const GlobalStyle = () => (
  <style>{`
    :root {
      /* Minimalist Monochromatic Base (Linear/Vercel style) */
      --bg-base: #FAFAF9;
      --bg-surface: #FFFFFF;
      --bg-elevated: #F4F4F5;

      /* Ink scale */
      --ink-primary: #09090B;
      --ink-secondary: #52525B;
      --ink-muted: #A1A1AA;
      --ink-faint: #E4E4E7;

      /* Semantic accent colours (Subdued but distinct) */
      --accent-primary: #18181B;
      --accent-green: #10B981;
      --accent-blue: #3B82F6;
      --accent-amber: #F59E0B;
      --accent-red: #EF4444;

      /* Refined Glass & Borders */
      --glass-border: rgba(0, 0, 0, 0.08);
      --glass-border-hover: rgba(0, 0, 0, 0.12);
      
      /* Physics-based Shadows (Emil Kowalski) */
      --shadow-sm: 0px 1px 2px rgba(0,0,0,0.04), 0px 1px 1px rgba(0,0,0,0.02);
      --shadow-md: 0px 4px 8px -2px rgba(0,0,0,0.05), 0px 2px 4px -2px rgba(0,0,0,0.03);
      --shadow-lg: 0px 12px 24px -4px rgba(0,0,0,0.06), 0px 8px 16px -4px rgba(0,0,0,0.04);
      --shadow-xl: 0px 24px 48px -8px rgba(0,0,0,0.08), 0px 12px 24px -8px rgba(0,0,0,0.04);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    
    body { background: var(--bg-base); color: var(--ink-primary); -webkit-font-smoothing: antialiased; }

    /* Typography Scale - Tight tracking, strong hierarchy */
    .display   { font-size: 28px; font-weight: 700; letter-spacing: -0.04em; color: var(--ink-primary); line-height: 1.1; }
    .title     { font-size: 18px; font-weight: 600; letter-spacing: -0.02em; color: var(--ink-primary); }
    .label     { font-size: 12px; font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase; color: var(--ink-muted); }
    .body      { font-size: 14px; font-weight: 400; color: var(--ink-secondary); line-height: 1.6; }
    .caption   { font-size: 12px; font-weight: 400; color: var(--ink-muted); }
    .mono-num  { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; letter-spacing: -0.01em; }

    /* Impeccable Background Mesh (Very subtle) */
    .app-background {
      background: var(--bg-base);
      position: relative;
      min-height: 100vh;
      overflow-x: hidden;
    }
    .app-background::before {
      content: '';
      position: absolute; inset: 0; pointer-events: none;
      background:
        radial-gradient(ellipse 60% 50% at 50% -10%, rgba(0,0,0,0.03) 0%, transparent 100%),
        radial-gradient(ellipse 40% 40% at 100% 100%, rgba(0,0,0,0.02) 0%, transparent 100%);
    }

    /* Refined Card */
    .glass-card {
      position: relative;
      background: var(--bg-surface);
      border: 1px solid var(--glass-border);
      box-shadow: var(--shadow-sm);
      border-radius: 16px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }
    .glass-card-content {
      position: relative;
      z-index: 1;
    }
    .glass-card:hover {
      border-color: var(--glass-border-hover);
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }

    /* Minimal Button System */
    button { 
      cursor: pointer; font-family: inherit; font-weight: 500; display: inline-flex; 
      align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; 
      border-radius: 12px; font-size: 14px; outline: none; 
      transition: background 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.15s ease;
    }
    
    .btn-primary {
      background: var(--accent-primary);
      border: 1px solid rgba(255,255,255,0.1);
      color: #FFFFFF;
      box-shadow: var(--shadow-sm);
    }
    .btn-primary:hover:not(:disabled) {
      background: #27272A;
      transform: scale(0.98);
      box-shadow: var(--shadow-md);
    }
    .btn-primary:active:not(:disabled) {
      transform: scale(0.96);
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-secondary {
      background: var(--bg-surface);
      border: 1px solid var(--glass-border);
      color: var(--ink-primary);
      box-shadow: var(--shadow-sm);
    }
    .btn-secondary:hover:not(:disabled) { 
      background: var(--bg-elevated); 
      border-color: var(--glass-border-hover);
    }
    .btn-secondary:active:not(:disabled) {
      transform: scale(0.96);
    }
    .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-liquid-glass {
      background: var(--bg-surface);
      border: 1px solid var(--glass-border);
      color: var(--ink-primary);
      box-shadow: var(--shadow-sm);
      border-radius: 99px;
      padding: 10px 24px;
      font-weight: 500;
    }
    .btn-liquid-glass:hover:not(:disabled) {
      background: var(--bg-elevated);
      box-shadow: var(--shadow-md);
    }

    /* Focus */
    *:focus-visible {
      outline: 2px solid var(--ink-primary);
      outline-offset: 2px;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: var(--ink-faint); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--ink-muted); }
  `}</style>
);


// ── Constants ────────────────────────────────────────────────
const ACTS = [
  { key: 'sedentary',  label: 'Sedentary',          desc: 'Desk job · little to no exercise',      mult: 1.2,   emoji: '🛋️' },
  { key: 'light',      label: 'Lightly Active',      desc: 'Light exercise 1–3 days/week',           mult: 1.375, emoji: '🚶' },
  { key: 'moderate',   label: 'Moderately Active',   desc: 'Moderate exercise 3–5 days/week',        mult: 1.55,  emoji: '🏃' },
  { key: 'active',     label: 'Very Active',         desc: 'Hard training 6–7 days/week',            mult: 1.725, emoji: '🏋️' },
  { key: 'veryActive', label: 'Athlete',             desc: 'Twice-daily training or physical job',   mult: 1.9,   emoji: '⚡' },
];

const GOALS = [
  { key: 'cut',      label: 'Fat Loss',     emoji: '🔥', desc: '500 kcal deficit · preserve muscle',    adj: -500, color: 'var(--accent-amber)', pMult: 2.4 },
  { key: 'maintain', label: 'Maintenance',  emoji: '⚖️', desc: 'Eat at TDEE · body recomposition',      adj: 0,    color: 'var(--accent-green)', pMult: 1.8 },
  { key: 'bulk',     label: 'Muscle Gain',  emoji: '💪', desc: '300 kcal lean surplus · build mass',    adj: 300,  color: 'var(--accent-blue)', pMult: 2.0 },
];

// ── BMR/TDEE calculation (Mifflin-St Jeor) ──────────────────
const calcNutrition = (f) => {
  const s   = f.gender === 'male' ? 5 : -161;
  const bmr = 10 * f.weight + 6.25 * f.height - 5 * f.age + s;
  const mult = ACTS.find(a => a.key === f.activity)?.mult || 1.55;
  const tdee = Math.round(bmr * mult);
  const goal = GOALS.find(g => g.key === f.goal);
  const calories = Math.round(tdee + (goal?.adj || 0));
  const protein  = Math.round(f.weight * (goal?.pMult || 1.8));
  const rem  = calories - protein * 4;
  const fat  = Math.round((rem * 0.28) / 9);
  const carbs = Math.round((rem * 0.72) / 4);
  return { calories, tdee, bmr: Math.round(bmr), protein, carbs, fat };
};

// ── Food database (20 foods with macros + micros) ────────────
const FOOD_DB = [
  {id:1,  name:'Chicken Breast', e:'🍗', s:'per 100g',      cal:165, protein:31,  carbs:0,   fat:3.6, iron:1,   calcium:11,  vitD:0,   vitB12:0.3, magnesium:29,  zinc:1  },
  {id:2,  name:'Brown Rice',     e:'🍚', s:'1 cup cooked',  cal:216, protein:5,   carbs:45,  fat:1.8, iron:1,   calcium:20,  vitD:0,   vitB12:0,   magnesium:84,  zinc:1.2},
  {id:3,  name:'Paneer',         e:'🧀', s:'per 100g',      cal:265, protein:18,  carbs:3.4, fat:20,  iron:0.5, calcium:480, vitD:0,   vitB12:0.8, magnesium:8,   zinc:2.7},
  {id:4,  name:'Eggs',           e:'🥚', s:'1 large egg',   cal:72,  protein:6,   carbs:0.4, fat:5,   iron:0.9, calcium:28,  vitD:1.1, vitB12:0.6, magnesium:6,   zinc:0.6},
  {id:5,  name:'Oats',           e:'🌾', s:'100g dry',      cal:389, protein:17,  carbs:66,  fat:7,   iron:4.7, calcium:54,  vitD:0,   vitB12:0,   magnesium:177, zinc:4  },
  {id:6,  name:'Whey Protein',   e:'🥤', s:'1 scoop 30g',   cal:120, protein:24,  carbs:3,   fat:2,   iron:0,   calcium:130, vitD:0,   vitB12:0,   magnesium:0,   zinc:0  },
  {id:7,  name:'Dal / Lentils',  e:'🫘', s:'1 cup cooked',  cal:230, protein:18,  carbs:40,  fat:0.8, iron:6.6, calcium:38,  vitD:0,   vitB12:0,   magnesium:71,  zinc:2.5},
  {id:8,  name:'Banana',         e:'🍌', s:'1 medium',      cal:105, protein:1.3, carbs:27,  fat:0.4, iron:0.3, calcium:6,   vitD:0,   vitB12:0,   magnesium:32,  zinc:0.2},
  {id:9,  name:'Whole Milk',     e:'🥛', s:'1 cup 240ml',   cal:149, protein:8,   carbs:12,  fat:8,   iron:0.1, calcium:276, vitD:3.2, vitB12:1.1, magnesium:24,  zinc:1  },
  {id:10, name:'Spinach',        e:'🥬', s:'per 100g',      cal:23,  protein:2.9, carbs:3.6, fat:0.4, iron:2.7, calcium:99,  vitD:0,   vitB12:0,   magnesium:79,  zinc:0.5},
  {id:11, name:'Greek Yogurt',   e:'🥣', s:'per 100g',      cal:59,  protein:10,  carbs:3.6, fat:0.4, iron:0.1, calcium:111, vitD:0,   vitB12:0.6, magnesium:11,  zinc:0.5},
  {id:12, name:'Almonds',        e:'🌰', s:'28g ~23 nuts',  cal:164, protein:6,   carbs:6,   fat:14,  iron:1.1, calcium:76,  vitD:0,   vitB12:0,   magnesium:76,  zinc:0.9},
  {id:13, name:'Salmon',         e:'🐟', s:'per 100g',      cal:208, protein:20,  carbs:0,   fat:13,  iron:0.8, calcium:12,  vitD:9.4, vitB12:3.2, magnesium:29,  zinc:0.4},
  {id:14, name:'Sweet Potato',   e:'🍠', s:'1 medium 130g', cal:112, protein:2,   carbs:26,  fat:0.1, iron:0.7, calcium:39,  vitD:0,   vitB12:0,   magnesium:27,  zinc:0.3},
  {id:15, name:'Chapati / Roti', e:'🫓', s:'1 piece 40g',   cal:120, protein:3.5, carbs:18,  fat:3.7, iron:1.2, calcium:15,  vitD:0,   vitB12:0,   magnesium:12,  zinc:0.4},
  {id:16, name:'Rajma',          e:'🫘', s:'1 cup cooked',  cal:225, protein:15,  carbs:40,  fat:0.9, iron:5.2, calcium:62,  vitD:0,   vitB12:0,   magnesium:74,  zinc:1.8},
  {id:17, name:'Tofu',           e:'🍱', s:'per 100g',      cal:76,  protein:8,   carbs:1.9, fat:4.8, iron:5.4, calcium:350, vitD:0,   vitB12:0,   magnesium:30,  zinc:0.8},
  {id:18, name:'Avocado',        e:'🥑', s:'per 100g',      cal:160, protein:2,   carbs:9,   fat:15,  iron:0.6, calcium:12,  vitD:0,   vitB12:0,   magnesium:29,  zinc:0.6},
  {id:19, name:'Peanut Butter',  e:'🥜', s:'2 tbsp 32g',    cal:190, protein:7,   carbs:7,   fat:16,  iron:0.6, calcium:17,  vitD:0,   vitB12:0,   magnesium:49,  zinc:0.9},
  {id:20, name:'Cottage Cheese', e:'🧀', s:'per 100g',      cal:98,  protein:11,  carbs:3.4, fat:4.3, iron:0.1, calcium:83,  vitD:0,   vitB12:0.4, magnesium:8,   zinc:0.4},
];

const isToday = d => new Date(d).toDateString() === new Date().toDateString();

const mkTodayLogs = () => [
  {id:1, food:FOOD_DB[3],  qty:3,   mealType:'breakfast', date:new Date().toISOString()},
  {id:2, food:FOOD_DB[4],  qty:0.5, mealType:'breakfast', date:new Date().toISOString()},
  {id:3, food:FOOD_DB[8],  qty:1,   mealType:'breakfast', date:new Date().toISOString()},
  {id:4, food:FOOD_DB[0],  qty:1.5, mealType:'lunch',     date:new Date().toISOString()},
  {id:5, food:FOOD_DB[1],  qty:1,   mealType:'lunch',     date:new Date().toISOString()},
];

// ── Shared UI primitives ─────────────────────────────────────
const Btn = ({ children, onClick, style: s = {}, disabled }) => (
  <button className="btn-primary" onClick={onClick} disabled={disabled} style={{ ...s }}>
    {children}
  </button>
);

const SecBtn = ({ children, onClick, style: s = {}, disabled }) => (
  <button className="btn-secondary" onClick={onClick} disabled={disabled} style={{ ...s }}>
    {children}
  </button>
);

const LiquidGlassBtn = ({ children, onClick, style: s = {}, disabled }) => (
  <button className="btn-liquid-glass" onClick={onClick} disabled={disabled} style={{ ...s }}>
    {children}
  </button>
);

const Card = ({ children, style: s = {}, className = '' }) => (
  <div className={`glass-card ${className}`} style={{ padding: 0, ...s }}>
    <div className="glass-card-content" style={{ padding: 20 }}>
      {children}
    </div>
  </div>
);

// ── Spotlight Components ─────────────────────────────────────────
const SpotlightContainer = ({ children, className = '', style = {} }) => {
  const containerRef = useRef(null);
  
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} className={`spotlight-container ${className}`} style={{ position: 'relative', ...style }}>
      {children}
    </div>
  );
};

const SpotlightItem = ({ children, className = '', style = {} }) => {
  return (
    <div className={`glass-card ${className}`} style={{ padding: 0, position: 'relative', overflow: 'hidden', ...style }}>
      {/* The spotlight glow element */}
      <div 
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.85), transparent 40%)',
          opacity: 0, transition: 'opacity 0.3s'
        }}
        className="spotlight-glow"
      />
      {/* Content wrapper to stay above the glow */}
      <div className="glass-card-content" style={{ padding: 20, height: '100%', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

const FieldLabel = ({ children }) => (
  <label className="label" style={{ display: 'block', marginBottom: 7 }}>
    {children}
  </label>
);

const NumInput = ({ label, value, onChange, min, max }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <input type="number" value={value} min={min} max={max}
      onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      style={{
        width: '100%', background: 'transparent', borderRadius: 12,
        border: '1.5px solid var(--glass-border-outer)',
        color: 'var(--ink-primary)', padding: '12px 10px',
        fontFamily: "'Inter', sans-serif", fontSize: 15, outline: 'none', transition: 'border-color 0.2s'
      }} />
  </div>
);

// ── Part 2 visual components ─────────────────────────────────

const ProgressRing = ({ v, max, size = 150, sw = 13, color = 'var(--accent-green)' }) => {
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(v / max, 1);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.9s ease' }} />
    </svg>
  );
};

const MacroBar = ({ label, v, max, color, unit = 'g' }) => {
  const pct = Math.min((v / max) * 100, 100);
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
        <span className="body">{label}</span>
        <span className="mono-num" style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>
          {Math.round(v)}<span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>/{max}{unit}</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.9s ease' }} />
      </div>
    </div>
  );
};

// ── Step Indicator ───────────────────────────────────────────
const StepDots = ({ step }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
    {[1, 2, 3].map(s => (
      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 600, fontSize: 13,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: s < step ? 'var(--ink-primary)' : s === step ? 'var(--bg-elevated)' : 'transparent',
          border: `1.5px solid ${s < step ? 'var(--ink-primary)' : s === step ? 'var(--glass-border-hover)' : 'var(--glass-border)'}`,
          color: s < step ? 'var(--bg-base)' : s === step ? 'var(--ink-primary)' : 'var(--ink-muted)',
        }}>
          {s < step ? <Check size={16} /> : s}
        </div>
        {s < 3 && <div style={{ width: 40, height: 2, borderRadius: 1, background: s < step ? 'var(--ink-primary)' : 'var(--glass-border)', transition: 'background 0.3s' }} />}
      </div>
    ))}
  </div>
);

// ── Landing Page ─────────────────────────────────────────────
const Landing = ({ onStart, onDemo }) => {
  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Top nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', borderBottom: `1px solid var(--glass-border)`, position: 'relative', zIndex: 1, background: 'var(--bg-surface)' }}>
        <div className="display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-primary)', letterSpacing: '-0.02em' }}>
          Healthify
        </div>
        <button className="btn-secondary" onClick={onStart} style={{ padding: '8px 16px', fontSize: 13, borderRadius: 8 }}>
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <motion.div variants={containerVars} initial="hidden" animate="show" style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        
        {/* Live badge */}
        <motion.div variants={itemVars} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
          borderRadius: 99, padding: '6px 16px',
          fontSize: 12, fontWeight: 500, color: 'var(--ink-secondary)', marginBottom: 32, letterSpacing: '0.02em'
        }}>
          <Sparkles size={14} style={{ color: 'var(--ink-primary)' }} />
          AI-POWERED NUTRITION
        </motion.div>

        <motion.h1 variants={itemVars} className="display" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.04em', color: 'var(--ink-primary)' }}>
          Precision tracking.<br />
          <span style={{ color: 'var(--ink-secondary)' }}>Zero friction.</span>
        </motion.h1>

        <motion.p variants={itemVars} style={{ fontSize: 18, color: 'var(--ink-secondary)', maxWidth: 540, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Track macros, micronutrients, and calories with natural language. Build the perfect physique with AI-driven insights.
        </motion.p>

        <motion.div variants={itemVars} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
          <button className="btn-primary" onClick={onStart} style={{ padding: '12px 28px', fontSize: 15, borderRadius: 10 }}>
            Start Tracking <ChevronRight size={16} />
          </button>
          <button className="btn-secondary" onClick={onDemo} style={{ padding: '12px 28px', fontSize: 15, borderRadius: 10 }}>
            View Demo
          </button>
        </motion.div>

        {/* Feature Grid */}
        <motion.div variants={containerVars} style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, textAlign: 'left', marginBottom: 64 
          }}>
          <motion.div variants={itemVars} className="glass-card" style={{ padding: 24, gridColumn: 'span 2' }}>
            <Target size={24} style={{ color: 'var(--ink-primary)', marginBottom: 16 }} />
            <div className="title" style={{ marginBottom: 8 }}>Adaptive Calorie Goals</div>
            <div className="body">Mifflin-St Jeor TDEE calculations combined with dynamic activity multipliers. Perfect for cutting, bulking, or maintaining.</div>
          </motion.div>
          
          <motion.div variants={itemVars} className="glass-card" style={{ padding: 24 }}>
            <Zap size={24} style={{ color: 'var(--ink-primary)', marginBottom: 16 }} />
            <div className="title" style={{ marginBottom: 8 }}>AI Analysis</div>
            <div className="body">Log foods naturally. Let our AI extract exact macros.</div>
          </motion.div>

          <motion.div variants={itemVars} className="glass-card" style={{ padding: 24 }}>
            <Droplets size={24} style={{ color: 'var(--ink-primary)', marginBottom: 16 }} />
            <div className="title" style={{ marginBottom: 8 }}>Hydration</div>
            <div className="body">Track daily water intake with a single tap.</div>
          </motion.div>

          <motion.div variants={itemVars} className="glass-card" style={{ padding: 24, gridColumn: 'span 2' }}>
            <Activity size={24} style={{ color: 'var(--ink-primary)', marginBottom: 16 }} />
            <div className="title" style={{ marginBottom: 8 }}>Complete Macro & Micro Profile</div>
            <div className="body">Monitor Protein, Carbs, Fat, and essential micros like Iron, Calcium, and Zinc. Ensure your diet is perfectly balanced.</div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// ── Onboarding (3 steps) ─────────────────────────────────────
const Onboard = ({ onFinish, initialData, onCancel }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialData || { name: '', age: 23, weight: 75, height: 175, gender: 'male', activity: 'moderate', goal: 'bulk' });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const nutrition = calcNutrition(form);
  const gi = GOALS.find(g => g.key === form.goal) || GOALS[1];

  const slideVars = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'var(--bg-base)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Onboard header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink-primary)', marginBottom: 24, letterSpacing: '-0.02em' }}>Healthify</div>
          <StepDots step={step} />
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', letterSpacing: '0.04em' }}>
            {step === 1 ? 'PERSONAL INFO' : step === 2 ? 'YOUR GOALS' : 'YOUR PLAN'}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 32, position: 'relative', overflow: 'hidden', minHeight: 400 }}>
          <AnimatePresence mode="wait">
            {/* ─── STEP 1: Personal Info ─────────────────────── */}
            {step === 1 && (
              <motion.div key="step1" variants={slideVars} initial="initial" animate="animate" exit="exit">
                <div className="display" style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: 'var(--ink-primary)', letterSpacing: '-0.02em' }}>About You</div>
                <p style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 24, lineHeight: 1.5 }}>We use this to calculate your exact calorie needs.</p>

                {/* Name */}
                <div style={{ marginBottom: 20 }}>
                  <FieldLabel>Your Name</FieldLabel>
                  <input type="text" value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Arjun"
                    style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 12, color: 'var(--ink-primary)', padding: '14px 16px', fontFamily: 'inherit', fontSize: 15, outline: 'none', transition: 'border-color 0.2s' }} />
                </div>

                {/* Age / Weight / Height */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <NumInput label="Age"    value={form.age}    onChange={v => upd('age', v)}    min={15}  max={80}  />
                  <NumInput label="Weight" value={form.weight} onChange={v => upd('weight', v)} min={30}  max={250} />
                  <NumInput label="Height" value={form.height} onChange={v => upd('height', v)} min={130} max={220} />
                </div>

                {/* Gender */}
                <div style={{ marginBottom: 32 }}>
                  <FieldLabel>Gender</FieldLabel>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[['male','Male'],['female','Female']].map(([val, lbl]) => (
                      <button key={val} onClick={() => upd('gender', val)} style={{
                        flex: 1, padding: '14px', borderRadius: 12, cursor: 'pointer',
                        fontWeight: 500, fontFamily: 'inherit', fontSize: 14,
                        background: form.gender === val ? 'var(--ink-primary)' : 'transparent',
                        border: `1px solid ${form.gender === val ? 'var(--ink-primary)' : 'var(--glass-border)'}`,
                        color: form.gender === val ? 'var(--bg-base)' : 'var(--ink-secondary)', transition: 'all 0.2s'
                      }}>{lbl}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  {onCancel && <button className="btn-secondary" onClick={onCancel} style={{ flex: 1, padding: '14px' }}>Cancel</button>}
                  <button className="btn-primary" onClick={() => setStep(2)} style={{ flex: onCancel ? 2 : 1, width: '100%', padding: '14px' }}>Continue</button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 2: Activity + Goal ────────────────────── */}
            {step === 2 && (
              <motion.div key="step2" variants={slideVars} initial="initial" animate="animate" exit="exit">
                <div className="display" style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: 'var(--ink-primary)', letterSpacing: '-0.02em' }}>Your Goals</div>
                <p style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 24, lineHeight: 1.5 }}>Pick your activity level and what you want to achieve.</p>

                {/* Activity level */}
                <div style={{ marginBottom: 24 }}>
                  <FieldLabel>Activity Level</FieldLabel>
                  {ACTS.map(a => (
                    <div key={a.key} onClick={() => upd('activity', a.key)} style={{
                      padding: '14px 16px', borderRadius: 12, marginBottom: 8, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: form.activity === a.key ? 'var(--bg-elevated)' : 'transparent',
                      border: `1px solid ${form.activity === a.key ? 'var(--ink-primary)' : 'var(--glass-border)'}`,
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 20 }}>{a.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14, color: form.activity === a.key ? 'var(--ink-primary)' : 'var(--ink-secondary)' }}>{a.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{a.desc}</div>
                        </div>
                      </div>
                      {form.activity === a.key && (
                        <Check size={18} color="var(--ink-primary)" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Primary goal */}
                <div style={{ marginBottom: 32 }}>
                  <FieldLabel>Primary Goal</FieldLabel>
                  {GOALS.map(g => (
                    <div key={g.key} onClick={() => upd('goal', g.key)} style={{
                      padding: '14px 16px', borderRadius: 12, marginBottom: 8, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: form.goal === g.key ? 'var(--bg-elevated)' : 'transparent',
                      border: `1px solid ${form.goal === g.key ? g.color : 'var(--glass-border)'}`,
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 20 }}>{g.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14, color: form.goal === g.key ? g.color : 'var(--ink-secondary)' }}>{g.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{g.desc}</div>
                        </div>
                      </div>
                      {form.goal === g.key && (
                        <Check size={18} color={g.color} />
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-secondary" onClick={() => setStep(1)} style={{ flex: 1, padding: '14px' }}>Back</button>
                  <button className="btn-primary"   onClick={() => setStep(3)} style={{ flex: 2, padding: '14px' }}>See My Plan</button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 3: Results ────────────────────────────── */}
            {step === 3 && (
              <motion.div key="step3" variants={slideVars} initial="initial" animate="animate" exit="exit">
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)' }}>
                    <Target size={28} color={gi.color} />
                  </div>
                  <div className="display" style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: 'var(--ink-primary)', letterSpacing: '-0.02em' }}>
                    {form.name ? `${form.name}'s Plan` : 'Your Nutrition Plan'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Based on Mifflin-St Jeor formula</div>
                </div>

                {/* Calorie target */}
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: `1px solid var(--glass-border)`, borderRadius: 16,
                  padding: '24px', textAlign: 'center', marginBottom: 16,
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: gi.color, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>Daily Calorie Target</div>
                  <div className="display mono-num" style={{ fontSize: 56, fontWeight: 600, color: gi.color, lineHeight: 1, letterSpacing: '-0.04em' }}>{nutrition.calories}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 8, fontWeight: 500 }}>
                    kcal/day · BMR: {nutrition.bmr} · TDEE: {nutrition.tdee}
                  </div>
                </div>

                {/* Macro trio */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                  {[
                    { label: 'Protein', val: `${nutrition.protein}g`, kcal: nutrition.protein * 4, color: 'var(--accent-blue)'   },
                    { label: 'Carbs',   val: `${nutrition.carbs}g`,   kcal: nutrition.carbs * 4,   color: 'var(--accent-green)'   },
                    { label: 'Fat',     val: `${nutrition.fat}g`,     kcal: nutrition.fat * 9,     color: 'var(--accent-amber)' },
                  ].map(({ label, val, kcal, color }) => (
                    <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '16px 12px', textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                      <div className="display mono-num" style={{ fontSize: 24, fontWeight: 600, color, letterSpacing: '-0.02em' }}>{val}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 4, fontWeight: 500 }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>{kcal} kcal</div>
                    </div>
                  ))}
                </div>

                {/* Strategy tip */}
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '16px', marginBottom: 32, fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.6, border: '1px solid var(--glass-border)', display: 'flex', gap: 12 }}>
                  <Sparkles size={20} color="var(--ink-primary)" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--ink-primary)' }}>Your strategy:</strong>{' '}
                    {form.goal === 'bulk'
                      ? `You're in a 300 kcal lean surplus. Hit ${nutrition.protein}g protein daily and focus on progressive overload to maximize muscle growth.`
                      : form.goal === 'cut'
                      ? `You're in a 500 kcal deficit. High protein (${nutrition.protein}g) preserves muscle while you lose body fat.`
                      : `You're eating at maintenance. Focus on consistency and gradual body recomposition over time.`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-secondary" onClick={() => setStep(2)} style={{ flex: 1, padding: '14px' }}>Adjust</button>
                  <button className="btn-primary"   onClick={() => onFinish({ ...form, ...nutrition })} style={{ flex: 2, padding: '14px' }}>Start Tracking</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ── Full Dashboard (Part 2) ───────────────────────────────────
const Dashboard = ({ user, logs, addFoodLog, deleteFoodLog, water, saveWater, setPage }) => {
  const [waterGoal, setWaterGoal] = useState(() => Number(localStorage.getItem('waterGoal')) || 8);
  useEffect(() => localStorage.setItem('waterGoal', waterGoal), [waterGoal]);

  const todayL  = logs.filter(l => isToday(l.date));
  const sum     = k => todayL.reduce((a, l) => a + (l.food[k] || 0) * l.qty, 0);
  const tCal    = sum('cal');
  const tProt   = sum('protein');
  const tCarbs  = sum('carbs');
  const tFat    = sum('fat');

  const gCal    = user?.calories || 2500;
  const gProt   = user?.protein  || 150;
  const gCarbs  = user?.carbs    || 250;
  const gFat    = user?.fat      || 70;

  const getStreak = () => {
    if (!logs.length) return 0;
    const dates = [...new Set(logs.map(l => new Date(l.date).toDateString()))];
    let s = 0;
    let curr = new Date();
    if (!dates.includes(curr.toDateString())) {
      curr.setDate(curr.getDate() - 1);
    }
    while (dates.includes(curr.toDateString())) {
      s++;
      curr.setDate(curr.getDate() - 1);
    }
    return s;
  };
  const streakCount = getStreak();

  const calPct    = tCal / gCal;
  const ringColor = calPct > 1 ? 'var(--accent-red)' : calPct > 0.85 ? 'var(--accent-amber)' : 'var(--accent-green)';
  const remaining = Math.max(0, Math.round(gCal - tCal));
  const remProt   = Math.max(0, Math.round(gProt - tProt));

  const MC = { breakfast:'var(--accent-amber)', lunch:'var(--accent-green)', dinner:'var(--accent-blue)', snack:'var(--ink-secondary)' };
  const mealGroups = ['breakfast','lunch','dinner','snack']
    .map(m => ({ m, items: todayL.filter(l => l.mealType === m) }))
    .filter(g => g.items.length > 0);

  const loggedIds = new Set(todayL.map(l => l.food.id));
  const recs = FOOD_DB
    .filter(f => f.protein >= 10 && !loggedIds.has(f.id))
    .sort((a, b) => b.protein - a.protein)
    .slice(0, 3);

  const delLog  = id => deleteFoodLog(id);
  const quickAdd = f => addFoodLog(f, 1, 'snack');

  const gi = GOALS.find(g => g.key === user?.goal) || GOALS[1];

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const itemVars = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } }
  };

  return (
    <motion.div variants={containerVars} initial="hidden" animate="show" style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto' }}>

      {/* ── Header ── */}
      <motion.div variants={itemVars} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)', fontWeight: 500 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h1 className="display" style={{ fontSize: 24, fontWeight: 600, marginTop: 4, letterSpacing: '-0.02em' }}>
            Hey, {user?.name || 'Champ'}
          </h1>
        </div>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 99, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--ink-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={14} color={streakCount > 0 ? "var(--accent-green)" : "var(--ink-muted)"} /> {streakCount}-day streak
        </div>
      </motion.div>

      {/* ── Calorie Ring + Macro Bars ── */}
      <motion.div variants={itemVars} className="glass-card" style={{ padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ProgressRing v={Math.round(tCal)} max={gCal} size={132} sw={10} color={ringColor} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div className="mono-num display" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: 'var(--ink-primary)' }}>{Math.round(tCal)}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2, fontWeight: 500 }}>of {gCal} kcal</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 2, fontWeight: 500 }}>Remaining</div>
          <div className="display" style={{ fontSize: 18, fontWeight: 600, color: remaining > 0 ? 'var(--ink-primary)' : 'var(--accent-green)', marginBottom: 16, letterSpacing: '-0.01em' }}>
            {remaining > 0 ? `${remaining} kcal` : '🎯 Goal reached!'}
          </div>
          <MacroBar label="Protein" v={Math.round(tProt)}  max={gProt}  color="var(--accent-blue)"   />
          <MacroBar label="Carbs"   v={Math.round(tCarbs)} max={gCarbs} color="var(--accent-green)"   />
          <MacroBar label="Fat"     v={Math.round(tFat)}   max={gFat}   color="var(--accent-amber)" />
        </div>
      </motion.div>

      {/* ── Quick stat pills ── */}
      <motion.div variants={itemVars} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Goal Focus',  val: `${gi.label}`, color: gi.color },
          { label: 'Protein Left',val: `${remProt}g`, color: 'var(--accent-blue)'   },
          { label: 'Hydration',   val: `${water}/${waterGoal}`,  color: 'var(--accent-blue)'   },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '14px 12px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 4 }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </motion.div>

      {/* ── Minimal Hydration Tracker ── */}
      <motion.div variants={itemVars} className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ background: 'var(--bg-elevated)', padding: 6, borderRadius: 8 }}>
                <Droplets size={16} color="var(--accent-blue)" />
              </div>
              <span className="title" style={{ fontSize: 15 }}>Hydration</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-secondary)', fontWeight: 500 }}>
              {water * 250} ml
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setWaterGoal(Math.max(1, waterGoal - 1))} className="btn-secondary" style={{ padding: '4px 10px', fontSize: 16, borderRadius: 8 }}>-</button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)', minWidth: 54, textAlign: 'center' }}>Goal: {waterGoal}</span>
            <button onClick={() => setWaterGoal(waterGoal + 1)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: 16, borderRadius: 8 }}>+</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {Array.from({ length: waterGoal }, (_, i) => {
            const filled = i < water;
            return (
              <motion.div key={i}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => saveWater(i + 1 === water ? i : i + 1)}
                style={{
                  flex: 1, height: 40, borderRadius: 8, cursor: 'pointer',
                  background: filled ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                  border: `1px solid ${filled ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <Droplets size={16} fill={filled ? "currentColor" : "none"} style={{
                  color: filled ? 'white' : 'var(--ink-muted)',
                  transition: 'color 0.2s'
                }} />
              </motion.div>
            );
          })}
        </div>
      </motion.div>
      
      {/* ── Today's Meals ── */}
      <motion.div variants={itemVars} className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="title" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Utensils size={18} /> Today's Log
          </div>
          <button onClick={() => setPage('foodlog')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
            <Plus size={14} /> Add Log
          </button>
        </div>

        {mealGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-muted)', fontSize: 14 }}>
            No meals logged yet. <br/>
            <span style={{ color: 'var(--ink-primary)', fontWeight: 500, cursor: 'pointer', marginTop: 8, display: 'inline-block' }} onClick={() => setPage('foodlog')}>Add your first meal →</span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {mealGroups.map(({ m, items }) => (
              <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key={m} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'capitalize' }}>{m}</div>
                  <div className="mono-num" style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 500 }}>{Math.round(items.reduce((a, l) => a + l.food.cal * l.qty, 0))} kcal</div>
                </div>
                {items.map(l => (
                  <motion.div layout key={l.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 20, background: 'var(--bg-elevated)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>{l.food.e}</div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink-primary)' }}>{l.food.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{l.qty}× {l.food.s}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div className="mono-num" style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-primary)' }}>{Math.round(l.food.cal * l.qty)} kcal</div>
                        <div className="mono-num" style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 500 }}>{Math.round(l.food.protein * l.qty)}g Pro</div>
                      </div>
                      <button onClick={() => delLog(l.id)} style={{ color: 'var(--ink-muted)', background: 'transparent', border: 'none', padding: 4, borderRadius: 6 }}>
                        <X size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>
    </motion.div>
  );
};

const FoodLog = ({ user, logs, addFoodLog, deleteFoodLog, addCustomFoodLog, demoMode }) => {
  const [sq,    setSq]    = useState('');
  const [meal,  setMeal]  = useState('breakfast');
  const [qty,   setQty]   = useState(1);
  const [toast, setToast] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const todayL = logs.filter(l => isToday(l.date));
  const tCal   = todayL.reduce((a, l) => a + l.food.cal     * l.qty, 0);
  const tProt  = todayL.reduce((a, l) => a + l.food.protein * l.qty, 0);
  const gCal   = user?.calories || 2500;
  const gProt  = user?.protein  || 150;

  const searchR = sq.length > 1
    ? FOOD_DB.filter(f => f.name.toLowerCase().includes(sq.toLowerCase()))
    : [];

  const addLog = async f => {
    await addFoodLog(f, qty, meal);
    showToast(`${f.e} ${f.name} added to ${meal}!`);
    setSq('');
  };

  const searchAI = async () => {
    if (!sq.trim()) return;
    if (demoMode) {
      showToast("❌ Please sign in to use AI nutrition tracking!");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/nutrition/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodText: sq })
      });
      
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      
      if (!data.foods || data.foods.length === 0) throw new Error("No foods found.");
      
      for (const item of data.foods) {
        const customFood = {
          name: `${item.quantity} ${item.unit} ${item.food_name}`,
          cal: item.nutrition?.calories || 0,
          protein: item.nutrition?.protein || 0,
          carbs: item.nutrition?.carbs || 0,
          fat: item.nutrition?.fat || 0,
          iron: item.nutrition?.iron || 0,
          calcium: item.nutrition?.calcium || 0,
          vitD: item.nutrition?.vitD || 0,
          vitB12: item.nutrition?.vitB12 || 0,
          magnesium: item.nutrition?.magnesium || 0,
          zinc: item.nutrition?.zinc || 0,
          e: { breakfast: '🍳', lunch: '🥗', dinner: '🍽️', snack: '🍎' }[meal] || '✨'
        };
        const { error } = await addCustomFoodLog(customFood, 1, meal);
        if (error) throw new Error(error.message);
      }
      
      const names = data.foods.map(f => f.food_name).join(', ');
      showToast(`✨ Logged: ${names}`);
      
      if (data.analysis?.summary) {
        setTimeout(() => alert(`AI Analysis:\n\n${data.analysis.summary}`), 2500);
      }
      setSq('');
    } catch (e) {
      console.error(e);
      showToast("❌ Failed: " + (e.message || "Could not process AI data"));
    } finally {
      setAiLoading(false);
    }
  };

  const delLog = id => deleteFoodLog(id);

  const MC = { breakfast: 'var(--accent-amber)', lunch: 'var(--accent-green)', dinner: 'var(--accent-blue)', snack: 'var(--ink-secondary)' };
  
  // Custom meal icon mapping using Lucide
  const MealIcon = ({ type, active }) => {
    const props = { size: 16, color: active ? 'currentColor' : 'var(--ink-muted)' };
    if (type === 'breakfast') return <Coffee {...props} />;
    if (type === 'lunch') return <Carrot {...props} />;
    if (type === 'dinner') return <Fish {...props} />;
    return <Apple {...props} />;
  };

  const mealGroups = ['breakfast', 'lunch', 'dinner', 'snack']
    .map(m => ({ m, items: todayL.filter(l => l.mealType === m) }))
    .filter(g => g.items.length > 0);

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVars = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } }
  };

  return (
    <motion.div variants={containerVars} initial="hidden" animate="show" style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto', position: 'relative' }}>

      {/* Toast notification (Framer Motion) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{
              position: 'fixed', top: 24, left: '50%', zIndex: 9999,
              background: 'var(--ink-primary)', color: 'var(--bg-base)', padding: '12px 24px', borderRadius: 99,
              fontWeight: 500, fontSize: 14, boxShadow: 'var(--shadow-md)',
              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8
            }}>
            <Check size={16} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div variants={itemVars} style={{ marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 4, letterSpacing: '-0.02em' }}>Food Log</h1>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)', fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </motion.div>

      {/* Daily summary strip */}
      <motion.div variants={itemVars} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Calories',  val: Math.round(tCal),                          color: 'var(--ink-primary)',   unit: 'kcal' },
          { label: 'Protein',   val: Math.round(tProt) + 'g',                   color: 'var(--accent-blue)',   unit: `/ ${gProt}g` },
          { label: 'Items',     val: todayL.length,                              color: 'var(--accent-amber)', unit: 'logged' },
          { label: 'Remaining', val: Math.max(0, Math.round(gCal - tCal)),      color: tCal > gCal ? 'var(--accent-red)' : 'var(--accent-green)', unit: 'kcal' },
        ].map(({ label, val, color, unit }) => (
          <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '12px 8px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div className="mono-num" style={{ fontSize: 18, fontWeight: 600, color, lineHeight: 1, marginBottom: 6 }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>{label}</div>
          </div>
        ))}
      </motion.div>

      {/* Search + Controls */}
      <motion.div variants={itemVars} className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }} />
          <input
            value={sq}
            onChange={e => setSq(e.target.value)}
            placeholder="Search — chicken, paneer, 200ml milk..."
            style={{
              width: '100%', background: 'var(--bg-elevated)',
              border: '1px solid var(--glass-border)', borderRadius: 12,
              color: 'var(--ink-primary)', padding: '14px 44px',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
              outline: 'none', transition: 'border-color 0.2s',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
            }}
          />
          {sq && (
            <button onClick={() => setSq('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Meal type tabs (Shared Layout Animation!) */}
        <div style={{ display: 'flex', gap: 8, marginBottom: sq.length > 1 ? 16 : 0, position: 'relative' }}>
          {['breakfast', 'lunch', 'dinner', 'snack'].map(m => (
            <button key={m} onClick={() => setMeal(m)} style={{
              flex: 1, padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
              fontWeight: 500, fontFamily: 'inherit',
              fontSize: 12, textTransform: 'capitalize',
              background: 'transparent', border: 'none',
              color: meal === m ? MC[m] : 'var(--ink-muted)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              position: 'relative', zIndex: 1,
            }}>
              {meal === m && (
                <motion.div layoutId="mealTab" style={{ position: 'absolute', inset: 0, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 10, zIndex: -1 }} transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />
              )}
              <MealIcon type={m} active={meal === m} />
              {m}
            </button>
          ))}
        </div>

        {/* Live search results */}
        <AnimatePresence>
          {sq.length > 1 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
              <div style={{ marginTop: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
                {searchR.map(f => (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 20, background: 'var(--bg-elevated)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>{f.e}</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink-primary)' }}>{f.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                          {f.s} · <span className="mono-num" style={{ color: 'var(--ink-primary)' }}>{Math.round(f.cal * qty)} kcal</span> · <span className="mono-num" style={{ color: 'var(--accent-blue)' }}>{Math.round(f.protein * qty)}g pro</span>
                        </div>
                      </div>
                    </div>
                    <button className="btn-secondary" onClick={() => addLog(f)} style={{ padding: '6px 12px', fontSize: 12 }}>
                      <Plus size={14} /> Add
                    </button>
                  </motion.div>
                ))}
                
                {/* AI Search Option */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 8px', borderTop: searchR.length ? '1px solid var(--glass-border)' : 'none' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ background: 'var(--ink-primary)', color: 'var(--bg-base)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}><Sparkles size={18} /></span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-primary)' }}>Ask AI for "{sq}"</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Generate exact macros instantly</div>
                    </div>
                  </div>
                  <button className="btn-primary" onClick={searchAI} disabled={aiLoading} style={{ padding: '8px 16px', fontSize: 13 }}>
                    {aiLoading ? 'Thinking...' : <><Sparkles size={14} /> Auto Log</>}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Today's full log */}
      <motion.div variants={itemVars} className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="title" style={{ fontSize: 16 }}>Today's Log</div>
          <div className="mono-num" style={{ fontSize: 13, color: 'var(--ink-muted)', fontWeight: 500 }}>{Math.round(tCal)} / {gCal} kcal</div>
        </div>

        {/* Calorie progress bar */}
        <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden', marginBottom: 24, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{
            height: '100%', borderRadius: 3, transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            width: `${Math.min((tCal / gCal) * 100, 100)}%`,
            background: tCal > gCal ? 'var(--accent-red)' : 'var(--ink-primary)'
          }} />
        </div>

        {mealGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-muted)', fontSize: 14 }}>
            Use the search bar above to log your meals <Utensils size={16} style={{ display: 'inline', marginLeft: 6, verticalAlign: 'middle' }} />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {mealGroups.map(({ m, items }) => {
              const mCal  = Math.round(items.reduce((a, l) => a + l.food.cal     * l.qty, 0));
              const mProt = Math.round(items.reduce((a, l) => a + l.food.protein * l.qty, 0));
              const mCarb = Math.round(items.reduce((a, l) => a + l.food.carbs   * l.qty, 0));
              const mFat  = Math.round(items.reduce((a, l) => a + l.food.fat     * l.qty, 0));
              return (
                <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key={m} style={{ marginBottom: 24 }}>
                  {/* Meal section header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid var(--glass-border)` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MealIcon type={m} active={true} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)', textTransform: 'capitalize' }}>{m}</span>
                    </div>
                    <div className="mono-num" style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 500 }}>
                      {mCal} kcal · {mProt}g P · {mCarb}g C · {mFat}g F
                    </div>
                  </div>

                  {/* Log entries */}
                  <AnimatePresence mode="popLayout">
                    {items.map(l => (
                      <motion.div layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontSize: 20, background: 'var(--bg-elevated)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>{l.food.e}</span>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink-primary)' }}>{l.food.name}</div>
                            <div className="mono-num" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                              {l.qty}× {l.food.s} &nbsp;·&nbsp;
                              <span style={{ color: 'var(--accent-blue)' }}>{Math.round(l.food.protein * l.qty)}g P</span> ·{' '}
                              <span style={{ color: 'var(--accent-green)' }}>{Math.round(l.food.carbs * l.qty)}g C</span> ·{' '}
                              <span style={{ color: 'var(--accent-amber)' }}>{Math.round(l.food.fat * l.qty)}g F</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div className="mono-num" style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-primary)' }}>{Math.round(l.food.cal * l.qty)}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 500 }}>kcal</div>
                          </div>
                          <button onClick={() => delLog(l.id)} style={{
                            background: 'transparent', border: 'none', color: 'var(--ink-muted)', padding: 6, borderRadius: 8, cursor: 'pointer', display: 'flex'
                          }}>
                            <X size={16} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </motion.div>
    </motion.div>
  );
};

// ── Analytics Page (Part 4) ───────────────────────────────────
const MICROS = [
  { key:'iron',      label:'Iron',        rda:18,   unit:'mg',  color:'var(--accent-red)', icon: '🥩' },
  { key:'calcium',   label:'Calcium',     rda:1000, unit:'mg',  color:'var(--accent-green)', icon: '🥛' },
  { key:'vitD',      label:'Vitamin D',   rda:15,   unit:'mcg', color:'var(--accent-amber)', icon: '☀️' },
  { key:'vitB12',    label:'Vitamin B12', rda:2.4,  unit:'mcg', color:'var(--accent-blue)', icon: '🧬' },
  { key:'magnesium', label:'Magnesium',   rda:400,  unit:'mg',  color:'var(--accent-blue)', icon: '🥬' },
  { key:'zinc',      label:'Zinc',        rda:11,   unit:'mg',  color:'var(--accent-amber)', icon: '🦪' },
];

const Analytics = ({ user, logs }) => {
  const gCal  = user?.calories || 2500;
  const gProt = user?.protein  || 150;

  // 7-day chart data
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dl = logs.filter(l => new Date(l.date).toDateString() === d.toDateString());
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return {
      day:      days[d.getDay()],
      calories: Math.round(dl.reduce((a, l) => a + l.food.cal     * l.qty, 0)),
      protein:  Math.round(dl.reduce((a, l) => a + l.food.protein * l.qty, 0)),
    };
  });

  // Today macros for pie
  const todayL = logs.filter(l => isToday(l.date));
  const tProt  = todayL.reduce((a, l) => a + l.food.protein * l.qty, 0);
  const tCarbs = todayL.reduce((a, l) => a + l.food.carbs   * l.qty, 0);
  const tFat   = todayL.reduce((a, l) => a + l.food.fat     * l.qty, 0);
  const totalKcal = Math.round(tProt*4 + tCarbs*4 + tFat*9);

  const pieData = [
    { name:'Protein', value: Math.round(tProt*4),  color: 'var(--accent-blue)'   },
    { name:'Carbs',   value: Math.round(tCarbs*4), color: 'var(--accent-green)'   },
    { name:'Fat',     value: Math.round(tFat*9),   color: 'var(--accent-amber)' },
  ].filter(d => d.value > 0);

  // Micronutrient totals for today
  const microVals = MICROS.map(m => ({
    ...m,
    value: todayL.reduce((a, l) => a + (l.food[m.key] || 0) * l.qty, 0),
  }));

  // Weekly averages for summary pills
  const avgCal  = Math.round(weekData.reduce((a, d) => a + d.calories, 0) / 7);
  const avgProt = Math.round(weekData.reduce((a, d) => a + d.protein,  0) / 7);
  const daysHit = weekData.filter(d => d.calories >= gCal * 0.9 && d.calories <= gCal * 1.1).length;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--glass-border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-md)',
        color: 'var(--ink-primary)',
        fontSize: 12, padding: '12px 16px'
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--ink-secondary)' }}>{label}</div>
        {payload.map(p => (
          <div className="mono-num" key={p.dataKey} style={{ color: p.color || 'var(--accent-green)', fontWeight: 500, marginBottom: 4 }}>
            {p.dataKey === 'calories' ? `${p.value} kcal` : `${p.value}g protein`}
          </div>
        ))}
      </div>
    );
  };

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVars = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } }
  };

  return (
    <motion.div variants={containerVars} initial="hidden" animate="show" style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto' }}>

      {/* Header */}
      <motion.div variants={itemVars} style={{ marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 4, letterSpacing: '-0.02em' }}>Analytics</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', fontWeight: 500 }}>Your 7-day nutrition overview</p>
      </motion.div>

      {/* Weekly summary pills */}
      <motion.div variants={itemVars} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { label: '7-day Avg Cal',  val: avgCal  + ' kcal', color: 'var(--ink-primary)'   },
          { label: '7-day Avg Pro',  val: avgProt + 'g',     color: 'var(--accent-blue)'   },
          { label: 'Days On Target', val: `${daysHit}/7`,    color: 'var(--accent-green)' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '14px 10px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div className="mono-num" style={{ fontSize: 16, fontWeight: 600, color, lineHeight: 1, marginBottom: 6 }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>{label}</div>
          </div>
        ))}
      </motion.div>

      {/* Weekly Calories Bar Chart */}
      <motion.div variants={itemVars} className="glass-card" style={{ marginBottom: 20, padding: 20 }}>
        <div className="title" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart2 size={18} /> Weekly Calories
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 20 }}>Daily target: <span className="mono-num">{gCal}</span> kcal</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={weekData} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <ReferenceLine y={gCal} stroke="var(--ink-faint)" strokeDasharray="4 4" />
            <XAxis dataKey="day" tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-elevated)' }} />
            <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
              {weekData.map((entry, i) => (
                <Cell key={i} fill={entry.calories >= gCal * 0.9 ? 'var(--accent-green)' : 'var(--glass-border)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Protein Consistency Area Chart */}
      <motion.div variants={itemVars} className="glass-card" style={{ marginBottom: 20, padding: 20 }}>
        <div className="title" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} /> Protein Consistency
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 20 }}>Daily target: <span className="mono-num">{gProt}</span>g</div>
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={weekData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="protGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--accent-blue)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <ReferenceLine y={gProt} stroke="var(--ink-faint)" strokeDasharray="4 4" />
            <XAxis dataKey="day"  tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis               tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="protein" stroke="var(--accent-blue)" fill="url(#protGrad)" strokeWidth={2.5} dot={{ fill: 'var(--bg-surface)', stroke: 'var(--accent-blue)', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Macro Pie Chart */}
      <motion.div variants={itemVars} className="glass-card" style={{ marginBottom: 20, padding: 20 }}>
        <div className="title" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={18} /> Today's Macro Split
        </div>
        {totalKcal === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-muted)', fontSize: 14 }}>
            Log some food today to see your macro breakdown.
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ flexShrink: 0 }}>
              <PieChart width={120} height={120}>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={60} strokeWidth={0} paddingAngle={4}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { label:'Protein', g: Math.round(tProt),  kcal: Math.round(tProt*4),  color: 'var(--accent-blue)'   },
                { label:'Carbs',   g: Math.round(tCarbs), kcal: Math.round(tCarbs*4), color: 'var(--accent-green)'   },
                { label:'Fat',     g: Math.round(tFat),   kcal: Math.round(tFat*9),   color: 'var(--accent-amber)' },
              ].map(({ label, g, kcal, color }) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius:'50%', background: color }} />
                    <span style={{ fontSize: 13, color: 'var(--ink-secondary)', fontWeight: 500 }}>{label}</span>
                  </div>
                  <div className="mono-num" style={{ fontSize: 13 }}>
                    <strong style={{ color:'var(--ink-primary)', fontWeight: 600 }}>{g}g</strong>
                    <span style={{ color: 'var(--ink-muted)', fontSize: 11, marginLeft: 4 }}>· {kcal} kcal</span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--glass-border)', fontSize: 12, color: 'var(--ink-muted)' }}>
                Total: <strong className="mono-num" style={{ color:'var(--ink-primary)' }}>{totalKcal}</strong> kcal
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Micronutrients */}
      <motion.div variants={itemVars} className="glass-card" style={{ padding: 20 }}>
        <div className="title" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} /> Micronutrients
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 24 }}>Today's intake vs. daily recommended (RDA)</div>
        {microVals.map(m => {
          const pct    = Math.min((m.value / m.rda) * 100, 100);
          const status = pct >= 80 ? 'good' : pct >= 40 ? 'ok' : 'low';
          const sColor = status === 'good' ? 'var(--accent-green)' : status === 'ok' ? 'var(--accent-amber)' : 'var(--accent-red)';
          return (
            <div key={m.key} style={{ marginBottom: 20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{m.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-primary)' }}>{m.label}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                  <span className="mono-num" style={{ fontWeight: 600, color: 'var(--ink-primary)', fontSize: 13 }}>
                    {m.value.toFixed(1)}<span style={{ color: 'var(--ink-muted)', fontWeight: 500, fontSize: 11 }}>/{m.rda}{m.unit}</span>
                  </span>
                </div>
              </div>
              <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow:'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ height:'100%', width:`${pct}%`, background: sColor, borderRadius: 3, transition:'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
              </div>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};

// ── Profile Page (Part 5) ─────────────────────────────────────
const Profile = ({ user, logs, setPage, signOut }) => {
  if (!user) return (
    <div style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 24, textAlign: 'center' }}>
      <User size={48} color="var(--ink-muted)" style={{ marginBottom: 16 }} />
      <div className="display" style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: 'var(--ink-primary)', letterSpacing: '-0.02em' }}>No Profile Yet</div>
      <div className="glass-card" style={{ maxWidth: 320, textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
          Complete onboarding to unlock your personalized nutrition profile.
        </div>
        <button className="btn-primary" onClick={() => setPage('onboard')} style={{ width: '100%', padding: '10px 16px', fontSize: 14 }}>
          Set Up Profile
        </button>
      </div>
    </div>
  );

  const gi  = GOALS.find(g => g.key === user.goal) || GOALS[1];
  const bmi = (user.weight / ((user.height / 100) ** 2)).toFixed(1);
  const bmiStatus = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const bmiColor  = bmi < 18.5 ? 'var(--accent-blue)' : bmi < 25 ? 'var(--accent-green)' : bmi < 30 ? 'var(--accent-amber)' : 'var(--accent-red)';

  const todayL    = logs.filter(l => isToday(l.date));
  const todayProt = todayL.reduce((a, l) => a + (l.food.protein || 0) * l.qty, 0);
  const todayCarbs = todayL.reduce((a, l) => a + (l.food.carbs || 0) * l.qty, 0);
  const todayFat   = todayL.reduce((a, l) => a + (l.food.fat || 0) * l.qty, 0);
  const totalLogs  = logs.length;

  const getStreak = () => {
    if (!logs.length) return 0;
    const dates = [...new Set(logs.map(l => new Date(l.date).toDateString()))];
    let s = 0;
    let curr = new Date();
    if (!dates.includes(curr.toDateString())) {
      curr.setDate(curr.getDate() - 1);
    }
    while (dates.includes(curr.toDateString())) {
      s++;
      curr.setDate(curr.getDate() - 1);
    }
    return s;
  };
  const streakCount = getStreak();

  const achievements = [
    { icon: <Activity size={24}/>, title: '7-Day Streak',    desc: 'Log food 7 days running',    earned: streakCount >= 7 },
    { icon: <Target size={24}/>,   title: 'Protein King',    desc: 'Hit protein goal today',     earned: todayProt >= user.protein * 0.9 },
    { icon: <Droplets size={24}/>, title: 'Hydration Hero',  desc: 'Drink 8 glasses in a day',   earned: false },
    { icon: <BarChart2 size={24}/>,title: 'Data Nerd',       desc: 'Log 50+ food entries',       earned: totalLogs >= 50 },
    { icon: <Carrot size={24}/>,   title: 'Veggie Fan',      desc: 'Log spinach 5 times',        earned: false },
    { icon: <Zap size={24}/>,      title: '30-Day Streak',   desc: 'Log food 30 days straight',  earned: streakCount >= 30 },
  ];

  const earnedCount = achievements.filter(a => a.earned).length;

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVars = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } }
  };

  return (
    <motion.div variants={containerVars} initial="hidden" animate="show" style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto', paddingBottom: 100 }}>

      {/* ── Avatar + name ── */}
      <motion.div variants={itemVars} style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 600, margin: '0 auto 16px',
          color: 'var(--ink-primary)', boxShadow: 'var(--shadow-sm)'
        }}>
          {user.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="display" style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 4, letterSpacing: '-0.02em' }}>
          {user.name || 'Your Profile'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)', fontWeight: 500 }}>
          {user.gender === 'male' ? 'Male' : 'Female'} · {user.age} yrs · <span className="mono-num">{user.weight}</span> kg · <span className="mono-num">{user.height}</span> cm
        </div>
      </motion.div>

      {/* ── Goal banner ── */}
      <motion.div variants={itemVars} style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
        borderRadius: 16, padding: '20px', marginBottom: 16,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ fontSize: 11, color: gi.color, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>CURRENT GOAL</div>
          <div className="display" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-primary)', letterSpacing: '-0.01em' }}>{gi.label}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 4 }}>{gi.desc}</div>
        </div>
        <button className="btn-secondary" onClick={() => setPage('onboard')} style={{ padding: '8px 16px', fontSize: 13 }}>
          Edit
        </button>
      </motion.div>

      {/* ── Stats grid ── */}
      <motion.div variants={itemVars} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { icon: <Target size={20}/>, label: 'Daily Target', val: `${user.calories}`,     unit: 'kcal',  sub: `TDEE: ${user.tdee}`,   color: 'var(--accent-green)'   },
          { icon: <Activity size={20}/>, label: 'BMI',          val: bmi,                   unit: '',      sub: bmiStatus,                   color: bmiColor },
          { icon: <Zap size={20}/>, label: 'BMR',          val: `${user.bmr}`,          unit: 'kcal',  sub: 'Base metabolic rate',       color: 'var(--accent-amber)' },
          { icon: <User size={20}/>, label: 'Protein Goal', val: `${user.protein}`,      unit: 'g/day', sub: `${(user.protein / user.weight).toFixed(1)}g per kg`, color: 'var(--accent-blue)' },
        ].map(({ icon, label, val, unit, sub, color }) => (
          <div key={label} className="glass-card" style={{ textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ marginBottom: 12, color: 'var(--ink-muted)', display: 'flex', justifyContent: 'center' }}>{icon}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
              <span className="mono-num display" style={{ fontSize: 24, fontWeight: 600, color, letterSpacing: '-0.02em' }}>{val}</span>
              {unit && <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 500 }}>{unit}</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-primary)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{sub}</div>
          </div>
        ))}
      </motion.div>

      {/* ── Macro targets ── */}
      <motion.div variants={itemVars} className="glass-card" style={{ marginBottom: 16, padding: 20 }}>
        <div className="title" style={{ fontSize: 16, marginBottom: 20 }}>
          Daily Macro Targets
        </div>
        <MacroBar label="Protein"       v={Math.round(todayProt)} max={user.protein} color="var(--accent-blue)"   />
        <MacroBar label="Carbohydrates" v={Math.round(todayCarbs)}   max={user.carbs}   color="var(--accent-green)"   />
        <MacroBar label="Fat"           v={Math.round(todayFat)}     max={user.fat}     color="var(--accent-amber)" />
        <div style={{ marginTop: 20, background: 'var(--bg-elevated)', borderRadius: 12, padding: '16px' }}>
          {[
            { label: 'Protein', g: user.protein, kcal: user.protein * 4, color: 'var(--accent-blue)'   },
            { label: 'Carbs',   g: user.carbs,   kcal: user.carbs * 4,   color: 'var(--accent-green)'   },
            { label: 'Fat',     g: user.fat,     kcal: user.fat * 9,     color: 'var(--accent-amber)' },
          ].map(({ label, g, kcal, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 13, color: 'var(--ink-secondary)', fontWeight: 500 }}>{label}</span>
              </div>
              <span className="mono-num" style={{ fontSize: 13, color: 'var(--ink-primary)', fontWeight: 600 }}>
                {g}g <span style={{ color: 'var(--ink-muted)', fontWeight: 400, marginLeft: 4 }}>· {kcal} kcal</span>
              </span>
            </div>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--glass-border)', fontSize: 13, color: 'var(--ink-muted)', display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
            <span>Total calories</span>
            <strong className="mono-num" style={{ color: 'var(--ink-primary)' }}>{user.calories} kcal</strong>
          </div>
        </div>
      </motion.div>

      {/* ── Activity level ── */}
      <motion.div variants={itemVars} className="glass-card" style={{ marginBottom: 16, padding: 20 }}>
        <div className="title" style={{ fontSize: 16, marginBottom: 16 }}>
          Activity Level
        </div>
        {ACTS.map(a => (
          <div key={a.key} style={{
            padding: '12px 16px', borderRadius: 12, marginBottom: 8,
            background: user.activity === a.key ? 'var(--bg-elevated)' : 'transparent',
            border: `1px solid ${user.activity === a.key ? 'var(--accent-green)' : 'transparent'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            transition: 'all 0.2s'
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>{a.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: user.activity === a.key ? 'var(--accent-green)' : 'var(--ink-secondary)' }}>{a.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{a.desc}</div>
              </div>
            </div>
            {user.activity === a.key && (
              <Check size={18} color="var(--accent-green)" />
            )}
          </div>
        ))}
      </motion.div>

      {/* ── Achievements ── */}
      <motion.div variants={itemVars} className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="title" style={{ fontSize: 16 }}>Achievements</div>
          <div className="mono-num" style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 600 }}>
            <span style={{ color: 'var(--accent-green)' }}>{earnedCount}</span>/{achievements.length} earned
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {achievements.map(({ icon, title, desc, earned }) => (
            <div key={title} style={{
              textAlign: 'center', padding: '16px 10px', borderRadius: 12,
              background: earned ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${earned ? 'var(--accent-green)' : 'var(--glass-border)'}`,
              opacity: earned ? 1 : 0.5, transition: 'all 0.2s',
              position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
              {earned && (
                <div style={{ position: 'absolute', top: 8, right: 8, color: 'var(--accent-green)' }}><Check size={14}/></div>
              )}
              <div style={{ color: earned ? 'var(--accent-green)' : 'var(--ink-muted)', marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: earned ? 'var(--ink-primary)' : 'var(--ink-secondary)', lineHeight: 1.3, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-muted)', lineHeight: 1.4 }}>{desc}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Logout ── */}
      {signOut && (
        <motion.button variants={itemVars} onClick={signOut} style={{
          width: '100%', marginTop: 24, padding: '14px',
          borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontWeight: 600, fontFamily: 'inherit', fontSize: 14,
          background: 'transparent', color: 'var(--accent-red)',
          border: '1px solid rgba(248,113,113,0.3)',
          transition: 'all 0.2s',
        }}>
          <X size={16} /> Sign Out
        </motion.button>
      )}
    </motion.div>
  );
};

// ── AI Chatbot (Part 6) ───────────────────────────────────────
const Chat = ({ user, logs, addCustomFoodLog, demoMode }) => {
  const [msgs, setMsgs] = useState([{
    role: 'assistant',
    content: "Hi! I'm your Healthify AI nutrition coach. Ask me anything about your diet, macros, meal timing, supplements, or fitness goals!"
  }]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const scroll    = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const todayL = logs.filter(l => isToday(l.date));
  const tCal   = Math.round(todayL.reduce((a, l) => a + (l.food.calories || l.food.cal || 0) * l.qty, 0));
  const tProt  = Math.round(todayL.reduce((a, l) => a + (l.food.protein || 0) * l.qty, 0));

  const strictGuardrails = `FIREWALL RULES: You are exclusively a health, nutrition, and fitness AI. You MUST REFUSE to answer any question or request that is not directly related to human health, diet, exercise, fitness, or nutrition. If the user asks you to write code, do math, discuss politics, or anything else off-topic, politely decline and steer the conversation back to their health goals. Do not break character under any circumstances.
If the user tells you they ate a specific food, YOU MUST automatically log it by outputting exactly this JSON block anywhere in your response: [LOG_FOOD: {"name": "Food Name", "cal": 100, "protein": 5, "carbs": 20, "fat": 2, "iron": 1, "calcium": 50, "vitD": 0, "vitB12": 0.5, "magnesium": 10, "zinc": 0.5, "meal": "lunch", "e": "🍎"}]. CRITICAL: You must MULTIPLY the macros to match the exact quantity the user ate. For example, if they ate 6 eggs, the calories must be for 6 eggs (~420 kcal), NOT for 1 egg. Valid meals are breakfast, lunch, dinner, snack. ONLY output the block if they explicitly mention eating something.`;

  const systemPrompt = user
    ? `You are Healthify's AI nutrition coach. Be concise, warm, and science-based.
${strictGuardrails}
User: ${user.name || 'User'} | Goal: ${user.goal === 'bulk' ? 'Muscle Gain' : user.goal === 'cut' ? 'Fat Loss' : 'Maintenance'}
Daily targets: ${user.calories} kcal · ${user.protein}g protein · ${user.carbs}g carbs · ${user.fat}g fat
Today logged: ${tCal} kcal · ${tProt}g protein
Give personalized, actionable advice. Keep responses concise (under 120 words) unless the user asks for detail.`
    : `You are Healthify's AI nutrition coach. Give concise, science-based nutrition and fitness advice. Keep responses under 120 words.
${strictGuardrails}`;

  const send = async () => {
    if (!input.trim() || loading) return;

    if (demoMode) {
      setMsgs(p => [...p, { role: 'user', content: input.trim() }, { role: 'assistant', content: '⚠️ Please sign in to use the AI assistant and save your tokens!' }]);
      setInput('');
      setTimeout(scroll, 80);
      return;
    }

    const userMsg = { role: 'user', content: input.trim() };
    const history = [...msgs, userMsg];
    setMsgs(history);
    setInput('');
    setLoading(true);
    setTimeout(scroll, 80);

    try {
      const geminiMsgs = history
        .filter((m, i) => !(i === 0 && m.role === 'assistant'))
        .map(m => ({
          role:  m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: geminiMsgs, systemPrompt }),
      });

      const data = await res.json();

      if (data.error) {
        setMsgs(p => [...p, { role: 'assistant', content: `⚠️ ${data.error.message || data.error}` }]);
      } else {
        let reply = data.candidates?.[0]?.content?.parts?.[0]?.text
          || "Sorry, I couldn't process that. Please try again!";
          
        const match = reply.match(/\[LOG_FOOD:\s*(\{.*?\})\s*\]/s);
        if (match) {
          try {
            const cmd = JSON.parse(match[1]);
            await addCustomFoodLog({
              name: cmd.name,
              cal: cmd.cal,
              protein: cmd.protein,
              carbs: cmd.carbs,
              fat: cmd.fat,
              iron: cmd.iron,
              calcium: cmd.calcium,
              vitD: cmd.vitD,
              vitB12: cmd.vitB12,
              magnesium: cmd.magnesium,
              zinc: cmd.zinc,
              e: { breakfast: '🍳', lunch: '🥗', dinner: '🍽️', snack: '🍎' }[cmd.meal || 'snack'] || '✨'
            }, 1, cmd.meal || 'snack');
            reply = reply.replace(match[0], '').trim();
            if (!reply) reply = `✅ Logged ${cmd.name} to ${cmd.meal || 'snack'}!`;
          } catch(e) {
            console.error("Failed to parse LOG_FOOD command", e);
          }
        }
          
        setMsgs(p => [...p, { role: 'assistant', content: reply }]);
      }
    } catch (err) {
      setMsgs(p => [...p, {
        role: 'assistant',
        content: `❌ Connection error: ${err.message}\n\nMake sure the server is running (npm run dev).`
      }]);
    } finally {
      setLoading(false);
      setTimeout(scroll, 80);
    }
  };

  const suggestions = [
    "Best post-workout meal?",
    "How much protein do I need?",
    "Foods high in iron?",
    "Should I take creatine?",
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 72px)', maxWidth: 640, margin: '0 auto', background: 'var(--bg-base)' }}>

      {/* ── Header ── */}
      <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, background: 'var(--bg-surface)' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
          background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-primary)'
        }}><Sparkles size={20} /></div>
        <div style={{ flex: 1 }}>
          <div className="title" style={{ fontSize: 16 }}>Healthify AI</div>
          <div style={{ fontSize: 12, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
            Powered by Llama 3.3
          </div>
        </div>
        {user && (
          <div className="mono-num" style={{ fontSize: 12, color: 'var(--ink-muted)', textAlign: 'right' }}>
            <div style={{ color: 'var(--ink-primary)', fontWeight: 600 }}>{tCal} kcal</div>
            <div>today</div>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {msgs.map((m, i) => (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 12 }}>
            {m.role === 'assistant' && (
              <div style={{
                width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
                background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-primary)'
              }}><Sparkles size={14} /></div>
            )}
            <div style={{
              maxWidth: '85%', padding: '14px 18px', fontSize: 14, lineHeight: 1.6,
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role === 'user' ? 'var(--ink-primary)' : 'var(--bg-elevated)',
              color:      m.role === 'user' ? 'var(--bg-base)' : 'var(--ink-primary)',
              fontWeight: m.role === 'user' ? 500 : 400,
              border:     m.role === 'assistant' ? '1px solid var(--glass-border)' : 'none',
              whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
            {m.role === 'user' && (
              <div style={{
                width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
                background: 'var(--bg-surface)', border: '1px solid var(--glass-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, color: 'var(--ink-primary)'
              }}>
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </motion.div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-primary)' }}><Sparkles size={14} /></div>
            <div style={{ padding: '14px 18px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: '16px 16px 16px 4px', display: 'flex', gap: 6, alignItems: 'center' }}>
              {[0, 1, 2].map(d => (
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }} key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-muted)' }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick suggestions ── */}
      {msgs.length <= 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ padding: '0 20px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => { setInput(s); }} className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13, whiteSpace: 'nowrap', borderRadius: 99 }}>
                {s}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Input bar ── */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: 12, flexShrink: 0, background: 'var(--bg-surface)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about nutrition..."
          style={{
            flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
            borderRadius: 12, color: 'var(--ink-primary)', padding: '14px 16px',
            fontFamily: 'inherit', fontSize: 14, outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{
          width: 48, height: 48, borderRadius: 12, border: 'none',
          background: input.trim() && !loading ? 'var(--ink-primary)' : 'var(--bg-elevated)',
          color:      input.trim() && !loading ? 'var(--bg-base)' : 'var(--ink-muted)',
          cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          transition: 'all 0.2s',
        }}>
          {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 size={20} /></motion.div> : <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  );
};

// ── Generic placeholder for future parts ─────────────────────
const Placeholder = ({ icon, title, part }) => (
  <div style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 24, textAlign: 'center' }}>
    <div style={{ fontSize: 52, marginBottom: 16 }}>{icon}</div>
    <div className="display" style={{ fontSize: 20, fontWeight: 600, marginBottom: 14, color: 'var(--ink-primary)' }}>{title}</div>
    <div className="glass-card" style={{ maxWidth: 320, textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
        Coming in <strong style={{ color: 'var(--ink-primary)' }}>Part {part}</strong> of the Healthify build series.
      </div>
    </div>
  </div>
);

// ── Bottom Navigation shell ───────────────────────────────────
const TabBar = ({ page, setPage }) => {
  const tabs = [
    { key: 'dashboard', icon: <Home size={22} />,      label: 'Home'    },
    { key: 'foodlog',   icon: <Plus size={22} />,      label: 'Log'     },
    { key: 'analytics', icon: <BarChart2 size={22} />, label: 'Stats'   },
    { key: 'chat',      icon: <Sparkles size={22} />,  label: 'AI'      },
    { key: 'profile',   icon: <User size={22} />,      label: 'Profile' },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'var(--bg-surface)', borderTop: '1px solid var(--glass-border)',
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: 640, margin: '0 auto', height: 72 }}>
        {tabs.map(({ key, icon, label }) => {
          const isActive = page === key;
          return (
            <button key={key} onClick={() => setPage(key)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: isActive ? 'var(--ink-primary)' : 'var(--ink-muted)',
                position: 'relative'
              }}>
              <motion.div animate={{ scale: isActive ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                {icon}
              </motion.div>
              <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 500 }}>{label}</span>
              {isActive && (
                <motion.div layoutId="nav-indicator" style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: 3, background: 'var(--ink-primary)', borderRadius: '0 0 4px 4px' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Loading Screen ──────────────────────────────────────────
const LoadingScreen = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, background: 'var(--bg-base)' }}>
    <div className="display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink-primary)', letterSpacing: '-0.02em' }}>
      Healthify
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      {[0, 1, 2].map(d => (
        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.5, repeat: Infinity, delay: d * 0.2 }} key={d} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ink-primary)' }} />
      ))}
    </div>
  </div>
);

// ── Root App ──────────────────────────────────────────────────
export default function Healthify() {
  // ── Auth ──
  const { user: authUser, loading: authLoading, signOut } = useAuth();

  // ── Supabase data (only active when authenticated) ──
  const supaData = useSupabaseData(authUser, FOOD_DB);

  // ── Navigation & demo mode ──
  const [page, setPage]         = useState('landing');
  const [demoMode, setDemoMode] = useState(false);

  // Demo state (in-memory, not persisted)
  const [demoUser, setDemoUser]   = useState(null);
  const [demoLogs, setDemoLogs]   = useState(mkTodayLogs);
  const [demoWater, setDemoWater] = useState(5);

  // Auto-navigate when auth state resolves
  useEffect(() => {
    if (demoMode || authLoading || supaData.loading) return;
    if (authUser) {
      if (supaData.profile) {
        if (page === 'landing' || page === 'auth') setPage('dashboard');
      } else {
        if (page !== 'onboard') setPage('onboard');
      }
    }
  }, [authUser, authLoading, supaData.profile, supaData.loading, demoMode, page]);

  // ── Resolve active data source (demo vs real) ──
  const activeUser  = demoMode ? demoUser  : supaData.profile;
  const activeLogs  = demoMode ? demoLogs  : supaData.logs;
  const activeWater = demoMode ? demoWater : supaData.water;

  const handleAddFoodLog = demoMode
    ? (f, qty, meal) => setDemoLogs(p => [...p, { id: Date.now(), food: f, qty, mealType: meal, date: new Date().toISOString() }])
    : supaData.addFoodLog;
  const handleAddCustomFoodLog = demoMode
    ? (f, qty, meal) => setDemoLogs(p => [...p, { id: Date.now(), food: { ...f, id: 9999, unit: 'custom' }, qty, mealType: meal, date: new Date().toISOString() }])
    : supaData.addCustomFoodLog;
  const handleDeleteFoodLog = demoMode
    ? (id) => setDemoLogs(p => p.filter(l => l.id !== id))
    : supaData.deleteFoodLog;
  const handleSaveWater = demoMode ? setDemoWater : supaData.saveWater;

  // ── Handlers ──
  const handleFinish = async (userData) => {
    if (demoMode) {
      setDemoUser(userData);
      setPage('dashboard');
    } else {
      const { error } = await supaData.saveProfile(userData);
      if (!error) setPage('dashboard');
    }
  };

  const handleDemo = () => {
    setDemoMode(true);
    setDemoUser({
      name: 'Demo User', goal: 'bulk', calories: 2850, protein: 180,
      carbs: 295, fat: 88, gender: 'male', activity: 'moderate',
      age: 23, weight: 75, height: 175, tdee: 2550, bmr: 1844,
    });
    setPage('dashboard');
  };

  const handleSignOut = async () => {
    if (demoMode) {
      setDemoMode(false);
      setDemoUser(null);
      setDemoLogs(mkTodayLogs);
      setDemoWater(5);
    } else {
      await signOut();
    }
    setPage('landing');
  };

  const BASE = { background: 'var(--bg-base)', minHeight: '100vh', color: 'var(--ink-primary)', fontFamily: "'Inter', sans-serif" };

  // ── Loading ──
  if (!demoMode && (authLoading || (authUser && supaData.loading))) return (
    <div style={BASE}><GlobalStyle /><LoadingScreen /></div>
  );

  // ── Landing ──
  if (page === 'landing' && !authUser) return (
    <div style={BASE}><GlobalStyle />
      <Landing onStart={() => setPage('auth')} onDemo={handleDemo} />
    </div>
  );

  // ── Auth ──
  if (page === 'auth' && !authUser) return (
    <div style={BASE}><GlobalStyle />
      <Auth onBack={() => setPage('landing')} />
    </div>
  );

  // ── Onboarding ──
  if (page === 'onboard') return (
    <div style={BASE}><GlobalStyle />
      <Onboard onFinish={handleFinish} initialData={activeUser} onCancel={activeUser ? () => setPage('profile') : null} />
    </div>
  );

  // ── Main App ──
  return (
    <div style={{ ...BASE, paddingBottom: 72 }}><GlobalStyle />
      {page === 'dashboard' && (
        <Dashboard
          user={activeUser} logs={activeLogs}
          addFoodLog={handleAddFoodLog} deleteFoodLog={handleDeleteFoodLog}
          water={activeWater} saveWater={handleSaveWater} setPage={setPage}
        />
      )}
      {page === 'foodlog'   && <FoodLog user={activeUser} logs={activeLogs} addFoodLog={handleAddFoodLog} addCustomFoodLog={handleAddCustomFoodLog} deleteFoodLog={handleDeleteFoodLog} demoMode={demoMode} />}
      {page === 'analytics' && <Analytics user={activeUser} logs={activeLogs} />}
      {page === 'chat'      && <Chat user={activeUser} logs={activeLogs} addCustomFoodLog={handleAddCustomFoodLog} demoMode={demoMode} />}
      {page === 'profile'   && <Profile user={activeUser} logs={activeLogs} setPage={setPage} signOut={handleSignOut} />}
      <TabBar page={page} setPage={setPage} />
    </div>
  );
}
