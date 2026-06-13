import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("1. Signing up a test user...");
  const email = `test_${Date.now()}@gmail.com`;
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });

  if (authErr) {
    console.error("Auth error:", authErr.message);
    return;
  }

  const userId = authData.user.id;
  console.log("Created user:", userId);

  console.log("2. Attempting to save profile...");
  const profileData = {
    name: 'Test', age: 25, weight: 70, height: 175, gender: 'male',
    activity: 'moderate', goal: 'maintain', calories: 2000,
    tdee: 2000, bmr: 1600, protein: 140, carbs: 200, fat: 60
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ...profileData,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("UPSERT FAILED:", error);
  } else {
    console.log("UPSERT SUCCESS:", data);
  }
}

test();
