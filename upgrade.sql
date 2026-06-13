-- Run this in Supabase Dashboard -> SQL Editor -> New Query

-- 1. Allow food_id to be null (since custom foods don't have an ID in the local DB)
ALTER TABLE food_logs ALTER COLUMN food_id DROP NOT NULL;

-- 2. Add columns to store the AI-generated macros
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS custom_name TEXT;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS custom_cal INTEGER;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS custom_protein INTEGER;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS custom_carbs INTEGER;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS custom_fat INTEGER;
