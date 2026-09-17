/**
 * useAuth — subscribes to the Supabase auth state.
 *
 * Returns the current session, user, and a loading flag.
 * Subscribe once at the shell level; use anywhere via this hook.
 */

import { useState, useEffect } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type DbUser = Database["public"]["Tables"]["users"]["Row"];
type Dealer = Database["public"]["Tables"]["dealers"]["Row"];
export type UserRole = DbUser["role"];

export interface UseAuthResult {
  session: Session | null;
  user: User | null;
  dbUser: DbUser | null;
  role: UserRole | null;
  dealer: Dealer | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [dealer, setDealer] = useState<Dealer | null>(null);

  const loadUserData = async (userId: string) => {
    const { data: userData, error } = await supabase
      .from("users")
      .select("id, email, role, full_name, phone, avatar_url, is_active, deleted_at, last_sign_in, created_at, updated_at")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Failed to load user:", error);
      return;
    }

    setDbUser(userData);
    setRole(userData.role);

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

  const signOut = () => supabase.auth.signOut().then(() => undefined);

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