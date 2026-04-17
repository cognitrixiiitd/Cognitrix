import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { queryClientInstance } from "@/lib/query-client";

const AuthContext = createContext(null);

const AUTH_TIMEOUT_MS = 10000; // 10 second safety net

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Safety timeout: if auth doesn't resolve in 10s, force-unblock the UI
    timeoutRef.current = setTimeout(() => {
      setIsLoadingAuth((prev) => {
        if (prev) {
          console.warn("[Auth] Timed out waiting for session — unblocking UI");
          setAuthTimedOut(true);
          return false;
        }
        return prev;
      });
    }, AUTH_TIMEOUT_MS);

    // Single source of truth: onAuthStateChange handles INITIAL_SESSION + all subsequent events
    // This eliminates the race condition between getSession() and onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        setSession(s);
        if (s?.user) {
          setUser(s.user);
          setIsAuthenticated(true);
          // fetchProfile in try/catch so it never blocks isLoadingAuth
          try {
            // Do not await fetchProfile to prevent hanging the auth listener if the DB calls get stuck
            fetchProfile(s.user.id, s.user.user_metadata, s.user.email).catch(err => {
              console.error("[Auth] fetchProfile failed:", err);
            });
          } catch (err) {
            console.error("[Auth] fetchProfile dispatch failed:", err);
          }
        } else {
          setUser(null);
          setProfile(null);
          setIsAuthenticated(false);
        }
        setIsLoadingAuth(false);
        setAuthTimedOut(false);
        // Clear the safety timeout since auth resolved normally
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const fetchProfile = async (userId, userMetadata = null, userEmail = null) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[Auth] Profile fetch error:", error);
      // Don't throw — let auth continue without profile
      return;
    }

    if (data) {
      // Fix 3: Check if account is paused — sign out immediately
      if (data.account_status === "paused") {
        await supabase.auth.signOut();
        setSuspended(true);
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
        return;
      }

      // Fix 4: Backfill email for existing users who don't have it in profiles
      if (!data.email && userEmail) {
        supabase
          .from("profiles")
          .update({ email: userEmail })
          .eq("id", userId)
          .then(({ error: updateErr }) => {
            if (updateErr) console.error("[Auth] Email backfill error:", updateErr);
          });
        data.email = userEmail;
      }

      setProfile(data);
    } else if (userMetadata) {
      // Profile doesn't exist yet — first-time login, create it
      try {
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            full_name: userMetadata.full_name || "User",
            role: userMetadata.role || "student",
            email: userEmail || null,
          })
          .select()
          .single();

        if (!insertError && newProfile) {
          setProfile(newProfile);
        } else if (insertError) {
          console.error("[Auth] Profile insert error:", insertError);
        }
      } catch (err) {
        console.error("[Auth] Profile insert exception:", err);
      }
    }
  };

  const signIn = async (email, password) => {
    setSuspended(false);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "student",
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    // 1. Sign out from Supabase (clears server session + cookies)
    await supabase.auth.signOut();

    // 2. Clear all local state
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsAuthenticated(false);

    // 3. Flush React Query cache — prevents stale data on re-login
    queryClientInstance.clear();

    // 4. Clear any lingering auth data from localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("sb-") || key.includes("supabase")) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      // localStorage might not be available
    }
  };

  const retryAuth = () => {
    setIsLoadingAuth(true);
    setAuthTimedOut(false);
    setSuspended(false);
    // Force a fresh session check
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s?.user) {
        setSession(s);
        setUser(s.user);
        setIsAuthenticated(true);
        fetchProfile(s.user.id, s.user.user_metadata, s.user.email).catch(() => {});
      }
      setIsLoadingAuth(false);
    }).catch(() => {
      setIsLoadingAuth(false);
    });
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isAuthenticated,
        isLoadingAuth,
        authTimedOut,
        suspended,
        isLoadingPublicSettings: false,
        authError: null,
        signIn,
        signUp,
        signOut,
        retryAuth,
        // Legacy compat
        logout: signOut,
        navigateToLogin: () => {},
        checkAppState: () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
