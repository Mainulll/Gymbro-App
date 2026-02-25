import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * Subscribes to Supabase auth state changes and keeps the current
 * session in local React state.  Returns null while loading (initial
 * getSession call) and then either a Session object or null if signed out.
 */
export function useSupabaseSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the existing session (e.g. restored from AsyncStorage)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Listen for future sign-in / sign-out events
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
