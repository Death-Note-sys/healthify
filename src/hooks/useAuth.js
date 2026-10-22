import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get existing session (e.g. after page refresh)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Force-refresh the token so the new JWT's iat aligns with Supabase
        // server time, preventing PGRST303 "JWT issued at future" clock skew errors
        const { data: refreshed } = await supabase.auth.refreshSession();
        setUser(refreshed?.session?.user ?? session.user ?? null);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // 2. Listen for sign-in / sign-out / token refresh
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /** Email + password sign-up */
  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { data, error };
  };

  /** Email + password sign-in */
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  /** Google OAuth sign-in */
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { data, error };
  };

  /** Sign out */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return { user, loading, signUp, signIn, signInWithGoogle, signOut };
}
