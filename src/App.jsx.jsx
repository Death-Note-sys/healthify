import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

import { useAuth } from './hooks/useAuth';
import { useSupabaseData } from './hooks/useSupabaseData';
import Auth from './components/Auth';

// ── Global styles (fonts + animations) ──────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .syne { font-family: 'Syne', sans-serif !important; }
    .fade-in { animation: fadeIn 0.5s ease both; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
    .step-slide { animation: stepSlide 0.35s ease both; }
    @keyframes stepSlide { from { opacity: 0; transform: translateX(22px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(0.75); } }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-thumb { background: #a3e635; border-radius: 2px; }
    input:focus { border-color: #a3e635 !important; }
    input[type=number]::-webkit-inner-spin-button { opacity: 1; }
  `}</style>
);

// ── Color palette ────────────────────────────────────────────
const C = {
  bg: '#07080f', card: '#0e1120', card2: '#151726',
  lime: '#a3e635', blue: '#38bdf8', orange: '#fb923c',
  border: 'rgba(255,255,255,0.07)', text: '#fff',
  muted: '#9ca3af', dim: '#6b7280', dimmer: '#374151',
};

// ── Constants ────────────────────────────────────────────────
const ACTS = [
  { key: 'sedentary',  label: 'Sedentary',          desc: 'Desk job · little to no exercise',      mult: 1.2,   emoji: '🪑' },
  { key: 'light',      label: 'Lightly Active',      desc: 'Light exercise 1–3 days/week',           mult: 1.375, emoji: '🚶' },
  { key: 'moderate',   label: 'Moderately Active',   desc: 'Moderate exercise 3–5 days/week',        mult: 1.55,  emoji: '🏃' },
  { key: 'active',     label: 'Very Active',         desc: 'Hard training 6–7 days/week',            mult: 1.725, emoji: '🏋️' },
  { key: 'veryActive', label: 'Athlete',             desc: 'Twice-daily training or physical job',   mult: 1.9,   emoji: '⚡' },
];

const GOALS = [
  { key: 'cut',      label: 'Fat Loss',     emoji: '🔥', desc: '500 kcal deficit · preserve muscle',    adj: -500, color: '#fb923c', pMult: 2.4 },
  { key: 'maintain', label: 'Maintenance',  emoji: '⚖️', desc: 'Eat at TDEE · body recomposition',      adj: 0,    color: '#a3e635', pMult: 1.8 },
  { key: 'bulk',     label: 'Muscle Gain',  emoji: '💪', desc: '300 kcal lean surplus · build mass',    adj: 300,  color: '#38bdf8', pMult: 2.0 },
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
const PrimaryBtn = ({ children, onClick, style: s = {}, disabled = false }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: '13px 28px', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15,
    background: '#a3e635', color: '#07080f', border: 'none',
    boxShadow: '0 4px 24px rgba(163,230,53,0.22)',
    transition: 'all 0.2s', opacity: disabled ? 0.5 : 1, ...s
  }}>{children}</button>
);

const SecBtn = ({ children, onClick, style: s = {} }) => (
  <button onClick={onClick} style={{
    padding: '13px 28px', borderRadius: 12, cursor: 'pointer',
    fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15,
    background: 'transparent', color: '#a3e635',
    border: '1.5px solid rgba(163,230,53,0.45)', transition: 'all 0.2s', ...s
  }}>{children}</button>
);

const Card = ({ children, style: s = {}, className = '' }) => (
  <div className={className} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, ...s }}>
    {children}
  </div>
);

const FieldLabel = ({ children }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.7 }}>
    {children}
  </label>
);

const NumInput = ({ label, value, onChange, min, max }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <input type="number" value={value} min={min} max={max}
      onChange={e => onChange(Number(e.target.value))}
      style={{
        width: '100%', background: C.card2, borderRadius: 12,
        border: '1.5px solid rgba(255,255,255,0.09)',
        color: '#fff', padding: '12px 10px',
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, outline: 'none', transition: 'border-color 0.2s'
      }} />
  </div>
);

// ── Part 2 visual components ─────────────────────────────────

const ProgressRing = ({ v, max, size = 150, sw = 13, color = '#a3e635' }) => {
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(v / max, 1);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a2035" strokeWidth={sw} />
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
        <span style={{ color: C.muted }}>{label}</span>
        <span style={{ fontWeight: 600 }}>
          {Math.round(v)}<span style={{ color: C.dimmer, fontWeight: 400 }}>/{max}{unit}</span>
        </span>
      </div>
      <div style={{ height: 6, background: '#1a2035', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.9s ease' }} />
      </div>
    </div>
  );
};

// ── Step Indicator ───────────────────────────────────────────
const StepDots = ({ step }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 22 }}>
    {[1, 2, 3].map(s => (
      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif",
          transition: 'all 0.3s',
          background: s < step ? '#a3e635' : s === step ? 'rgba(163,230,53,0.12)' : '#1a2035',
          border: `2px solid ${s <= step ? '#a3e635' : 'rgba(255,255,255,0.08)'}`,
          color: s < step ? '#07080f' : s === step ? '#a3e635' : '#4b5563',
        }}>
          {s < step ? '✓' : s}
        </div>
        {s < 3 && <div style={{ width: 36, height: 2, borderRadius: 1, background: s < step ? '#a3e635' : '#1a2035', transition: 'background 0.35s' }} />}
      </div>
    ))}
  </div>
);

// ── Landing Page ─────────────────────────────────────────────
const Landing = ({ onStart, onDemo }) => (
  <div style={{ position: 'relative', overflow: 'hidden' }}>
    {/* Ambient orb — top-left */}
    <div style={{ position: 'fixed', top: -180, left: -180, width: 520, height: 520, background: 'radial-gradient(circle, rgba(163,230,53,0.1) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
    {/* Ambient orb — bottom-right */}
    <div style={{ position: 'fixed', bottom: -180, right: -120, width: 460, height: 460, background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

    {/* Top nav */}
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 28px', borderBottom: `1px solid ${C.border}`, position: 'relative', zIndex: 1 }}>
      <div className="syne" style={{ fontSize: 22, fontWeight: 800, color: C.lime, letterSpacing: -0.5 }}>
        Healthify<span style={{ color: C.blue, fontSize: 8, verticalAlign: 'super', marginLeft: 2 }}>✦</span>
      </div>
      <PrimaryBtn onClick={onStart} style={{ padding: '9px 20px', fontSize: 13 }}>Get Started →</PrimaryBtn>
    </nav>

    {/* Hero */}
    <div className="fade-in" style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px 52px', textAlign: 'center', position: 'relative', zIndex: 1 }}>

      {/* Live badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(163,230,53,0.08)', border: '1px solid rgba(163,230,53,0.22)',
        borderRadius: 20, padding: '5px 16px',
        fontSize: 11, fontWeight: 700, color: C.lime, marginBottom: 28, letterSpacing: 1
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.lime, boxShadow: `0 0 6px ${C.lime}` }} />
        AI-POWERED NUTRITION TRACKING
      </div>

      <h1 className="syne" style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.07, marginBottom: 20, letterSpacing: -2, color: '#fff' }}>
        Fuel your body.<br />
        <span style={{ color: C.lime }}>Reach every goal.</span>
      </h1>

      <p style={{ fontSize: 17, color: C.muted, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.7 }}>
        Personalized macro plans, AI coaching, and real-time nutrition insights — built for Indian fitness culture and beyond.
      </p>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
        <PrimaryBtn onClick={onStart}  style={{ padding: '15px 36px', fontSize: 16 }}>Build My Free Plan →</PrimaryBtn>
        <SecBtn      onClick={onDemo}  style={{ padding: '15px 36px', fontSize: 16 }}>View Demo</SecBtn>
      </div>

      {/* Feature grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, textAlign: 'left', marginBottom: 52 }}>
        {[
          { i: '🎯', t: 'Goal-Based Calories',   d: 'BMR via Mifflin-St Jeor + TDEE multipliers for cutting, bulking, or maintenance.' },
          { i: '🥗', t: 'Macro + Micro Tracking', d: 'Protein, carbs & fat + 6 key micros: iron, calcium, vitamin D, B12, magnesium, zinc.' },
          { i: '🤖', t: 'AI Nutrition Coach',     d: 'Powered by Claude — ask anything about meal plans, supplements, or post-workout nutrition.' },
          { i: '📊', t: 'Weekly Analytics',       d: '7-day calorie trend, protein consistency charts, and macro breakdown visualizations.' },
          { i: '💧', t: 'Hydration Tracker',      d: 'Simple 8-glass daily goal with one-tap water logging.' },
          { i: '🍽️', t: 'Smart Meal Recs',        d: 'Personalized food suggestions based on your remaining daily calorie and protein targets.' },
        ].map(({ i, t, d }) => (
          <Card key={t} style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>{i}</div>
            <div className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#f1f5f9' }}>{t}</div>
            <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.65 }}>{d}</div>
          </Card>
        ))}
      </div>

      {/* CTA banner */}
      <div style={{
        padding: '40px 32px',
        background: 'linear-gradient(135deg, rgba(163,230,53,0.07), rgba(56,189,248,0.07))',
        border: '1px solid rgba(163,230,53,0.17)', borderRadius: 20
      }}>
        <h2 className="syne" style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, color: '#fff' }}>
          Ready to transform your nutrition?
        </h2>
        <p style={{ color: C.muted, marginBottom: 24, fontSize: 14 }}>Takes under 2 minutes. No credit card needed.</p>
        <PrimaryBtn onClick={onStart} style={{ padding: '14px 36px', fontSize: 15 }}>Build My Free Plan →</PrimaryBtn>
      </div>
    </div>
  </div>
);

// ── Onboarding (3 steps) ─────────────────────────────────────
const Onboard = ({ onFinish }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', age: 23, weight: 75, height: 175, gender: 'male', activity: 'moderate', goal: 'bulk' });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const nutrition = calcNutrition(form);
  const gi = GOALS.find(g => g.key === form.goal) || GOALS[1];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 500 }}>

        {/* Onboard header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="syne" style={{ fontSize: 22, fontWeight: 800, color: C.lime, marginBottom: 18 }}>Healthify</div>
          <StepDots step={step} />
          <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: 1 }}>
            {step === 1 ? 'PERSONAL INFO' : step === 2 ? 'YOUR GOALS' : 'YOUR PLAN'}
          </div>
        </div>

        <Card key={step} className="step-slide">

          {/* ─── STEP 1: Personal Info ─────────────────────── */}
          {step === 1 && (
            <div>
              <div className="syne" style={{ fontSize: 24, fontWeight: 800, marginBottom: 5, color: '#fff' }}>About You</div>
              <p style={{ fontSize: 13, color: C.dim, marginBottom: 24 }}>We use this to calculate your exact calorie needs.</p>

              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Your Name</FieldLabel>
                <input type="text" value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Arjun"
                  style={{ width: '100%', background: C.card2, border: '1.5px solid rgba(255,255,255,0.09)', borderRadius: 12, color: '#fff', padding: '13px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, outline: 'none', transition: 'border-color 0.2s' }} />
              </div>

              {/* Age / Weight / Height */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                <NumInput label="Age (yrs)"    value={form.age}    onChange={v => upd('age', v)}    min={15}  max={80}  />
                <NumInput label="Weight (kg)"  value={form.weight} onChange={v => upd('weight', v)} min={30}  max={250} />
                <NumInput label="Height (cm)"  value={form.height} onChange={v => upd('height', v)} min={130} max={220} />
              </div>

              {/* Gender */}
              <div style={{ marginBottom: 26 }}>
                <FieldLabel>Gender</FieldLabel>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['male','♂  Male'],['female','♀  Female']].map(([val, lbl]) => (
                    <button key={val} onClick={() => upd('gender', val)} style={{
                      flex: 1, padding: '13px', borderRadius: 12, cursor: 'pointer',
                      fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14,
                      background: form.gender === val ? 'rgba(163,230,53,0.1)' : 'transparent',
                      border: `2px solid ${form.gender === val ? C.lime : 'rgba(255,255,255,0.09)'}`,
                      color: form.gender === val ? C.lime : C.dim, transition: 'all 0.2s'
                    }}>{lbl}</button>
                  ))}
                </div>
              </div>

              <PrimaryBtn onClick={() => setStep(2)} style={{ width: '100%' }}>Continue → Goal Setup</PrimaryBtn>
            </div>
          )}

          {/* ─── STEP 2: Activity + Goal ────────────────────── */}
          {step === 2 && (
            <div>
              <div className="syne" style={{ fontSize: 24, fontWeight: 800, marginBottom: 5, color: '#fff' }}>Your Goals</div>
              <p style={{ fontSize: 13, color: C.dim, marginBottom: 24 }}>Pick your activity level and what you want to achieve.</p>

              {/* Activity level */}
              <div style={{ marginBottom: 20 }}>
                <FieldLabel>Activity Level</FieldLabel>
                {ACTS.map(a => (
                  <div key={a.key} onClick={() => upd('activity', a.key)} style={{
                    padding: '11px 14px', borderRadius: 12, marginBottom: 7, cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: form.activity === a.key ? 'rgba(163,230,53,0.07)' : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${form.activity === a.key ? 'rgba(163,230,53,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.18s'
                  }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 18 }}>{a.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: form.activity === a.key ? C.lime : '#e2e8f0' }}>{a.label}</div>
                        <div style={{ fontSize: 11, color: C.dim }}>{a.desc}</div>
                      </div>
                    </div>
                    {form.activity === a.key && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#07080f', fontWeight: 800, flexShrink: 0 }}>✓</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Primary goal */}
              <div style={{ marginBottom: 24 }}>
                <FieldLabel>Primary Goal</FieldLabel>
                {GOALS.map(g => (
                  <div key={g.key} onClick={() => upd('goal', g.key)} style={{
                    padding: '13px 14px', borderRadius: 12, marginBottom: 8, cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: form.goal === g.key ? `${g.color}12` : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${form.goal === g.key ? g.color + '55' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.18s'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: form.goal === g.key ? g.color : '#e2e8f0' }}>{g.emoji} {g.label}</div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{g.desc}</div>
                    </div>
                    {form.goal === g.key && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#07080f', fontWeight: 800, flexShrink: 0 }}>✓</div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <SecBtn    onClick={() => setStep(1)} style={{ flex: 1, padding: '13px' }}>← Back</SecBtn>
                <PrimaryBtn onClick={() => setStep(3)} style={{ flex: 2, padding: '13px' }}>See My Plan →</PrimaryBtn>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Results ────────────────────────────── */}
          {step === 3 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
                <div className="syne" style={{ fontSize: 24, fontWeight: 800, marginBottom: 5, color: '#fff' }}>
                  {form.name ? `${form.name}'s Plan` : 'Your Nutrition Plan'}
                </div>
                <div style={{ fontSize: 13, color: C.dim }}>Calculated via Mifflin-St Jeor formula</div>
              </div>

              {/* Calorie target */}
              <div style={{
                background: `linear-gradient(135deg, ${gi.color}18, ${gi.color}08)`,
                border: `1px solid ${gi.color}35`, borderRadius: 16,
                padding: '22px 20px', textAlign: 'center', marginBottom: 14
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: gi.color, letterSpacing: 1.2, marginBottom: 8 }}>DAILY CALORIE TARGET</div>
                <div className="syne" style={{ fontSize: 56, fontWeight: 800, color: gi.color, lineHeight: 1 }}>{nutrition.calories}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
                  kcal/day · BMR: {nutrition.bmr} · TDEE: {nutrition.tdee}
                </div>
              </div>

              {/* Macro trio */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[
                  { label: 'Protein', val: `${nutrition.protein}g`, kcal: nutrition.protein * 4, color: C.blue   },
                  { label: 'Carbs',   val: `${nutrition.carbs}g`,   kcal: nutrition.carbs * 4,   color: C.lime   },
                  { label: 'Fat',     val: `${nutrition.fat}g`,     kcal: nutrition.fat * 9,     color: C.orange },
                ].map(({ label, val, kcal, color }) => (
                  <div key={label} style={{ background: C.card2, borderRadius: 14, padding: '16px 10px', textAlign: 'center' }}>
                    <div className="syne" style={{ fontSize: 24, fontWeight: 800, color }}>{val}</div>
                    <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>{label}</div>
                    <div style={{ fontSize: 10, color: C.dimmer, marginTop: 2 }}>{kcal} kcal</div>
                  </div>
                ))}
              </div>

              {/* Strategy tip */}
              <div style={{ background: C.card2, borderRadius: 12, padding: '14px 16px', marginBottom: 22, fontSize: 13, color: C.muted, lineHeight: 1.68, border: '1px solid rgba(255,255,255,0.05)' }}>
                💡 <strong style={{ color: '#e2e8f0' }}>Your strategy:</strong>{' '}
                {form.goal === 'bulk'
                  ? `You're in a 300 kcal lean surplus. Hit ${nutrition.protein}g protein daily and focus on progressive overload to maximize muscle growth.`
                  : form.goal === 'cut'
                  ? `You're in a 500 kcal deficit. High protein (${nutrition.protein}g) preserves muscle while you lose body fat.`
                  : `You're eating at maintenance. Focus on consistency and gradual body recomposition over time.`}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <SecBtn     onClick={() => setStep(2)}                     style={{ flex: 1, padding: '13px' }}>← Adjust</SecBtn>
                <PrimaryBtn onClick={() => onFinish({ ...form, ...nutrition })} style={{ flex: 2, padding: '13px' }}>Start Tracking 🚀</PrimaryBtn>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// ── Full Dashboard (Part 2) ───────────────────────────────────
const Dashboard = ({ user, logs, addFoodLog, deleteFoodLog, water, saveWater, setPage }) => {
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

  const calPct    = tCal / gCal;
  const ringColor = calPct > 1 ? '#f87171' : calPct > 0.85 ? '#fbbf24' : C.lime;
  const remaining = Math.max(0, Math.round(gCal - tCal));
  const remProt   = Math.max(0, Math.round(gProt - tProt));

  const MC = { breakfast:'#fbbf24', lunch:'#a3e635', dinner:'#38bdf8', snack:'#c084fc' };
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

  return (
    <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: C.dim }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h1 className="syne" style={{ fontSize: 24, fontWeight: 800, marginTop: 3, color: '#fff' }}>
            Hey, {user?.name || 'Champ'} 👋
          </h1>
        </div>
        <div style={{ background: 'rgba(163,230,53,0.1)', border: '1px solid rgba(163,230,53,0.25)', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: C.lime, flexShrink: 0 }}>
          🔥 7-day streak
        </div>
      </div>

      {/* ── Calorie Ring + Macro Bars ── */}
      <Card style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ProgressRing v={Math.round(tCal)} max={gCal} size={148} sw={13} color={ringColor} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div className="syne" style={{ fontSize: 21, fontWeight: 800, lineHeight: 1, color: '#fff' }}>{Math.round(tCal)}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>of {gCal} kcal</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Today's Progress</div>
          <div className="syne" style={{ fontSize: 16, fontWeight: 800, color: ringColor, marginBottom: 14 }}>
            {remaining > 0 ? `${remaining} kcal remaining` : '🎯 Goal reached!'}
          </div>
          <MacroBar label="Protein" v={Math.round(tProt)}  max={gProt}  color={C.blue}   />
          <MacroBar label="Carbs"   v={Math.round(tCarbs)} max={gCarbs} color={C.lime}   />
          <MacroBar label="Fat"     v={Math.round(tFat)}   max={gFat}   color={C.orange} />
        </div>
      </Card>

      {/* ── Quick stat pills ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Goal',        val: `${gi.emoji} ${gi.label}`, color: gi.color },
          { label: 'Protein left',val: `${remProt}g`,             color: C.blue   },
          { label: 'Hydration',   val: `${water}/8 glasses`,      color: C.blue   },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: C.card2, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 3, lineHeight: 1.2 }}>{val}</div>
            <div style={{ fontSize: 10, color: C.dim }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Water Tracker ── */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div className="syne" style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>💧 Hydration Tracker</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{water} of 8 glasses · {water * 250} ml</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: water >= 8 ? C.lime : C.blue }}>
            {water >= 8 ? '✓ Goal met!' : `${(8 - water) * 250}ml to go`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i}
              onClick={() => saveWater(i + 1 === water ? i : i + 1)}
              style={{
                flex: 1, height: 38, borderRadius: 8, cursor: 'pointer',
                background: i < water ? 'rgba(56,189,248,0.22)' : '#1a2035',
                border: `1px solid ${i < water ? '#38bdf8' : 'rgba(255,255,255,0.06)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, transition: 'all 0.18s',
              }}>
              {i < water ? '💧' : '·'}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Today's Meals ── */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="syne" style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>🍽️ Today's Meals</div>
          <button onClick={() => setPage('foodlog')}
            style={{ fontSize: 13, color: C.lime, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            + Add Food
          </button>
        </div>

        {mealGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: C.dim, fontSize: 14 }}>
            No meals logged yet.{' '}
            <span style={{ color: C.lime, cursor: 'pointer' }} onClick={() => setPage('foodlog')}>Add your first meal →</span>
          </div>
        ) : mealGroups.map(({ m, items }) => (
          <div key={m} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MC[m], textTransform: 'uppercase', letterSpacing: 1 }}>{m}</div>
              <div style={{ fontSize: 11, color: C.dim }}>{Math.round(items.reduce((a, l) => a + l.food.cal * l.qty, 0))} kcal</div>
            </div>
            {items.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{l.food.e}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{l.food.name}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>{l.qty}× {l.food.s}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{Math.round(l.food.cal * l.qty)} kcal</div>
                    <div style={{ fontSize: 11, color: C.blue }}>{Math.round(l.food.protein * l.qty)}g protein</div>
                  </div>
                  <button onClick={() => delLog(l.id)}
                    style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 6, color: '#f87171', padding: '3px 8px', cursor: 'pointer', fontSize: 14, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </Card>

      {/* ── Meal Recommendations ── */}
      <Card>
        <div className="syne" style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 4 }}>🎯 Recommended Next</div>
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 14 }}>
          {remProt > 0
            ? `You need ~${remProt}g more protein today`
            : '✓ Protein goal reached for today!'}
        </div>
        {recs.map(f => (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>{f.e}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{f.name}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{f.s} · {f.cal} kcal</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, color: C.blue, fontWeight: 700 }}>{f.protein}g</div>
              <button onClick={() => quickAdd(f)}
                style={{ background: 'rgba(163,230,53,0.1)', border: '1px solid rgba(163,230,53,0.3)', borderRadius: 8, color: C.lime, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                + Add
              </button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

// ── Food Log Page (Part 3) ────────────────────────────────────
const FoodLog = ({ user, logs, addFoodLog, deleteFoodLog, addCustomFoodLog }) => {
  const [sq,    setSq]    = useState('');
  const [meal,  setMeal]  = useState('breakfast');
  const [qty,   setQty]   = useState(1);
  const [toast, setToast] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2000); };

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
    setAiLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: `You are a nutrition API. Respond ONLY with a valid JSON object. No markdown, no text. Keys: "name" (string), "cal" (number), "protein" (number), "carbs" (number), "fat" (number), "iron" (number in mg), "calcium" (number in mg), "vitD" (number in mcg), "vitB12" (number in mcg), "magnesium" (number in mg), "zinc" (number in mg), "e" (emoji). Estimate exact macros and micros for the specific quantity.`,
          messages: [{ role: 'user', parts: [{ text: sq }] }]
        })
      });
      const data = await res.json();
      let reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      
      const customFood = JSON.parse(jsonMatch[0]);
      
      const { error } = await addCustomFoodLog(customFood, qty, meal);
      if (error) throw new Error(error.message);
      
      showToast(`${customFood.e || '✨'} ${customFood.name} logged via AI!`);
      setSq('');
    } catch (e) {
      console.error(e);
      showToast("❌ Failed: " + (e.message || "Could not parse AI data"));
    } finally {
      setAiLoading(false);
    }
  };

  const delLog = id => deleteFoodLog(id);

  const MC = { breakfast: '#fbbf24', lunch: '#a3e635', dinner: '#38bdf8', snack: '#c084fc' };
  const mealEmoji = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

  const mealGroups = ['breakfast', 'lunch', 'dinner', 'snack']
    .map(m => ({ m, items: todayL.filter(l => l.mealType === m) }))
    .filter(g => g.items.length > 0);

  return (
    <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto', position: 'relative' }}>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: C.lime, color: '#07080f', padding: '10px 20px', borderRadius: 12,
          fontWeight: 700, fontSize: 14, boxShadow: '0 4px 20px rgba(163,230,53,0.4)',
          whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans',sans-serif"
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h1 className="syne" style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Food Log</h1>
        <div style={{ fontSize: 13, color: C.dim }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Daily summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Calories',  val: Math.round(tCal),                          color: C.lime,   unit: 'kcal' },
          { label: 'Protein',   val: Math.round(tProt) + 'g',                   color: C.blue,   unit: `/ ${gProt}g` },
          { label: 'Items',     val: todayL.length,                              color: C.orange, unit: 'logged' },
          { label: 'Remaining', val: Math.max(0, Math.round(gCal - tCal)),      color: tCal > gCal ? '#f87171' : C.muted, unit: 'kcal' },
        ].map(({ label, val, color, unit }) => (
          <div key={label} style={{ background: C.card2, borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
            <div className="syne" style={{ fontSize: 15, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 9, color: C.dim, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search + Controls */}
      <Card style={{ marginBottom: 14 }}>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
          <input
            value={sq}
            onChange={e => setSq(e.target.value)}
            placeholder="Search — chicken, paneer, oats, dal..."
            style={{
              width: '100%', background: C.card2,
              border: '1.5px solid rgba(255,255,255,0.09)', borderRadius: 12,
              color: '#fff', padding: '12px 40px 12px 42px',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14,
              outline: 'none', transition: 'border-color 0.2s'
            }}
          />
          {sq && (
            <button onClick={() => setSq('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>

        {/* Meal type tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {['breakfast', 'lunch', 'dinner', 'snack'].map(m => (
            <button key={m} onClick={() => setMeal(m)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
              fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 11, textTransform: 'capitalize',
              background: meal === m ? `${MC[m]}18` : 'transparent',
              border: `1.5px solid ${meal === m ? MC[m] + '80' : 'rgba(255,255,255,0.07)'}`,
              color: meal === m ? MC[m] : C.dim, transition: 'all 0.18s',
            }}>
              {mealEmoji[m]}<br />{m}
            </button>
          ))}
        </div>

        {/* Quantity stepper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: C.muted }}>Servings:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setQty(q => Math.max(0.5, parseFloat((q - 0.5).toFixed(1))))}
              style={{ width: 32, height: 32, borderRadius: 8, background: C.card2, border: `1px solid ${C.border}`, color: '#fff', cursor: 'pointer', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              −
            </button>
            <span className="syne" style={{ fontWeight: 800, fontSize: 20, minWidth: 32, textAlign: 'center', color: C.lime }}>{qty}</span>
            <button
              onClick={() => setQty(q => parseFloat((q + 0.5).toFixed(1)))}
              style={{ width: 32, height: 32, borderRadius: 8, background: C.card2, border: `1px solid ${C.border}`, color: '#fff', cursor: 'pointer', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              +
            </button>
          </div>
        </div>

        {/* Live search results */}
        {sq.length > 1 && (
          <div style={{ marginTop: 14, maxHeight: 300, overflowY: 'auto' }}>
            {searchR.map(f => (
              <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 22 }}>{f.e}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>
                      {f.s} · <span style={{ color: C.lime }}>{Math.round(f.cal * qty)} kcal</span> · <span style={{ color: C.blue }}>{Math.round(f.protein * qty)}g protein</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => addLog(f)} style={{
                  background: 'rgba(163,230,53,0.12)', border: '1px solid rgba(163,230,53,0.35)',
                  borderRadius: 8, color: C.lime, padding: '5px 14px',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                  fontFamily: "'Plus Jakarta Sans',sans-serif"
                }}>
                  + Add
                </button>
              </div>
            ))}
            
            {/* AI Search Option */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 22 }}>✨</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>Ask AI for "{sq}"</div>
                  <div style={{ fontSize: 11, color: C.dim }}>Custom macro calculation</div>
                </div>
              </div>
              <button onClick={searchAI} disabled={aiLoading} style={{
                background: C.lime, border: 'none',
                borderRadius: 8, color: '#000', padding: '5px 14px',
                fontSize: 13, fontWeight: 700, cursor: aiLoading ? 'wait' : 'pointer', flexShrink: 0,
                fontFamily: "'Plus Jakarta Sans',sans-serif", opacity: aiLoading ? 0.7 : 1
              }}>
                {aiLoading ? 'Wait...' : '+ Auto Log'}
              </button>
            </div>
          </div>
        )}
      </Card>



      {/* Today's full log */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div className="syne" style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>📋 Today's Log</div>
          <div style={{ fontSize: 12, color: C.dim }}>{Math.round(tCal)} / {gCal} kcal</div>
        </div>

        {/* Calorie progress bar */}
        <div style={{ height: 4, background: '#1a2035', borderRadius: 2, overflow: 'hidden', marginBottom: 18 }}>
          <div style={{
            height: '100%', borderRadius: 2, transition: 'width 0.8s ease',
            width: `${Math.min((tCal / gCal) * 100, 100)}%`,
            background: tCal > gCal ? '#f87171' : C.lime
          }} />
        </div>

        {mealGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: C.dim, fontSize: 14 }}>
            Use the search bar above to log your meals 🍽️
          </div>
        ) : mealGroups.map(({ m, items }) => {
          const mCal  = Math.round(items.reduce((a, l) => a + l.food.cal     * l.qty, 0));
          const mProt = Math.round(items.reduce((a, l) => a + l.food.protein * l.qty, 0));
          const mCarb = Math.round(items.reduce((a, l) => a + l.food.carbs   * l.qty, 0));
          const mFat  = Math.round(items.reduce((a, l) => a + l.food.fat     * l.qty, 0));
          return (
            <div key={m} style={{ marginBottom: 18 }}>
              {/* Meal section header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 7, borderBottom: `1px solid ${MC[m]}28` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 14 }}>{mealEmoji[m]}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: MC[m], textTransform: 'uppercase', letterSpacing: 0.8 }}>{m}</span>
                </div>
                <div style={{ fontSize: 11, color: C.dim }}>
                  {mCal} kcal · {mProt}g P · {mCarb}g C · {mFat}g F
                </div>
              </div>

              {/* Log entries */}
              {items.map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 20 }}>{l.food.e}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{l.food.name}</div>
                      <div style={{ fontSize: 11, color: C.dim }}>
                        {l.qty}× {l.food.s} &nbsp;·&nbsp;
                        <span style={{ color: C.blue }}>{Math.round(l.food.protein * l.qty)}g P</span> ·{' '}
                        <span style={{ color: C.lime }}>{Math.round(l.food.carbs * l.qty)}g C</span> ·{' '}
                        <span style={{ color: C.orange }}>{Math.round(l.food.fat * l.qty)}g F</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{Math.round(l.food.cal * l.qty)}</div>
                      <div style={{ fontSize: 10, color: C.dim }}>kcal</div>
                    </div>
                    <button onClick={() => delLog(l.id)} style={{
                      background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                      borderRadius: 6, color: '#f87171', padding: '3px 9px',
                      cursor: 'pointer', fontSize: 15, lineHeight: 1,
                      fontFamily: "'Plus Jakarta Sans',sans-serif"
                    }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </Card>
    </div>
  );
};

// ── Analytics Page (Part 4) ───────────────────────────────────
const MICROS = [
  { key:'iron',      label:'Iron',        rda:18,   unit:'mg',  color:'#f87171' },
  { key:'calcium',   label:'Calcium',     rda:1000, unit:'mg',  color:'#a3e635' },
  { key:'vitD',      label:'Vitamin D',   rda:15,   unit:'mcg', color:'#fbbf24' },
  { key:'vitB12',    label:'Vitamin B12', rda:2.4,  unit:'mcg', color:'#c084fc' },
  { key:'magnesium', label:'Magnesium',   rda:400,  unit:'mg',  color:'#38bdf8' },
  { key:'zinc',      label:'Zinc',        rda:11,   unit:'mg',  color:'#fb923c' },
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
    { name:'Protein', value: Math.round(tProt*4),  color: C.blue   },
    { name:'Carbs',   value: Math.round(tCarbs*4), color: C.lime   },
    { name:'Fat',     value: Math.round(tFat*9),   color: C.orange },
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
      <div style={{ background: '#0e1120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: '#fff' }}>{label}</div>
        {payload.map(p => (
          <div key={p.dataKey} style={{ fontSize: 13, color: p.color || C.lime }}>
            {p.dataKey === 'calories' ? `${p.value} kcal` : `${p.value}g protein`}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

      {/* Header */}
      <h1 className="syne" style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Analytics</h1>
      <p style={{ fontSize: 13, color: C.dim, marginBottom: 20 }}>Your 7-day nutrition overview</p>

      {/* Weekly summary pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { label: '7-day Avg Cal',  val: avgCal  + ' kcal', color: C.lime   },
          { label: '7-day Avg Prot', val: avgProt + 'g',     color: C.blue   },
          { label: 'Days On Target', val: `${daysHit}/7`,    color: C.orange },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: C.card2, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
            <div className="syne" style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Weekly Calories Bar Chart */}
      <Card style={{ marginBottom: 14 }}>
        <div className="syne" style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 3 }}>📊 Weekly Calories</div>
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 16 }}>Daily target: {gCal} kcal</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={weekData} barSize={30} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: C.dim, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
              {weekData.map((entry, i) => (
                <Cell key={i} fill={entry.calories >= gCal * 0.9 ? C.lime : '#38bdf840'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.dim }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: C.lime }} /> On target
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.dim }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#38bdf840' }} /> Below target
          </div>
        </div>
      </Card>

      {/* Protein Consistency Area Chart */}
      <Card style={{ marginBottom: 14 }}>
        <div className="syne" style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 3 }}>💪 Protein Consistency</div>
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 16 }}>Daily target: {gProt}g</div>
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={weekData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="protGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={C.blue} stopOpacity={0.35} />
                <stop offset="100%" stopColor={C.blue} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="day"  tick={{ fill: C.dim, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis               tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="protein" stroke={C.blue} fill="url(#protGrad)" strokeWidth={2.5} dot={{ fill: C.blue, r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Macro Pie Chart */}
      <Card style={{ marginBottom: 14 }}>
        <div className="syne" style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 16 }}>🥗 Today's Macro Split</div>
        {totalKcal === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: C.dim, fontSize: 14 }}>
            Log some food today to see your macro breakdown.
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ flexShrink: 0 }}>
              <PieChart width={130} height={130}>
                <Pie data={pieData} dataKey="value" cx={60} cy={60} innerRadius={36} outerRadius={58} strokeWidth={0} paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { label:'Protein', g: Math.round(tProt),  kcal: Math.round(tProt*4),  color: C.blue   },
                { label:'Carbs',   g: Math.round(tCarbs), kcal: Math.round(tCarbs*4), color: C.lime   },
                { label:'Fat',     g: Math.round(tFat),   kcal: Math.round(tFat*9),   color: C.orange },
              ].map(({ label, g, kcal, color }) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius:'50%', background: color }} />
                    <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <strong style={{ color:'#fff' }}>{g}g</strong>
                    <span style={{ color: C.dim, fontSize: 11 }}> · {kcal} kcal</span>
                    <span style={{ color: C.dim, fontSize: 11 }}> · {totalKcal > 0 ? Math.round((kcal / totalKcal) * 100) : 0}%</span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: C.dim }}>
                Total logged: <strong style={{ color:'#fff' }}>{totalKcal}</strong> kcal today
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Micronutrients */}
      <Card>
        <div className="syne" style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 3 }}>🔬 Micronutrients</div>
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 20 }}>Today's intake vs. daily recommended (RDA)</div>
        {microVals.map(m => {
          const pct    = Math.min((m.value / m.rda) * 100, 100);
          const status = pct >= 80 ? 'good' : pct >= 40 ? 'ok' : 'low';
          const sColor = status === 'good' ? C.lime : status === 'ok' ? '#fbbf24' : '#f87171';
          const sLabel = status === 'good' ? '✓ Good' : status === 'ok' ? '~ Fair' : '↑ Low';
          return (
            <div key={m.key} style={{ marginBottom: 18 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <div style={{ width: 9, height: 9, borderRadius:'50%', background: m.color }} />
                  <span style={{ fontSize: 13, color:'#e2e8f0', fontWeight: 600 }}>{m.label}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sColor, background: `${sColor}15`, padding:'2px 8px', borderRadius: 20 }}>{sLabel}</span>
                  <span style={{ fontSize: 12, color:'#fff', fontWeight: 600 }}>
                    {m.value.toFixed(1)}<span style={{ color: C.dim, fontWeight: 400 }}>/{m.rda}{m.unit}</span>
                  </span>
                </div>
              </div>
              <div style={{ height: 7, background:'#1a2035', borderRadius: 4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background: m.color, borderRadius: 4, transition:'width 1s ease' }} />
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>{Math.round(pct)}% of daily goal</div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

// ── Profile Page (Part 5) ─────────────────────────────────────
const Profile = ({ user, logs, setPage, signOut }) => {
  if (!user) return (
    <div style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>👤</div>
      <div className="syne" style={{ fontSize: 20, fontWeight: 800, marginBottom: 14, color: '#fff' }}>No Profile Yet</div>
      <Card style={{ maxWidth: 320, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.65, marginBottom: 16 }}>
          Complete onboarding to unlock your personalized nutrition profile.
        </div>
        <PrimaryBtn onClick={() => setPage('onboard')} style={{ width: '100%' }}>Set Up Profile</PrimaryBtn>
      </Card>
    </div>
  );

  const gi  = GOALS.find(g => g.key === user.goal) || GOALS[1];
  const bmi = (user.weight / ((user.height / 100) ** 2)).toFixed(1);
  const bmiStatus = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const bmiColor  = bmi < 18.5 ? C.blue : bmi < 25 ? C.lime : bmi < 30 ? '#fbbf24' : '#f87171';

  const todayL    = logs.filter(l => isToday(l.date));
  const todayProt = todayL.reduce((a, l) => a + l.food.protein * l.qty, 0);
  const totalLogs = logs.length;

  const achievements = [
    { icon: '🔥', title: '7-Day Streak',    desc: 'Log food 7 days running',    earned: true },
    { icon: '💪', title: 'Protein King',    desc: 'Hit protein goal today',     earned: todayProt >= user.protein * 0.9 },
    { icon: '💧', title: 'Hydration Hero',  desc: 'Drink 8 glasses in a day',   earned: false },
    { icon: '📊', title: 'Data Nerd',       desc: 'Log 50+ food entries',       earned: totalLogs >= 50 },
    { icon: '🥗', title: 'Veggie Fan',      desc: 'Log spinach 5 times',        earned: false },
    { icon: '⚡', title: '30-Day Streak',   desc: 'Log food 30 days straight',  earned: false },
  ];

  const earnedCount = achievements.filter(a => a.earned).length;

  return (
    <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

      {/* ── Avatar + name ── */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 82, height: 82, borderRadius: '50%',
          background: `linear-gradient(135deg, ${gi.color}, #38bdf8)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34, fontWeight: 800, margin: '0 auto 14px',
          boxShadow: `0 0 32px ${gi.color}45`,
          color: '#07080f', fontFamily: "'Syne', sans-serif"
        }}>
          {user.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="syne" style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
          {user.name || 'Your Profile'}
        </div>
        <div style={{ fontSize: 13, color: C.dim }}>
          {user.gender === 'male' ? '♂ Male' : '♀ Female'} · {user.age} yrs · {user.weight} kg · {user.height} cm
        </div>
      </div>

      {/* ── Goal banner ── */}
      <div style={{
        background: `linear-gradient(135deg, ${gi.color}14, ${gi.color}05)`,
        border: `1px solid ${gi.color}35`, borderRadius: 16,
        padding: '18px 20px', marginBottom: 14,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: 11, color: gi.color, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>CURRENT GOAL</div>
          <div className="syne" style={{ fontSize: 22, fontWeight: 800, color: gi.color }}>{gi.emoji} {gi.label}</div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>{gi.desc}</div>
        </div>
        <PrimaryBtn onClick={() => setPage('onboard')} style={{ padding: '9px 18px', fontSize: 13 }}>
          Edit
        </PrimaryBtn>
      </div>

      {/* ── Stats grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { icon: '🎯', label: 'Daily Target', val: `${user.calories}`,     unit: 'kcal',  sub: `TDEE: ${user.tdee} kcal`,   color: C.lime   },
          { icon: '📏', label: 'BMI',          val: bmi,                   unit: '',      sub: bmiStatus,                   color: bmiColor },
          { icon: '⚡', label: 'BMR',          val: `${user.bmr}`,          unit: 'kcal',  sub: 'Base metabolic rate',       color: C.orange },
          { icon: '💪', label: 'Protein Goal', val: `${user.protein}`,      unit: 'g/day', sub: `${(user.protein / user.weight).toFixed(1)}g per kg`, color: C.blue },
        ].map(({ icon, label, val, unit, sub, color }) => (
          <Card key={label} style={{ textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
              <span className="syne" style={{ fontSize: 22, fontWeight: 800, color }}>{val}</span>
              {unit && <span style={{ fontSize: 11, color: C.dim }}>{unit}</span>}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 10, color: C.dimmer, marginTop: 2 }}>{sub}</div>
          </Card>
        ))}
      </div>

      {/* ── Macro targets ── */}
      <Card style={{ marginBottom: 14 }}>
        <div className="syne" style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 16 }}>
          Daily Macro Targets
        </div>
        <MacroBar label="Protein"       v={user.protein} max={user.protein} color={C.blue}   />
        <MacroBar label="Carbohydrates" v={user.carbs}   max={user.carbs}   color={C.lime}   />
        <MacroBar label="Fat"           v={user.fat}     max={user.fat}     color={C.orange} />
        <div style={{ marginTop: 14, background: C.card2, borderRadius: 10, padding: '12px 14px' }}>
          {[
            { label: 'Protein', g: user.protein, kcal: user.protein * 4, color: C.blue   },
            { label: 'Carbs',   g: user.carbs,   kcal: user.carbs * 4,   color: C.lime   },
            { label: 'Fat',     g: user.fat,     kcal: user.fat * 9,     color: C.orange },
          ].map(({ label, g, kcal, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
              </div>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
                {g}g <span style={{ color: C.dim, fontWeight: 400 }}>· {kcal} kcal</span>
              </span>
            </div>
          ))}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: C.dim, display: 'flex', justifyContent: 'space-between' }}>
            <span>Total calories</span>
            <strong style={{ color: C.lime }}>{user.calories} kcal</strong>
          </div>
        </div>
      </Card>

      {/* ── Activity level ── */}
      <Card style={{ marginBottom: 14 }}>
        <div className="syne" style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 14 }}>
          Activity Level
        </div>
        {ACTS.map(a => (
          <div key={a.key} style={{
            padding: '10px 12px', borderRadius: 10, marginBottom: 6,
            background: user.activity === a.key ? 'rgba(163,230,53,0.07)' : 'transparent',
            border: `1px solid ${user.activity === a.key ? 'rgba(163,230,53,0.28)' : 'transparent'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            transition: 'all 0.2s'
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 18 }}>{a.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: user.activity === a.key ? C.lime : C.muted }}>{a.label}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{a.desc}</div>
              </div>
            </div>
            {user.activity === a.key && (
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#07080f', fontWeight: 800, flexShrink: 0 }}>✓</div>
            )}
          </div>
        ))}
      </Card>

      {/* ── Achievements ── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="syne" style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>🏆 Achievements</div>
          <div style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>
            <span style={{ color: C.lime }}>{earnedCount}</span>/{achievements.length} earned
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {achievements.map(({ icon, title, desc, earned }) => (
            <div key={title} style={{
              textAlign: 'center', padding: '14px 8px', borderRadius: 14,
              background: earned ? 'rgba(163,230,53,0.07)' : '#0a0c18',
              border: `1px solid ${earned ? 'rgba(163,230,53,0.22)' : 'rgba(255,255,255,0.04)'}`,
              opacity: earned ? 1 : 0.4, transition: 'all 0.2s',
              position: 'relative'
            }}>
              {earned && (
                <div style={{ position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: '50%', background: C.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#07080f', fontWeight: 800 }}>✓</div>
              )}
              <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: earned ? C.lime : C.dim, lineHeight: 1.3 }}>{title}</div>
              <div style={{ fontSize: 9, color: C.dimmer, marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Logout ── */}
      {signOut && (
        <button onClick={signOut} style={{
          width: '100%', marginTop: 14, padding: '14px',
          borderRadius: 12, cursor: 'pointer',
          fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14,
          background: 'rgba(248,113,113,0.08)', color: '#f87171',
          border: '1px solid rgba(248,113,113,0.2)',
          transition: 'all 0.2s',
        }}>Sign Out</button>
      )}
    </div>
  );
};

// ── AI Chatbot (Part 6) ───────────────────────────────────────
const Chat = ({ user, logs, addCustomFoodLog }) => {
  const [msgs, setMsgs] = useState([{
    role: 'assistant',
    content: "Hi! I'm your Healthify AI nutrition coach 🌱 Ask me anything about your diet, macros, meal timing, supplements, or fitness goals!"
  }]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const scroll    = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const todayL = logs.filter(l => isToday(l.date));
  const tCal   = Math.round(todayL.reduce((a, l) => a + l.food.cal     * l.qty, 0));
  const tProt  = Math.round(todayL.reduce((a, l) => a + l.food.protein * l.qty, 0));

  const strictGuardrails = `FIREWALL RULES: You are exclusively a health, nutrition, and fitness AI. You MUST REFUSE to answer any question or request that is not directly related to human health, diet, exercise, fitness, or nutrition. If the user asks you to write code, do math, discuss politics, or anything else off-topic, politely decline and steer the conversation back to their health goals. Do not break character under any circumstances.
If the user tells you they ate a specific food, YOU MUST automatically log it by outputting exactly this JSON block anywhere in your response: [LOG_FOOD: {"name": "Food Name", "cal": 100, "protein": 5, "carbs": 20, "fat": 2, "iron": 1, "calcium": 50, "vitD": 0, "vitB12": 0.5, "magnesium": 10, "zinc": 0.5, "meal": "lunch", "e": "🍎"}]. Estimate macros & micros accurately based on the quantity. Valid meals are breakfast, lunch, dinner, snack. ONLY output the block if they explicitly mention eating something.`;

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
    const userMsg = { role: 'user', content: input.trim() };
    const history = [...msgs, userMsg];
    setMsgs(history);
    setInput('');
    setLoading(true);
    setTimeout(scroll, 80);

    try {
      // Build Gemini-format messages (skip initial greeting)
      const geminiMsgs = history
        .filter((m, i) => !(i === 0 && m.role === 'assistant'))
        .map(m => ({
          role:  m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      // Send to our backend proxy — API key never leaves the server
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
          
        // Check for LOG_FOOD command
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
              e: cmd.e || '✨'
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
    "Best post-workout meal? 🏋️",
    "How much protein do I need?",
    "Foods high in iron?",
    "Should I take creatine?",
    "Meal prep ideas for bulking?",
    "How to reduce bloating?",
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 72px)', maxWidth: 600, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #a3e635, #38bdf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          boxShadow: '0 0 20px rgba(163,230,53,0.25)'
        }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div className="syne" style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>AI Nutrition Coach</div>
          <div style={{ fontSize: 12, color: C.lime, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.lime, display: 'inline-block', boxShadow: `0 0 5px ${C.lime}` }} />
            Online · Powered by Llama 3.3
          </div>
        </div>
        {user && (
          <div style={{ fontSize: 11, color: C.dim, textAlign: 'right', lineHeight: 1.5 }}>
            <div style={{ color: C.lime, fontWeight: 700 }}>{tCal} kcal</div>
            <div>logged today</div>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
            {m.role === 'assistant' && (
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #a3e635, #38bdf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}>🤖</div>
            )}
            <div style={{
              maxWidth: '78%', padding: '11px 15px', fontSize: 14, lineHeight: 1.58,
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user' ? C.lime : C.card,
              color:      m.role === 'user' ? '#07080f' : '#fff',
              fontWeight: m.role === 'user' ? 600 : 400,
              border:     m.role === 'assistant' ? `1px solid ${C.border}` : 'none',
              whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
            {m.role === 'user' && (
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${(GOALS.find(g => g.key === user?.goal) || GOALS[1]).color}, #38bdf8)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: '#07080f', fontFamily: "'Syne',sans-serif"
              }}>
                {user?.name?.[0]?.toUpperCase() || '👤'}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#a3e635,#38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
            <div style={{ padding: '13px 18px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '18px 18px 18px 4px', display: 'flex', gap: 6, alignItems: 'center' }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: C.lime, animation: `pulse 1.3s ease infinite`, animationDelay: `${d * 0.22}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick suggestions ── */}
      {msgs.length <= 1 && (
        <div style={{ padding: '4px 16px 10px', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>Try asking</div>
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => { setInput(s); }}
                style={{
                  padding: '7px 13px', borderRadius: 20, whiteSpace: 'nowrap',
                  background: C.card2, border: `1px solid ${C.border}`,
                  color: C.muted, fontSize: 12, cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'all 0.18s',
                  flexShrink: 0,
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about nutrition, meal plans, supplements..."
          style={{
            flex: 1, background: C.card, border: `1.5px solid ${C.border}`,
            borderRadius: 12, color: '#fff', padding: '12px 16px',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{
          width: 46, height: 46, borderRadius: 12, border: 'none',
          background: input.trim() && !loading ? C.lime : '#1a2035',
          color:      input.trim() && !loading ? '#07080f' : C.dim,
          cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
          fontSize: 20, transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {loading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
};

// ── Generic placeholder for future parts ─────────────────────
const Placeholder = ({ icon, title, part }) => (
  <div style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 24, textAlign: 'center' }}>
    <div style={{ fontSize: 52, marginBottom: 16 }}>{icon}</div>
    <div className="syne" style={{ fontSize: 20, fontWeight: 800, marginBottom: 14, color: '#fff' }}>{title}</div>
    <Card style={{ maxWidth: 320, background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.2)', textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.65 }}>
        Coming in <strong style={{ color: C.blue }}>Part {part}</strong> of the Healthify build series.
      </div>
    </Card>
  </div>
);

// ── Bottom Navigation shell ───────────────────────────────────
const BottomNav = ({ page, setPage }) => {
  const tabs = [
    { key: 'dashboard', icon: '🏠', label: 'Home'    },
    { key: 'foodlog',   icon: '📝', label: 'Log'     },
    { key: 'analytics', icon: '📊', label: 'Stats'   },
    { key: 'chat',      icon: '🤖', label: 'AI'      },
    { key: 'profile',   icon: '👤', label: 'Profile' },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(7,8,15,0.96)', backdropFilter: 'blur(20px)',
      borderTop: `1px solid ${C.border}`, display: 'flex'
    }}>
      {tabs.map(({ key, icon, label }) => (
        <button key={key} onClick={() => setPage(key)} style={{
          flex: 1, padding: '10px 4px 8px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: page === key ? C.lime : '#4b5563', transition: 'color 0.2s'
        }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</span>
          {page === key && <div style={{ width: 18, height: 2, borderRadius: 1, background: C.lime, marginTop: 1 }} />}
        </button>
      ))}
    </div>
  );
};

// ── Loading Screen ──────────────────────────────────────────
const LoadingScreen = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
    <div className="syne" style={{ fontSize: 28, fontWeight: 800, color: C.lime }}>
      Healthify<span style={{ color: C.blue, fontSize: 10, verticalAlign: 'super', marginLeft: 2 }}>✦</span>
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      {[0, 1, 2].map(d => (
        <div key={d} style={{ width: 8, height: 8, borderRadius: '50%', background: C.lime, animation: `pulse 1.3s ease infinite`, animationDelay: `${d * 0.22}s` }} />
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
        if (['landing', 'auth', 'onboard'].includes(page)) setPage('dashboard');
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

  const BASE = { background: C.bg, minHeight: '100vh', color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" };

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
      <Onboard onFinish={handleFinish} />
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
      {page === 'foodlog'   && <FoodLog user={activeUser} logs={activeLogs} addFoodLog={handleAddFoodLog} addCustomFoodLog={handleAddCustomFoodLog} deleteFoodLog={handleDeleteFoodLog} />}
      {page === 'analytics' && <Analytics user={activeUser} logs={activeLogs} />}
      {page === 'chat'      && <Chat user={activeUser} logs={activeLogs} addCustomFoodLog={handleAddCustomFoodLog} />}
      {page === 'profile'   && <Profile user={activeUser} logs={activeLogs} setPage={setPage} signOut={handleSignOut} />}
      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}
