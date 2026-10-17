import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Supabase data hook — manages profiles, food_logs, and water_logs.
 *
 * @param {object|null} authUser  – Supabase auth user (from useAuth)
 * @param {Array}       FOOD_DB  – Client-side food database array
 */
export function useSupabaseData(authUser, FOOD_DB) {
  const [profile, setProfile]       = useState(null);
  const [logs, setLogs]             = useState([]);
  const [water, setWater]           = useState(0);
  const [weightLogs, setWeightLogs] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeUserId, setActiveUserId] = useState(null);

  // ── Load everything when auth user changes ────────────────
  useEffect(() => {
    setActiveUserId(authUser?.id || null);
    if (authUser) {
      // 1. Instantly restore cached food logs for this specific user
      const localLogsKey = `healthify_user_logs_${authUser.id}`;
      try {
        const cached = localStorage.getItem(localLogsKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLogs(parsed);
          }
        }
      } catch (e) {}

      loadAll();
    } else {
      setProfile(null);
      setLogs([]);
      setWater(0);
      setWeightLogs([]);
      setLoading(false);
    }
  }, [authUser?.id]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadProfile(), loadLogs(), loadWater(), loadWeightLogs()]);
    setLoading(false);
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
    }
    
    if (!error && data) setProfile(data);
    return { data, error };
  };

  // ── Food logs (load past 30 days for full analytics & trends) ─────────────────
  const loadLogs = async () => {
    if (!authUser?.id) return;
    const localKey = `healthify_user_logs_${authUser.id}`;

    // Read local cache first for instant responsiveness
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLogs(parsed);
        }
      }
    } catch (e) {}

    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);

    try {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', authUser.id)
        .gte('logged_at', start.toISOString())
        .order('logged_at', { ascending: true });

      if (error) {
        console.warn("loadLogs error from Supabase:", error.message || error);
        // Retain existing local logs if Supabase query encounters an error
        return;
      }

      if (data) {
        const mappedFromDb = data.map(mapLog);
        setLogs((prev) => {
          const mapById = new Map();
          (prev || []).forEach(l => {
            const key = l.id || `${l.date}_${l.food?.name}`;
            mapById.set(String(key), l);
          });
          mappedFromDb.forEach(l => {
            mapById.set(String(l.id), l);
          });
          const merged = Array.from(mapById.values());
          merged.sort((a, b) => new Date(a.date || a.logged_at) - new Date(b.date || b.logged_at));
          try {
            localStorage.setItem(localKey, JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    } catch (err) {
      console.warn("loadLogs exception:", err);
    }
  };

  /** Map a Supabase food_log row → the shape components expect */
  const mapLog = (row) => {
    const rawDate = row.logged_at || row.created_at || row.date || new Date().toISOString();
    if (!row.food_id && row.custom_name) {
      return {
        id: row.id,
        food: {
          id: 9999,
          name: row.custom_name,
          cal: row.custom_cal || 0,
          protein: row.custom_protein || 0,
          carbs: row.custom_carbs || 0,
          fat: row.custom_fat || 0,
          iron: row.custom_iron || 0,
          calcium: row.custom_calcium || 0,
          vitD: row.custom_vitd || row.custom_vitD || 0,
          vitB12: row.custom_vitb12 || row.custom_vitB12 || 0,
          magnesium: row.custom_magnesium || 0,
          zinc: row.custom_zinc || 0,
          e: '✨',
          unit: 'custom',
        },
        qty: row.quantity || 1,
        mealType: row.meal_type || 'snack',
        date: rawDate,
        logged_at: rawDate,
      };
    }
    const matched = FOOD_DB.find((f) => f.id === row.food_id);
    return {
      id:       row.id,
      food:     matched || { ...FOOD_DB[0], name: row.custom_name || FOOD_DB[0].name, cal: row.custom_cal || FOOD_DB[0].cal, protein: row.custom_protein || FOOD_DB[0].protein },
      qty:      row.quantity || 1,
      mealType: row.meal_type || 'snack',
      date:     rawDate,
      logged_at: rawDate,
    };
  };

  const addFoodLog = async (food, qty, mealType) => {
    const tempId = 'temp_' + Date.now();
    const nowIso = new Date().toISOString();
    const optimisticLog = {
      id: tempId,
      food,
      qty,
      mealType,
      date: nowIso,
      logged_at: nowIso,
    };

    setLogs((prev) => {
      const next = [...prev, optimisticLog];
      if (authUser?.id) {
        try {
          localStorage.setItem(`healthify_user_logs_${authUser.id}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    try {
      const { data, error } = await supabase
        .from('food_logs')
        .insert({
          user_id:   authUser.id,
          food_id:   food.id,
          quantity:  qty,
          meal_type: mealType,
          logged_at: nowIso,
        })
        .select()
        .single();

      if (error) {
        console.error("addFoodLog supabase error:", error);
        return { data: optimisticLog, error };
      }

      if (data) {
        const serverLog = mapLog(data);
        setLogs((prev) => {
          const next = prev.map((l) => (l.id === tempId ? serverLog : l));
          if (authUser?.id) {
            try {
              localStorage.setItem(`healthify_user_logs_${authUser.id}`, JSON.stringify(next));
            } catch (e) {}
          }
          return next;
        });
        return { data: serverLog, error: null };
      }
      return { data: optimisticLog, error: null };
    } catch (err) {
      console.error("addFoodLog network error:", err);
      return { data: optimisticLog, error: err };
    }
  };

  const addCustomFoodLog = async (customFood, qty, mealType) => {
    const tempId = 'temp_' + Date.now();
    const nowIso = new Date().toISOString();
    const optimisticLog = {
      id: tempId,
      food: {
        id: 9999,
        name: customFood.name,
        cal: Math.round(customFood.cal || 0),
        protein: Math.round(customFood.protein || 0),
        carbs: Math.round(customFood.carbs || 0),
        fat: Math.round(customFood.fat || 0),
        iron: parseFloat(customFood.iron) || 0,
        calcium: parseFloat(customFood.calcium) || 0,
        vitD: parseFloat(customFood.vitD) || 0,
        vitB12: parseFloat(customFood.vitB12) || 0,
        magnesium: parseFloat(customFood.magnesium) || 0,
        zinc: parseFloat(customFood.zinc) || 0,
        e: customFood.e || '✨',
        unit: 'custom',
      },
      qty,
      mealType,
      date: nowIso,
      logged_at: nowIso,
    };

    setLogs((prev) => {
      const next = [...prev, optimisticLog];
      if (authUser?.id) {
        try {
          localStorage.setItem(`healthify_user_logs_${authUser.id}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    try {
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
          logged_at:      nowIso,
        })
        .select()
        .single();

      if (error) {
        console.error("addCustomFoodLog supabase error:", error);
        return { data: optimisticLog, error };
      }

      if (data) {
        const serverLog = mapLog(data);
        setLogs((prev) => {
          const next = prev.map((l) => (l.id === tempId ? serverLog : l));
          if (authUser?.id) {
            try {
              localStorage.setItem(`healthify_user_logs_${authUser.id}`, JSON.stringify(next));
            } catch (e) {}
          }
          return next;
        });
        return { data: serverLog, error: null };
      }
      return { data: optimisticLog, error: null };
    } catch (err) {
      console.error("addCustomFoodLog network error:", err);
      return { data: optimisticLog, error: err };
    }
  };

  const deleteFoodLog = async (logId) => {
    setLogs((prev) => {
      const next = prev.filter((l) => l.id !== logId);
      if (authUser?.id) {
        try {
          localStorage.setItem(`healthify_user_logs_${authUser.id}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    try {
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', logId);
      return { error };
    } catch (err) {
      console.error("deleteFoodLog error:", err);
      return { error: err };
    }
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

  // ── Weight logs ───────────────────────────────────────────
  const loadWeightLogs = async () => {
    try {
      const localKey = `healthify_weight_logs_${authUser.id}`;
      const cached = localStorage.getItem(localKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setWeightLogs(parsed);
        } catch (e) {}
      }

      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', authUser.id)
        .order('logged_at', { ascending: true });

      if (!error && data) {
        setWeightLogs(data);
        localStorage.setItem(localKey, JSON.stringify(data));
      } else if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
        console.warn('loadWeightLogs error:', error.message);
      }
    } catch (err) {
      console.warn('loadWeightLogs error:', err);
    }
  };

  const saveWeightLog = async (weightVal, dateStr = null) => {
    const today = new Date().toISOString().split('T')[0];
    const logDate = dateStr || today;
    const numWeight = parseFloat(Number(weightVal).toFixed(1));

    if (isNaN(numWeight) || numWeight <= 0) return { error: { message: 'Invalid weight value' } };

    // Optimistic UI update
    setWeightLogs((prev) => {
      const existingIdx = prev.findIndex((l) => l.logged_at === logDate);
      let updated;
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], weight: numWeight };
      } else {
        updated = [...prev, { id: 'temp_' + Date.now(), user_id: authUser.id, weight: numWeight, logged_at: logDate }];
        updated.sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
      }
      try {
        localStorage.setItem(`healthify_weight_logs_${authUser.id}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Also update profile weight if logged for today
    if (logDate === today) {
      saveProfile({ weight: numWeight });
    }

    try {
      const { data, error } = await supabase
        .from('weight_logs')
        .upsert(
          {
            user_id:   authUser.id,
            weight:    numWeight,
            logged_at: logDate,
          },
          { onConflict: 'user_id,logged_at' }
        )
        .select()
        .single();

      if (!error && data) {
        setWeightLogs((prev) => {
          const next = prev.map((l) => (l.logged_at === logDate ? data : l));
          try {
            localStorage.setItem(`healthify_weight_logs_${authUser.id}`, JSON.stringify(next));
          } catch (e) {}
          return next;
        });
        return { data, error: null };
      }
      return { data: null, error };
    } catch (err) {
      console.warn('saveWeightLog error:', err);
      return { data: null, error: err };
    }
  };

  const deleteWeightLog = async (logIdOrDate) => {
    setWeightLogs((prev) => {
      const filtered = prev.filter((l) => l.id !== logIdOrDate && l.logged_at !== logIdOrDate);
      try {
        localStorage.setItem(`healthify_weight_logs_${authUser.id}`, JSON.stringify(filtered));
      } catch (e) {}
      return filtered;
    });

    try {
      await supabase
        .from('weight_logs')
        .delete()
        .eq('user_id', authUser.id)
        .or(`id.eq.${logIdOrDate},logged_at.eq.${logIdOrDate}`);
    } catch (err) {
      console.warn('deleteWeightLog error:', err);
    }
  };

  return {
    profile,
    logs,
    water,
    weightLogs,
    loading: loading || ((authUser?.id || null) !== activeUserId),
    saveProfile,
    addFoodLog,
    addCustomFoodLog,
    deleteFoodLog,
    saveWater,
    saveWeightLog,
    deleteWeightLog,
    refreshAll: loadAll,
  };
}
