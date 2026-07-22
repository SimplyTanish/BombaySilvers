/**
 * useAuth — subscribes to the Supabase auth state.
 *
 * Returns the current session, user, and a loading flag.
 * Subscribe once at the shell level; use anywhere via this hook.
 */

import { useState, useEffect } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbUser, setDbUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [dealer, setDealer] = useState<any>(null);

  const loadUserData = async (userId: string) => {
    const { data: userData, error } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Failed to load user:", error);
      return;
    }

    setDbUser(userData);
    setRole((userData as any).role);

    const { data: dealerData } = await supabase
      .from("dealers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    setDealer(dealerData);
  };

  useEffect(() => {
    // Seed from persisted session immediately (avoids flash).
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserData(session.user.id);
      }

      setLoading(false);
    });

    // Keep in sync with token refreshes, sign-in, sign-out events.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserData(session.user.id);
      } else {
        setDbUser(null);
        setRole(null);
        setDealer(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  return {
    session,
    user,
    dbUser,
    role,
    dealer,
    loading,
    signOut,
  };
}
