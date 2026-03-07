# Bolt 2.1 — Brain Dump → Today

**Date:** 2026-03-07
**Branch:** claude/romantic-archimedes
**Skill:** adhd-aware-planning

---

## Scope

End-to-end pipeline from brain dump input → AI parse → human-in-the-loop review → Today task list.

---

## Files Created

| File | Description |
|------|-------------|
| `docs/migrations/001_dumps_tasks.sql` | Supabase tables: dumps, tasks + RLS policies |
| `src/features/dump/useDump.js` | State machine hook: idle → processing → review → done/error |
| `src/features/dump/DumpInput.jsx` | Friction-free textarea + VoiceBtn sub-component |
| `src/features/today/useToday.js` | Soft cap, welcome-back detection, decomposeTask |
| `src/features/today/TodayList.jsx` | ADHD-aware task list with step_one, soft cap, decompose |
| `src/features/today/WelcomeBack.jsx` | Shame-free return greeting (shown once per session) |

## Files Extended

| File | Change |
|------|--------|
| `src/shared/services/claude.js` | parseDump: adds step_one/steps/energy_required; new aiDecomposeTask |
| `src/shared/services/supabase.js` | sbSaveDump + sbUpdateDumpResult (dumps table ops) |
| `src/features/dump/index.jsx` | Replaces inline state with useDump; adds ReviewPanel component |
| `src/features/today/index.jsx` | useToday hook, WelcomeBack, TodayList, shame-free motiveLine |
| `src/mindflow.jsx` | Passes user={user} to DumpScreen |

---

## adhd-aware-planning Skill Checklist

- [x] **1. No shame / loss-aversion language** — `motiveLine()` rewritten: removed "⚠️ Не потеряй серию". Streak badge is informational only (neutral `C.accent` color, not warning `C.high`).
- [x] **2. All async ops call logError** — `useDump.submitDump`, `useDump.updateDumpResult`, `useToday.decomposeTask` all call `logError(context, e)`.
- [x] **3. No streak data without opt-in** — Streak number shown passively; no streak pressure messages.
- [x] **4. Brain dump: friction-reducing** — DumpInput: auto-focus, 6-row textarea, no required fields, voice input (SpeechRecognition API), ⌘+Enter shortcut.
- [x] **5. Human-in-the-loop** — AI proposes items in ReviewPanel; user accepts/rejects each; `confirmItems()` only commits accepted items. AI never auto-adds to Today.
- [x] **6. Soft cap ≤ 5 tasks** — `useToday.visibleTasks = activeTasks.slice(0, 5)`; "Show more" is an explicit user-initiated opt-in.
- [x] **7. EN/RU/AZ strings** — All new user-facing strings (ReviewPanel, motiveLine, WelcomeBack, TodayList, DumpInput) have translations in all three languages.

**Pre-existing issue (out of scope):** `features/settings/index.jsx:150` still contains `⚠️ Dump today — don't break the streak!` — addressed in a future settings bolt.

---

## Architecture Notes

### Human-in-the-loop pipeline

```
user types → DumpInput.onSubmit
  → useDump.submitDump(rawText)
    → freemium check
    → sbSaveDump(rawText, userId)   // fire-and-forget
    → parseDump(rawText, lang, persona)
    → sbUpdateDumpResult(dumpId, aiResult, userId)
    → setStatus("review") + setProposed([...all accepted: true])
  ← ReviewPanel rendered in DumpScreen
  → user toggles items (toggleItem)
  → user clicks "Add selected"
    → useDump.confirmItems(rawText)
      → onProcess(rawText, acceptedItems)  // commits to App state
      → reset to idle
```

### Supabase dumps table

Stores raw + AI-processed brain dumps for analytics and potential ML training. Separate from the `thoughts` table which holds the normalized items. See `docs/migrations/001_dumps_tasks.sql`.

### WelcomeBack detection

`useToday.shouldShowWelcome` reads `persona?.patterns?.lastActiveDate`. If > 2 days ago and not yet dismissed this session → shows `WelcomeBack`. Dismissal is in-memory only (state), not persisted, per principle of not tracking absence data.

---

## Build

```
dist/assets/index-Bni6ewXN.js  438.64 kB │ gzip: 128.53 kB
```

Budget: < 500 kB gzipped ✅ (128.53 kB, well within budget)
