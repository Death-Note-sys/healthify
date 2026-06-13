-- Run this in Supabase Dashboard -> SQL Editor -> New Query

-- Add micronutrient columns for custom AI foods (using REAL to support decimal values like 2.4mcg)
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS custom_iron REAL;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS custom_calcium REAL;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS custom_vitD REAL;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS custom_vitB12 REAL;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS custom_magnesium REAL;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS custom_zinc REAL;
