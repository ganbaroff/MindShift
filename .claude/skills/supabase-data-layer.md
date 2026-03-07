# Skill: supabase-data-layer

> Read this file before writing any database query, auth operation, real-time
> subscription, or storage call. Violations of these rules create security holes or
> data-loss bugs.

---

## The Single Entry Point Rule

**All Supabase access goes through `src/shared/services/supabase.js`.**

```js
// ✅ correct — use the service
import { getSupabase, waitForSupabase } from "../../shared/services/supabase.js";

const sb = getSupabase();
const sb = await waitForSupabase();   // use when Supabase may not be initialised yet

// ❌ never do this in a feature file
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, key);
```

### `getSupabase()` vs `waitForSupabase()`

| Function | Returns | Use when |
|----------|---------|----------|
| `getSupabase()` | `SupabaseClient \| null` | Component body / already-initialised path |
| `waitForSupabase()` | `Promise<SupabaseClient>` | First load, auth screen, anywhere init may be pending |

Always null-check the result of `getSupabase()` before calling methods on it.

---

## RLS Invariant

> **Row Level Security is enabled on every table. No exceptions.**

The Supabase anon key is safe to expose client-side *only because* RLS prevents users
from reading or writing other users' data. If you create a new table and forget to add RLS
policies, users can read everyone's thoughts.

### Required policies for every table

```sql
-- Read own rows
CREATE POLICY "Users read own rows" ON <table>
  FOR SELECT USING (auth.uid() = user_id);

-- Insert own rows
CREATE POLICY "Users insert own rows" ON <table>
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update own rows
CREATE POLICY "Users update own rows" ON <table>
  FOR UPDATE USING (auth.uid() = user_id);

-- Delete own rows (if supported)
CREATE POLICY "Users delete own rows" ON <table>
  FOR DELETE USING (auth.uid() = user_id);
```

Never use `USING (true)` or bypass RLS for any reason outside of seed scripts
(which run under the service role key, server-side only).

---

## Table Reference

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `thoughts` | Brain dump items | `id`, `user_id`, `type`, `text`, `priority`, `tags`, `created_at`, `archived_at` |
| `personas` | Per-user AI persona | `user_id`, `patterns` (JSONB), `updated_at` |
| `profiles` | Pro status + prefs | `user_id`, `is_pro`, `notif_prefs`, `lang` |

---

## Query Patterns

### Basic select

```js
const sb = getSupabase();
if (!sb) return;   // always guard

const { data, error } = await sb
  .from("thoughts")
  .select("*")
  .eq("user_id", user.id)
  .is("archived_at", null)           // active thoughts only
  .order("created_at", { ascending: false });

if (error) { logError("fetchThoughts", error); return; }
```

### Upsert (insert-or-update)

```js
const { error } = await sb
  .from("personas")
  .upsert({ user_id: user.id, patterns: persona.patterns, updated_at: new Date().toISOString() },
           { onConflict: "user_id" });

if (error) logError("savePersona", error);
```

### Archive a thought (soft delete)

```js
const { error } = await sb
  .from("thoughts")
  .update({ archived_at: new Date().toISOString() })
  .eq("id", thoughtId)
  .eq("user_id", user.id);   // double-enforce ownership on write
```

---

## Error Handling — INVARIANT 7

> **Every Supabase call that can fail MUST call `logError(context, error, meta?)`.**
> Silent failures are forbidden.

```js
import { logError } from "../../shared/lib/logError.js";

const { data, error } = await sb.from("thoughts").select("*");
if (error) {
  logError("TodayScreen.fetchThoughts", error, { userId: user.id });
  setErr("Could not load thoughts. Please try again.");
  return;
}
```

The `context` string is `"ComponentName.operationName"` — makes log filtering trivial.

---

## Offline / Retry Queue

When a write fails due to network error (error code `"PGRST"` or `error.message` contains
`"fetch"`), queue the operation and retry on next `online` event:

```js
window.addEventListener("online", () => flushRetryQueue());
```

The retry queue is a module-level array in `supabase.js`. Features push to it via
`queueWrite(operation)`. This is not yet implemented — plan it as a dedicated bolt before
going to production.

---

## Auth

### Listening for auth state changes

```js
const sb = await waitForSupabase();
const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
  setUser(session?.user ?? null);
});
// Cleanup:
return () => subscription.unsubscribe();
```

### Magic link (OTP)

```js
const { error } = await sb.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: window.location.href },
});
```

### Sign out

```js
await sb.auth.signOut();
setUser(null);
setThoughts([]);
setPersona(null);
```

Never store session tokens manually — Supabase SDK handles persistence via localStorage.

---

## Real-time Subscriptions

```js
const channel = sb
  .channel("thoughts-changes")
  .on("postgres_changes",
    { event: "*", schema: "public", table: "thoughts", filter: `user_id=eq.${user.id}` },
    (payload) => handleChange(payload)
  )
  .subscribe();

// Cleanup in useEffect return:
return () => sb.removeChannel(channel);
```

Only subscribe to real-time when the feature genuinely needs live updates (today screen,
collaboration). Don't add subscriptions for screens that only read on mount.

---

## Migrations

Database schema changes are tracked as SQL migration files:

```
docs/
└── migrations/
    └── 001_initial_schema.sql
    └── 002_add_personas.sql
    └── 003_add_profiles.sql
```

- Always add RLS policies in the same migration file as the table creation
- Never alter production schema via the Supabase dashboard without saving the SQL here
- Migration files are append-only — never edit a committed migration

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Project URL (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (safe for client-side) |

The **service role key** must never appear in client code. If you need it for admin
operations, use a Supabase Edge Function.
