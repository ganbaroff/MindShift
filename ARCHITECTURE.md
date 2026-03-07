# MindFlow — Architecture

> Living document. Update when a new ADR is accepted. Full decision history in `DECISIONS.md` and `docs/adr/`.

---

## Guiding Principles

1. **Human owns the skeleton, AI writes the flesh.** Architecture boundaries, security, design system, and DB schema are human decisions. Feature implementation inside those boundaries is AI-executable.
2. **Vertical slices over horizontal layers.** Each feature is self-contained. An agent working on `dump/` doesn't need to understand `evening/`.
3. **Spec before code.** Every bolt starts with a `spec.md` update. No spec = no bolt.
4. **Small commits, trunk-based.** Incomplete features behind feature flags. No long-lived branches.

---

## Folder Map

```
src/
├── skeleton/          ← Human-owned. Do not modify without ADR.
│   ├── app-shell/     ← App root, routing, error boundaries
│   ├── design-system/ ← C tokens, typography, spacing scale
│   ├── security/      ← Auth wrappers, RLS invariants, validation
│   └── platform/      ← PWA, manifest, feature flags, service worker
│
├── shared/            ← Shared utilities. Changes need review.
│   ├── lib/           ← uid(), isToday(), date formatters — no React
│   ├── services/      ← supabase.ts, claude.ts — pure async functions
│   ├── hooks/         ← useAuth, useThoughts, usePersona
│   └── ui/            ← Reusable React components (ThoughtCard, BottomNav, etc.)
│
└── features/          ← AI-executable bolts. One folder per screen.
    ├── dump/          ← Brain dump input + AI parsing
    ├── today/         ← Daily focus list + AI focus suggest
    ├── evening/       ← Evening review + AI reflection
    └── settings/      ← Account, language, sync, export
```

---

## Data Flow

```
User input
    ↓
Feature component (src/features/<name>/)
    ↓ calls
shared/services/claude.ts → Anthropic API
shared/services/supabase.ts → Supabase Postgres
    ↓
State update (useState → Zustand in Sprint 3)
    ↓
UI re-render
```

Offline path: failed Supabase writes go into a `RETRY_QUEUE` in localStorage and are drained on next `online` / `visibilitychange` event.

---

## Database Schema

Two tables. Full SQL in `supabase-setup.sql`.

**thoughts**
```
uid (PK), user_id (FK → auth.users), raw_text, normalized_text,
type, priority, tags[], reminder_at, is_today, is_archived,
source, recurrence, created_at, updated_at
```

**personas**
```
user_id (PK), data JSONB, updated_at
```

RLS enabled on both. Users can only access their own rows.

---

## AI Integration

Three functions in `shared/services/claude.ts`:

| Function | Model | Purpose |
|---|---|---|
| `parseDump(text, lang, persona)` | Claude Sonnet 4 | Structures raw brain dump into typed thoughts |
| `generateEveningReview(done, missed, lang, persona)` | Claude Sonnet 4 | ADHD-compassionate day summary |
| `aiFocusSuggest(tasks, lang, persona)` | Claude Sonnet 4 | Picks top 3 tasks for today |

**Planned (Sprint 3):** Migrate `parseDump` to Gemini Flash for cost reduction. See ADR 0003.

---

## Security Boundaries

| Concern | Mechanism |
|---|---|
| Row-level data isolation | Supabase RLS on all tables |
| Auth | Magic link OTP via Supabase Auth |
| AI key exposure | `VITE_ANTHROPIC_API_KEY` (client-side) — move to Edge Function before public launch |
| Supabase key | Anon key only, safe client-side given RLS |

---

## Migration Roadmap

| Sprint | Change |
|---|---|
| 1 | Extract monolith → features/ + shared/ |
| 2 | TypeScript (tsconfig + allowJs, incremental rename) |
| 3 | Zustand store, React Router v7 |
| 4 | vite-plugin-pwa + Workbox (full offline) |
| 5 | RPG gamification (stats, quests, achievements) |
| 3 | Move AI API calls to Supabase Edge Function |
