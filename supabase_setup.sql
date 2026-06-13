-- ╔════════════════════════════════════════════════════════════╗
-- ║  Healthify — Supabase Database Setup                      ║
-- ║  Run this in: Supabase Dashboard → SQL Editor → New Query ║
-- ╚════════════════════════════════════════════════════════════╝

-- ── 1. User profiles (extends Supabase auth.users) ──────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT,
  age        INTEGER,
  weight     REAL,
  height     REAL,
  gender     TEXT CHECK (gender IN ('male', 'female')),
  activity   TEXT,
  goal       TEXT CHECK (goal IN ('cut', 'maintain', 'bulk')),
  calories   INTEGER,
  tdee       INTEGER,
  bmr        INTEGER,
  protein    INTEGER,
  carbs      INTEGER,
  fat        INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Food logs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_id    INTEGER NOT NULL,
  quantity   REAL NOT NULL DEFAULT 1,
  meal_type  TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')) NOT NULL,
  logged_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Water logs (one row per user per day) ─────────────────
CREATE TABLE IF NOT EXISTS water_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  glasses    INTEGER NOT NULL DEFAULT 0,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, date)
);

-- ── 4. Indexes for fast queries ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date
  ON food_logs (user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date
  ON water_logs (user_id, date);

-- ── 5. Row Level Security (users can only access own data) ───
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: full CRUD on own row
CREATE POLICY "Users manage own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Food logs: full CRUD on own rows
CREATE POLICY "Users manage own food logs"
  ON food_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Water logs: full CRUD on own rows
CREATE POLICY "Users manage own water logs"
  ON water_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
