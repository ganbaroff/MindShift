/**
 * shared/services/supabase.js
 *
 * Single source of truth for all Supabase interactions (INVARIANT 1).
 * All operations are explicitly scoped by user_id — RLS enforces the same,
 * but we are explicit in code as a defence-in-depth measure.
 *
 * Sections:
 *   1. Client factory          — getSupabase(), waitForSupabase()
 *   2. Retry queue             — offline-resilient write queue (INVARIANT 2)
 *   3. Thought operations      — sbPushThought(), sbPullThoughts()
 *   4. Persona operations      — sbSavePersona(), sbLoadPersona()
 *
 * Auth operations (signInWithOtp, onAuthStateChange, signOut) are NOT here —
 * they belong to the auth/ feature slice (Sprint 2). Import getSupabase()
 * from here to access the client for auth calls in the meantime.
 */

import { createClient } from "@supabase/supabase-js";

// =============================================================================
// 1. CLIENT FACTORY
// =============================================================================

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let __supaClient = null;

/**
 * Returns the singleton Supabase client, creating it on first call.
 * Returns null if env vars are missing (dev without .env, or misconfigured).
 * @returns {import("@supabase/supabase-js").SupabaseClient|null}
 */
export function getSupabase() {
  if (!__supaClient) {
    try { __supaClient = createClient(SUPA_URL, SUPA_KEY); } catch { return null; }
  }
  return __supaClient;
}

/**
 * Resolves immediately with the client (legacy compat — was async when using CDN).
 * Kept for backward-compatibility with AuthScreen which calls waitForSupabase().
 * @returns {Promise<import("@supabase/supabase-js").SupabaseClient|null>}
 */
export function waitForSupabase() {
  return Promise.resolve(getSupabase());
}

// =============================================================================
// 2. RETRY QUEUE (INVARIANT 2 — no data loss)
// Failed Supabase writes are queued in localStorage and retried on:
//   - window 'online' event
//   - document 'visibilitychange' to visible
// =============================================================================

const RETRY_QUEUE_KEY = "mf_retry_queue";

function getRetryQueue() {
  try { return JSON.parse(localStorage.getItem(RETRY_QUEUE_KEY) || "[]"); } catch { return []; }
}

function saveRetryQueue(q) {
  try { localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(q.slice(0, 50))); } catch {}
}

function enqueueRetry(thought, userId) {
  const q = getRetryQueue();
  const exists = q.some(item => item.t.id === thought.id);
  if (!exists) saveRetryQueue([...q, { t: thought, userId, ts: Date.now() }]);
}

async function drainRetryQueue() {
  const q = getRetryQueue();
  if (!q.length) return;
  const failed = [];
  for (const item of q) {
    const ok = await sbPushThought(item.t, item.userId);
    if (!ok) failed.push(item);
  }
  saveRetryQueue(failed);
}

/**
 * Registers window event listeners for automatic retry queue draining.
 * Call once from App on mount.
 */
export function setupRetryListeners() {
  window.addEventListener("online", drainRetryQueue);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") drainRetryQueue();
  });
}

// =============================================================================
// 3. THOUGHT OPERATIONS
// All queries are scoped to user_id (INVARIANT 1).
// =============================================================================

/**
 * Upserts a single thought to Supabase.
 * On failure, enqueues for retry (INVARIANT 2).
 *
 * @param {object} thought  — app-side thought object
 * @param {string} userId   — auth.uid()
 * @returns {Promise<boolean>} true = success, false = queued for retry
 */
export async function sbPushThought(thought, userId) {
  const sb = getSupabase();
  if (!sb) { enqueueRetry(thought, userId); return false; }

  const { error } = await sb.from("thoughts").upsert({
    uid:             thought.id,
    user_id:         userId,
    raw_text:        thought.rawText,
    normalized_text: thought.text,
    type:            thought.type,
    priority:        thought.priority,
    tags:            thought.tags,
    reminder_at:     thought.reminderAt,
    is_today:        thought.isToday,
    is_archived:     thought.archived,
    source:          thought.source || "app",
    recurrence:      thought.recurrence || null,
    created_at:      thought.createdAt,
    updated_at:      thought.updatedAt,
  }, { onConflict: "uid" });

  if (error) { enqueueRetry(thought, userId); return false; }
  return true;
}

/**
 * Fetches the user's active (non-archived) thoughts from Supabase.
 * Returns an empty array on error (INVARIANT 2 — caller falls back to localStorage).
 *
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
export async function sbPullThoughts(userId) {
  const sb = getSupabase();
  if (!sb) return [];

  const { data } = await sb
    .from("thoughts")
    .select("uid, raw_text, normalized_text, type, priority, tags, reminder_at, is_today, is_archived, created_at, updated_at, source")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(100);

  return (data || []).map(r => ({
    id:         r.uid,
    rawText:    r.raw_text,
    text:       r.normalized_text,
    type:       r.type,
    priority:   r.priority,
    tags:       r.tags || [],
    reminderAt: r.reminder_at,
    isToday:    r.is_today,
    archived:   r.is_archived,
    createdAt:  r.created_at,
    updatedAt:  r.updated_at,
    synced:     true,
    source:     r.source || "app",
  }));
}

// =============================================================================
// 4. PERSONA OPERATIONS
// Persona is the AI character's memory (see ADR 0006).
// =============================================================================

/**
 * Upserts the user's persona to Supabase.
 * Silent on error — persona loss is non-critical (can be rebuilt from thoughts).
 *
 * @param {object} persona  — full persona object (ADR 0006 schema)
 * @param {string} userId
 */
export async function sbSavePersona(persona, userId) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("personas").upsert(
    { user_id: userId, data: persona, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}

/**
 * Loads the user's persona from Supabase.
 * Returns null if not found or on error.
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function sbLoadPersona(userId) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("personas")
    .select("data")
    .eq("user_id", userId)
    .single();
  return data?.data || null;
}
