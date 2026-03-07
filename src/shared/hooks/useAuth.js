/**
 * shared/hooks/useAuth.js
 * Authentication state hook — single source of truth for session.
 *
 * Bolt 2.3: email/password auth (Supabase Auth).
 *
 * Responsibilities:
 *   - Subscribe to Supabase onAuthStateChange on mount
 *   - Expose: user, authLoading, signIn, signUp, signOut
 *
 * Security (codelably-security-review):
 *   - Never stores password in state or localStorage
 *   - Session tokens managed by Supabase SDK (localStorage under the hood)
 *   - All auth calls go through waitForSupabase() (single entry point rule)
 *   - signOut clears server-side session; caller clears app state
 *
 * Exports: useAuth
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { waitForSupabase } from "../services/supabase.js";
import { logError }        from "../lib/logger.js";

/**
 * @returns {{
 *   user: import("@supabase/supabase-js").User | null,
 *   authLoading: boolean,
 *   signIn: (email: string, password: string) => Promise<void>,
 *   signUp: (email: string, password: string) => Promise<void>,
 *   signOut: () => Promise<void>,
 * }}
 */
export function useAuth() {
  const [user,        setUser]        = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // true until first session check
  const subRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    waitForSupabase()
      .then(sb => {
        if (!sb || cancelled) { setAuthLoading(false); return; }

        // Resolve existing session first (prevents auth-screen flash on refresh)
        sb.auth.getSession()
          .then(({ data: { session } }) => {
            if (!cancelled) setUser(session?.user ?? null);
          })
          .catch(e => logError("useAuth.getSession", e))
          .finally(() => { if (!cancelled) setAuthLoading(false); });

        // Subscribe to all auth events (sign-in, sign-out, token refresh)
        const { data } = sb.auth.onAuthStateChange((_, session) => {
          if (!cancelled) setUser(session?.user ?? null);
        });
        subRef.current = data.subscription;
      })
      .catch(e => {
        logError("useAuth.init", e);
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
      subRef.current?.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email + password.
   * Throws on failure — caller handles error display.
   * @param {string} email
   * @param {string} password
   */
  const signIn = useCallback(async (email, password) => {
    const sb = await waitForSupabase();
    if (!sb) throw new Error("no_client");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // user is updated by onAuthStateChange
  }, []);

  /**
   * Register with email + password.
   * Requires email confirmation to be OFF in Supabase dashboard for MVP.
   * If confirmation is ON, returns { needsConfirmation: true }.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ needsConfirmation?: boolean }>}
   */
  const signUp = useCallback(async (email, password) => {
    const sb = await waitForSupabase();
    if (!sb) throw new Error("no_client");
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    // If email confirmation is ON, identities array is empty
    const needsConfirmation = !data.session && data.user?.identities?.length === 0;
    return { needsConfirmation };
  }, []);

  /**
   * Sign out — clears Supabase session.
   * Caller must clear app state (thoughts, persona) separately.
   */
  const signOut = useCallback(async () => {
    const sb = await waitForSupabase();
    if (!sb) return;
    const { error } = await sb.auth.signOut();
    if (error) logError("useAuth.signOut", error);
    // user set to null by onAuthStateChange
  }, []);

  return { user, authLoading, signIn, signUp, signOut };
}
