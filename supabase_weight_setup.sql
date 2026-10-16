-- ╔════════════════════════════════════════════════════════════╗
-- ║  Healthify — Weight Logs Table & Database Optimizations   ║
-- ║  Run this in: Supabase Dashboard → SQL Editor → New Query ║
-- ╚════════════════════════════════════════════════════════════╝

-- ── 1. Create weight_logs table ───────────────────────────────
CREATE TABLE IF NOT EXISTS weight_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight     REAL NOT NULL CHECK (weight > 20 AND weight < 400),
  logged_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, logged_at)
);

-- ── 2. Performance Indexes ────────────────────────────────────
-- Fast range scans for timeline queries (e.g. past 7 days, 30 days, 365 days)
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date
  ON weight_logs (user_id, logged_at DESC);

-- Fast foreign key lookup and cascading operations
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_id
  ON weight_logs (user_id);

-- ── 3. Enable Row Level Security (RLS) ───────────────────────
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

-- ── 4. RLS Policy: Users can only manage their own weight logs
DROP POLICY IF EXISTS "Users manage own weight logs" ON weight_logs;
CREATE POLICY "Users manage own weight logs"
  ON weight_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 5. Auto-update updated_at timestamp on row modification ──
CREATE OR REPLACE FUNCTION update_weight_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_weight_logs_updated_at ON weight_logs;
CREATE TRIGGER trg_weight_logs_updated_at
  BEFORE UPDATE ON weight_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_weight_logs_updated_at();
