import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { AuthContext, type AuthContextValue } from "./auth-context";

interface AuthProviderProps {
  children: ReactNode;
}

function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isActive) {
        setSession(data.session);
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    isLoading,
    isConfigured: isSupabaseConfigured,
    signOut,
  }), [isLoading, session, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
