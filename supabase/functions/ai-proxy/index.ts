/**
 * supabase/functions/ai-proxy/index.ts
 * MindFocus — AI Proxy Edge Function (Bolt 4.3, ADR 0015)
 *
 * Bolt 4.4 (ADR 0016): Added server-side per-user rate limiting.
 * After JWT validation the function checks usage_limits for today's count.
 * Limit exceeded → 429 { error: "limit_reached", action }.
 * Pro users (user_profiles.is_pro) bypass limits.
 * All DB failures are fail-open — users are never blocked by DB errors.
 *
 * Deploy:
 *   supabase functions deploy ai-proxy
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
 *
 * Environment (auto-injected by Supabase Edge runtime):
 *   SUPABASE_URL            — project URL
 *   SUPABASE_ANON_KEY       — public anon key
 *   ANTHROPIC_API_KEY       — set via supabase secrets (never in .env)
 */

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Constants ───────────────────────────────────────────────────────────────

const ANTHROPIC_KEY      = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION  = "2023-06-01";

// Supabase Edge Functions require CORS headers for browser clients.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Rate Limit Config (Bolt 4.4, ADR 0016) ─────────────────────────────────
//
// Maps client action names → existing usage_limits column + free tier daily cap.
// Columns from migrations 004 + 006 — no new migrations needed.
//
// NOTE: Spec named the generic bucket "daily_ai_calls" but the actual DB
// columns are granular (day_plan_calls / evening_review_calls). We map to
// the correct existing column per action — see ADR 0016 for rationale.
//
// Pro users (user_profiles.is_pro = true) bypass all limits.
// Unknown / missing actions are not rate-limited (fail-open by omission).

type LimitConfig = { col: string; limit: number };

const ACTION_LIMIT: Record<string, LimitConfig> = {
  parseDump:             { col: "day_plan_calls",       limit: 3 },
  aiFocusSuggest:        { col: "day_plan_calls",       limit: 3 },
  generateEveningReview: { col: "evening_review_calls", limit: 1 },
  personaDialogue:       { col: "persona_calls",        limit: 5 },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/** Returns today's date as "YYYY-MM-DD" in UTC — matches usage_limits.date. */
function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Handler ─────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  // CORS preflight — browsers send OPTIONS before the actual POST.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // ── JWT Authentication (Bolt 4.3, ADR 0015) ────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized — missing Bearer token" }, 401);
    }

    // Verify JWT against Supabase Auth. RLS is scoped to this user.
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return jsonResponse({ error: "Unauthorized — invalid token" }, 401);
    }

    // ── Parse Request Body ─────────────────────────────────────────────────
    // Strip the MindFocus-specific `action` field before forwarding to Anthropic.
    // Anthropic does not accept unknown top-level fields.
    const { action, ...anthropicBody } = await req.json();

    const limitInfo: LimitConfig | undefined =
      typeof action === "string" ? ACTION_LIMIT[action] : undefined;

    // ── Pro User Check (Bolt 4.4, ADR 0016) ───────────────────────────────
    // Pro users bypass all rate limits. Fail-open: if we cannot verify Pro
    // status, apply limits (conservative — no business logic bypassed).
    let isPro = false;
    if (limitInfo) {
      try {
        const { data: profile, error: profileErr } = await sb
          .from("user_profiles")
          .select("is_pro")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profileErr) {
          console.error("[ai-proxy] profile check error:", profileErr);
        } else {
          isPro = profile?.is_pro === true;
        }
      } catch (profileEx) {
        console.error("[ai-proxy] profile check exception:", profileEx);
        // fail-open: apply limits (conservative)
      }
    }

    // ── Server-Side Rate Limit Check (Bolt 4.4, ADR 0016) ─────────────────
    // Read today's usage row. Fail-open on any DB error — users are never
    // blocked by infrastructure failures (ADR 0009 fail-open principle).
    let usageRow: Record<string, number> | null = null;
    let usageReadOk = false;
    const today = utcToday();

    if (limitInfo && !isPro) {
      try {
        const { data, error: readErr } = await sb
          .from("usage_limits")
          .select("day_plan_calls, evening_review_calls, persona_calls")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();

        if (readErr) {
          console.error("[ai-proxy] usage_limits read error:", readErr);
          // fail-open: proceed without enforcement
        } else {
          usageRow    = data as Record<string, number> | null;
          usageReadOk = true;

          // Enforce limit only when we have reliable data.
          const current = usageRow?.[limitInfo.col] ?? 0;
          if (current >= limitInfo.limit) {
            return jsonResponse({ error: "limit_reached", action }, 429);
          }
        }
      } catch (limitEx) {
        console.error("[ai-proxy] limit check exception:", limitEx);
        // fail-open
      }
    }

    // ── Proxy to Anthropic API ─────────────────────────────────────────────
    const upstream = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_KEY,       // server-side secret only
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(anthropicBody),
    });

    const responseData = await upstream.json();

    // ── Increment Counter on Success (Bolt 4.4, ADR 0016, AC3) ────────────
    // Only increment when the AI call succeeded and we have reliable usage data.
    // Fail-open: a failed write is logged but never surfaces to the user.
    if (upstream.ok && limitInfo && !isPro && usageReadOk) {
      try {
        if (usageRow !== null) {
          // Row exists — increment the specific column only.
          const newVal = (usageRow[limitInfo.col] ?? 0) + 1;
          const { error: updateErr } = await sb
            .from("usage_limits")
            .update({ [limitInfo.col]: newVal })
            .eq("user_id", user.id)
            .eq("date", today);
          if (updateErr) console.error("[ai-proxy] counter increment error:", updateErr);
        } else {
          // No row for today yet — insert with this column = 1, others default 0.
          const { error: insertErr } = await sb
            .from("usage_limits")
            .insert({ user_id: user.id, date: today, [limitInfo.col]: 1 });
          if (insertErr) console.error("[ai-proxy] counter insert error:", insertErr);
        }
      } catch (incrEx) {
        console.error("[ai-proxy] counter write exception:", incrEx);
        // fail-open — response already returning below
      }
    }

    // Propagate Anthropic's status code (400 bad request, 529 overloaded, etc.)
    return jsonResponse(responseData, upstream.status);

  } catch (err) {
    // Unexpected top-level error — log to Supabase Edge Function logs.
    console.error("[ai-proxy] Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
