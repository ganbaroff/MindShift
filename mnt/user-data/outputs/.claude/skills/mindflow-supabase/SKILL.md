---
name: mindflow-supabase
description: "MindFlow database rules and Supabase patterns. Use when writing any database queries, migrations, RLS policies, or Supabase client code for MindFlow."
---

# MindFlow Supabase Rules

## Connection

```typescript
const SUPABASE_URL = "https://pvzsxbyocmtjtbntilyh.supabase.co"
const SUPABASE_KEY = "sb_publishable_7EN4as2jUeNDrPfweWEYyQ_LYmLf3I8"
// NEVER use sb_secret_* in client code
```

## Session Identity

No auth for MVP. Each device gets a UUID stored in localStorage:
```typescript
const getSessionId = () => {
  let id = localStorage.getItem("mf_session")
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("mf_session", id) }
  return id
}
```

## Schema

```sql
-- thoughts table
create table thoughts (
  id           text primary key,
  session_id   text not null,
  text         text not null,
  type         text not null default 'note',    -- task|idea|note|reminder|expense|memory
  priority     text not null default 'none',   -- none|low|medium|high|critical
  tags         text[] default '{}',
  is_today     boolean default false,
  archived     boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  archived_at  timestamptz
);
create index idx_thoughts_session on thoughts(session_id);
create index idx_thoughts_created on thoughts(created_at desc);
```

## REST API Pattern (no SDK)

```typescript
const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`
}

// SELECT
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/thoughts?session_id=eq.${SESSION_ID}&order=created_at.desc&limit=200`,
  { headers }
)

// INSERT
await fetch(`${SUPABASE_URL}/rest/v1/thoughts`, {
  method: "POST",
  headers: { ...headers, "Prefer": "return=representation" },
  body: JSON.stringify(thoughtData)
})

// PATCH
await fetch(`${SUPABASE_URL}/rest/v1/thoughts?id=eq.${id}&session_id=eq.${SESSION_ID}`, {
  method: "PATCH",
  headers: { ...headers, "Prefer": "return=representation" },
  body: JSON.stringify(patch)
})

// DELETE
await fetch(`${SUPABASE_URL}/rest/v1/thoughts?session_id=eq.${SESSION_ID}`, {
  method: "DELETE",
  headers
})
```

## DB Rules

1. Always filter by `session_id` in every query — data isolation
2. Always use optimistic UI updates — don't wait for DB response
3. Catch errors silently for non-critical updates, log to console
4. `is_today` in DB = `isToday` in TypeScript (snake_case → camelCase mapping)
5. Never store raw AI prompts in DB — only parsed results

## Future Tables (when adding features)

```sql
-- subscriptions (Stripe/M10/AzeriCard)
create table subscriptions (
  session_id text primary key,
  plan       text default 'free',  -- free|pro|coach
  expires_at timestamptz,
  provider   text                  -- m10|azericard|stripe
);

-- evening_reviews
create table reviews (
  id         text primary key,
  session_id text not null,
  date       date not null,
  mood       int,
  note       text,
  reflection text,
  done_count int default 0,
  missed_count int default 0,
  created_at timestamptz default now()
);
```
