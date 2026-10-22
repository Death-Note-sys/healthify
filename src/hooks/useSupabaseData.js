import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Supabase data hook — manages profiles, food_logs, and water_logs.
 *
 * @param {object|null} authUser  – Supabase auth user (from useAuth)
 * @param {Array}       FOOD_DB  – Client-side food database array
 */
const MEAL_EMOJIS = {
  breakfast: '🍳',
  lunch:     '🥗',
  dinner:    '🍽️',
  snack:     '🍎',
};

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
      // 1. Instantly restore cached profile for this specific user
      const localProfileKey = `healthify_user_profile_${authUser.id}`;
      const authName = authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || '';
      try {
        const cachedProf = localStorage.getItem(localProfileKey);
        if (cachedProf) {
          const parsed = JSON.parse(cachedProf);
          if (parsed && typeof parsed === 'object') {
            if ((!parsed.name || parsed.name === 'User') && authName) {
              parsed.name = authName;
            }
            setProfile(parsed);
          }
        }
      } catch (e) {}

      // 2. Instantly restore cached food logs for this specific user
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

  // ── JWT clock-skew auto-heal ──────────────────────────────
  // If Supabase returns PGRST303 ("JWT issued at future") due to clock drift,
  // refresh the session token and retry the query once automatically.
  const refreshAndRetry = async (queryFn) => {
    const result = await queryFn();
    const err = result?.error;
    if (err && (err.code === 'PGRST303' || err.message?.includes('JWT'))) {
      console.warn('[Auth] JWT clock skew detected, refreshing session...');
      await supabase.auth.refreshSession();
      return queryFn(); // retry once with the fresh token
    }
    return result;
  };

  // ── Profile ───────────────────────────────────────────────
  const loadProfile = async () => {
    if (!authUser?.id) return;
    const localProfileKey = `healthify_user_profile_${authUser.id}`;
    const authName = authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || '';

    // Read local cache first for instant responsiveness
    try {
      const cached = localStorage.getItem(localProfileKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          if ((!parsed.name || parsed.name === 'User') && authName) {
            parsed.name = authName;
          }
          setProfile(parsed);
        }
      }
    } catch (e) {}

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.warn("loadProfile error:", error.message || error);
      }
      
      if (data) {
        // Heal name if corrupted to 'User' or missing
        if ((!data.name || data.name === 'User') && authName) {
          data.name = authName;
          supabase.from('profiles').update({ name: authName }).eq('id', authUser.id).then(() => {});
        }
        setProfile(data);
        try {
          localStorage.setItem(localProfileKey, JSON.stringify(data));
        } catch (e) {}
      }
    } catch (err) {
      console.warn("loadProfile network exception:", err);
    }
  };

  const saveProfile = async (profileData) => {
    if (!authUser?.id) return { data: null, error: new Error('User not logged in') };
    const localProfileKey = `healthify_user_profile_${authUser.id}`;

    // 1. Retrieve current existing profile from state or local cache to prevent data loss
    let current = profile || {};
    try {
      const cached = localStorage.getItem(localProfileKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          current = { ...parsed, ...current };
        }
      }
    } catch (e) {}

    // Resolve name: prioritize non-empty profileData, then existing profile, then auth user metadata
    const authName = authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || '';
    let resolvedName = profileData.name !== undefined ? profileData.name : current.name;
    if (!resolvedName || resolvedName === 'User') {
      resolvedName = authName || current.name || 'User';
    }

    const resolvedAge      = parseInt(profileData.age !== undefined ? profileData.age : current.age, 10) || 23;
    const resolvedWeight   = parseFloat(profileData.weight !== undefined ? profileData.weight : current.weight) || 75;
    const resolvedHeight   = parseFloat(profileData.height !== undefined ? profileData.height : current.height) || 175;
    const resolvedGender   = (profileData.gender !== undefined ? profileData.gender : current.gender) === 'female' ? 'female' : 'male';
    const resolvedActivity = profileData.activity !== undefined ? profileData.activity : (current.activity || 'moderate');
    
    const candidateGoal = profileData.goal !== undefined ? profileData.goal : current.goal;
    const resolvedGoal  = ['cut', 'bulk', 'maintain'].includes(candidateGoal) ? candidateGoal : (current.goal || 'maintain');

    // Calculate baseline nutrition if needed
    const s = resolvedGender === 'male' ? 5 : -161;
    const bmrCalc = Math.round(10 * resolvedWeight + 6.25 * resolvedHeight - 5 * resolvedAge + s);
    const actMults = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very: 1.9 };
    const tdeeCalc = Math.round(bmrCalc * (actMults[resolvedActivity] || 1.55));
    const goalAdj = resolvedGoal === 'cut' ? -500 : resolvedGoal === 'bulk' ? 300 : 0;
    const calCalc = Math.round(tdeeCalc + goalAdj);
    const pMult = resolvedGoal === 'cut' ? 2.2 : resolvedGoal === 'bulk' ? 2.0 : 1.8;
    const protCalc = Math.round(resolvedWeight * pMult);
    const rem = calCalc - protCalc * 4;
    const fatCalc = Math.round((rem * 0.28) / 9);
    const carbsCalc = Math.round((rem * 0.72) / 4);

    const metricsChanged = 
      (profileData.goal !== undefined && profileData.goal !== current.goal) ||
      (profileData.weight !== undefined && profileData.weight !== current.weight) ||
      (profileData.height !== undefined && profileData.height !== current.height) ||
      (profileData.age !== undefined && profileData.age !== current.age) ||
      (profileData.activity !== undefined && profileData.activity !== current.activity) ||
      (profileData.gender !== undefined && profileData.gender !== current.gender);

    const resolvedCalories = Math.round(profileData.calories !== undefined ? profileData.calories : (metricsChanged || !current.calories ? calCalc : current.calories));
    const resolvedTdee     = Math.round(profileData.tdee !== undefined ? profileData.tdee : (metricsChanged || !current.tdee ? tdeeCalc : current.tdee));
    const resolvedBmr      = Math.round(profileData.bmr !== undefined ? profileData.bmr : (metricsChanged || !current.bmr ? bmrCalc : current.bmr));
    const resolvedProtein  = Math.round(profileData.protein !== undefined ? profileData.protein : (metricsChanged || !current.protein ? protCalc : current.protein));
    const resolvedCarbs    = Math.round(profileData.carbs !== undefined ? profileData.carbs : (metricsChanged || !current.carbs ? carbsCalc : current.carbs));
    const resolvedFat      = Math.round(profileData.fat !== undefined ? profileData.fat : (metricsChanged || !current.fat ? fatCalc : current.fat));

    const cleanProfile = {
      name:     resolvedName,
      age:      resolvedAge,
      weight:   resolvedWeight,
      height:   resolvedHeight,
      gender:   resolvedGender,
      activity: resolvedActivity,
      goal:     resolvedGoal,
      calories: resolvedCalories,
      tdee:     resolvedTdee,
      bmr:      resolvedBmr,
      protein:  resolvedProtein,
      carbs:    resolvedCarbs,
      fat:      resolvedFat,
    };

    // Optimistic UI update & immediate local persistence
    const optimisticProfile = { id: authUser.id, ...cleanProfile, updated_at: new Date().toISOString() };
    setProfile(optimisticProfile);
    try {
      localStorage.setItem(localProfileKey, JSON.stringify(optimisticProfile));
    } catch (e) {}

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          ...cleanProfile,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        console.warn("saveProfile Supabase error:", error.message || error);
      }
      
      if (!error && data) {
        setProfile(data);
        try {
          localStorage.setItem(localProfileKey, JSON.stringify(data));
        } catch (e) {}
        return { data, error: null };
      }
      return { data: optimisticProfile, error };
    } catch (err) {
      console.warn("saveProfile network exception:", err);
      return { data: optimisticProfile, error: err };
    }
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
    const mealTypeKey = (row.meal_type || 'snack').toLowerCase();
    const mealEmoji = MEAL_EMOJIS[mealTypeKey] || '🍽️';

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
          e: mealEmoji,
          unit: 'custom',
        },
        qty: row.quantity || 1,
        mealType: mealTypeKey,
        date: rawDate,
        logged_at: rawDate,
      };
    }
    const matched = FOOD_DB.find((f) => f.id === row.food_id);
    return {
      id:       row.id,
      food:     matched || { ...FOOD_DB[0], name: row.custom_name || FOOD_DB[0].name, cal: row.custom_cal || FOOD_DB[0].cal, protein: row.custom_protein || FOOD_DB[0].protein, e: matched?.e || mealEmoji },
      qty:      row.quantity || 1,
      mealType: mealTypeKey,
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
    const mealTypeKey = (mealType || 'snack').toLowerCase();
    const mealEmoji = MEAL_EMOJIS[mealTypeKey] || '🍎';
    const foodEmoji = (customFood.e && customFood.e !== '✨') ? customFood.e : mealEmoji;

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
        e: foodEmoji,
        unit: 'custom',
      },
      qty,
      mealType: mealTypeKey,
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
    const { data, error } = await supabase
      .from('water_logs')
      .select('glasses')
      .eq('user_id', authUser.id)
      .eq('date', today)
      .single();
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (normal for first log of the day)
      console.warn('loadWater error:', error.code, error.message);
    }
    setWater(data?.glasses || 0);
  };

  const saveWater = async (glasses) => {
    const prev = water;
    setWater(glasses);                       // optimistic UI update
    const today = new Date().toISOString().split('T')[0];
    const payload = { user_id: authUser.id, glasses, date: today };
    const { error } = await refreshAndRetry(() =>
      supabase.from('water_logs').upsert(payload, { onConflict: 'user_id,date' })
    );
    if (error) {
      console.error('saveWater sync error:', error.code, error.message);
      setWater(prev);                        // rollback optimistic update
    }
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

    // Also update profile weight if logged for today (target ONLY weight column, preserving all profile attributes)
    if (logDate === today) {
      setProfile((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, weight: numWeight, updated_at: new Date().toISOString() };
        try {
          localStorage.setItem(`healthify_user_profile_${authUser.id}`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      supabase
        .from('profiles')
        .update({ weight: numWeight, updated_at: new Date().toISOString() })
        .eq('id', authUser.id)
        .then(({ error: profErr }) => {
          if (profErr) console.warn('Could not sync weight to profile table:', profErr.message);
        });
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
