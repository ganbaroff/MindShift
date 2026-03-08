/**
 * supabase/functions/ai-proxy/index.ts
 * MindFocus — AI Proxy Edge Function (Bolt 4.3, ADR 0015)
 *
 * Receives Anthropic API requests from authenticated clients,
 * attaches the secret ANTHROPIC_API_KEY from Deno.env, and
 * forwards to api.anthropic.com. The API key never reaches
 * the browser. Unauthenticated requests → 401.
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

import { serve }         from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient }  from "https://esm.sh/@supabase/supabase-js@2";

// ── Constants ──────────────────────────────────────────────────────────────────

const ANTHROPIC_KEY      = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION  = "2023-06-01";

// Supabase Edge Functions require CORS headers for browser clients.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ── Handler ────────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight (browser sends OPTIONS before actual POST).
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Only POST is accepted.
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // ── AC4: JWT Authentication ──────────────────────────────────────────────
    // Require a valid Supabase session token. Unauthenticated → 401.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized — missing Bearer token" }, 401);
    }

    // Verify the JWT against Supabase Auth.
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return jsonResponse({ error: "Unauthorized — invalid token" }, 401);
    }

    // ── Proxy to Anthropic API ───────────────────────────────────────────────
    // Forward the exact request body (Anthropic message format).
    // The client sends { model, max_tokens, messages, system? } — same as the
    // Anthropic /v1/messages spec. No transformation needed.
    const body = await req.json();

    const upstream = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type":       "application/json",
        "x-api-key":          ANTHROPIC_KEY,        // Server-side secret only
        "anthropic-version":  ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    // Propagate Anthropic's status code (429 rate limit, 400 bad request, etc.)
    return jsonResponse(data, upstream.status);

  } catch (err) {
    // Internal errors — log to Supabase Edge Function logs, return 500.
    console.error("[ai-proxy] Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
