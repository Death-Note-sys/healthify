import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Supabase data hook — manages profiles, food_logs, and water_logs.
 *
 * @param {object|null} authUser  – Supabase auth user (from useAuth)
 * @param {Array}       FOOD_DB  – Client-side food database array
 */
export function useSupabaseData(authUser, FOOD_DB) {
  const [profile, setProfile] = useState(null);
  const [logs, setLogs]       = useState([]);
  const [water, setWater]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState(null);

  // ── Load everything when auth user changes ────────────────
  useEffect(() => {
    setActiveUserId(authUser?.id || null);
    if (authUser) {
      loadAll();
    } else {
      setProfile(null);
      setLogs([]);
      setWater(0);
      setLoading(false);
    }
  }, [authUser?.id]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadProfile(), loadLogs(), loadWater()]);
    setLoading(false);
    setChecked(true);
  };

  // ── Profile ───────────────────────────────────────────────
  const loadProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error("loadProfile err", error);
      alert("loadProfile error: " + error.message);
    }
    
    if (data) {
      console.log("loadProfile success:", data);
    } else {
      console.log("loadProfile returned no data. user id:", authUser.id);
    }
    
    setProfile(data);
  };

  const saveProfile = async (profileData) => {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error("saveProfile error:", error);
      alert("Failed to save profile: " + error.message);
    }
    
    if (!error && data) setProfile(data);
    return { data, error };
  };

  // ── Food logs (load 7 days for Analytics) ─────────────────
  const loadLogs = async () => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', authUser.id)
      .gte('logged_at', start.toISOString())
      .order('logged_at', { ascending: true });

    const mapped = (data || []).map(mapLog);
    setLogs(mapped);
  };

  /** Map a Supabase food_log row → the shape components expect */
  const mapLog = (row) => {
    if (!row.food_id && row.custom_name) {
      return {
        id: row.id,
        food: {
          id: 9999,
          name: row.custom_name,
          cal: row.custom_cal,
          protein: row.custom_protein,
          carbs: row.custom_carbs,
          fat: row.custom_fat,
          iron: row.custom_iron,
          calcium: row.custom_calcium,
          vitD: row.custom_vitd,
          vitB12: row.custom_vitb12,
          magnesium: row.custom_magnesium,
          zinc: row.custom_zinc,
          e: '✨',
          unit: 'custom',
        },
        qty: row.quantity,
        mealType: row.meal_type,
        date: row.logged_at,
      };
    }
    return {
      id:       row.id,
      food:     FOOD_DB.find((f) => f.id === row.food_id) || FOOD_DB[0],
      qty:      row.quantity,
      mealType: row.meal_type,
      date:     row.logged_at,
    };
  };

  const addFoodLog = async (food, qty, mealType) => {
    const { data, error } = await supabase
      .from('food_logs')
      .insert({
        user_id:   authUser.id,
        food_id:   food.id,
        quantity:  qty,
        meal_type: mealType,
      })
      .select()
      .single();

    if (!error && data) {
      setLogs((prev) => [...prev, mapLog(data)]);
    }
    return { data, error };
  };

  const addCustomFoodLog = async (customFood, qty, mealType) => {
    const { data, error } = await supabase
      .from('food_logs')
      .insert({
        user_id:        authUser.id,
        food_id:        null,
        quantity:       qty,
        meal_type:      mealType,
        custom_name:    customFood.name,
        custom_cal:     Math.round(customFood.cal || 0),
        custom_protein: Math.round(customFood.protein || 0),
        custom_carbs:   Math.round(customFood.carbs || 0),
        custom_fat:     Math.round(customFood.fat || 0),
        custom_iron:      parseFloat(customFood.iron) || 0,
        custom_calcium:   parseFloat(customFood.calcium) || 0,
        custom_vitd:      parseFloat(customFood.vitD) || 0,
        custom_vitb12:    parseFloat(customFood.vitB12) || 0,
        custom_magnesium: parseFloat(customFood.magnesium) || 0,
        custom_zinc:      parseFloat(customFood.zinc) || 0,
      })
      .select()
      .single();

    if (!error && data) {
      setLogs((prev) => [...prev, mapLog(data)]);
    }
    return { data, error };
  };

  const deleteFoodLog = async (logId) => {
    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('id', logId);
    if (!error) {
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    }
    return { error };
  };

  // ── Water logs ────────────────────────────────────────────
  const loadWater = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('water_logs')
      .select('glasses')
      .eq('user_id', authUser.id)
      .eq('date', today)
      .single();
    setWater(data?.glasses || 0);
  };

  const saveWater = async (glasses) => {
    setWater(glasses);                       // optimistic UI update
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('water_logs').upsert(
      {
        user_id: authUser.id,
        glasses,
        date:    today,
      },
      { onConflict: 'user_id,date' },
    );
  };

  return {
    profile,
    logs,
    water,
    loading: loading || ((authUser?.id || null) !== activeUserId),
    saveProfile,
    addFoodLog,
    addCustomFoodLog,
    deleteFoodLog,
    saveWater,
    refreshAll: loadAll,
  };
}
