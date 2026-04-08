# MindShift — Full MCP Interactive Test Report
**Date:** 2026-03-09
**Build:** Bolt 6.16 (post UI audit)
**Tester:** Claude Code (MCP Preview + Chrome automation)
**Viewport:** 375 × 812 (iPhone SE — mobile-first)
**Scope:** All screens, all buttons, all interactive functions

---

## Summary

| Metric | Result |
|--------|--------|
| Screens tested | 8 / 8 |
| Buttons / interactions tested | ~80 |
| Bugs found | **1** |
| UI audit fixes verified | **7 / 7** |
| Build status | ✅ 0 errors |
| Tests passing | ✅ 78 / 78 |

---

## 🐛 Bugs Found

### BUG-001 — Focus: Bookmark Dismiss doesn't update React state
**Severity:** Medium
**Screen:** Focus → Setup screen (after session with saved bookmark)
**File:** `src/features/focus/FocusScreen.tsx`

**Steps to reproduce:**
1. Start a focus session (any duration)
2. Click "End session" → interrupt confirm → enter bookmark text → "Save & Exit 📌"
3. Toast confirms session ended; `ms_interrupt_bookmark` written to localStorage
4. Return to Focus setup screen — "Last time you were working on: [text]" anchor card appears
5. Click **"✕ Dismiss"** on the anchor card

**Expected:** Card disappears immediately from the screen
**Actual:** Card remains visible; `localStorage.removeItem('ms_interrupt_bookmark')` executes (key is gone), but the React component state is not updated — the card persists until the user navigates away and returns to Focus

**Root cause:** The Dismiss handler clears localStorage but doesn't call a state setter to re-trigger the component render. The card visibility is likely derived from a local `useState` or `useMemo` that isn't invalidated on dismiss.

**Fix direction:** In the dismiss handler, also call the local state setter (e.g., `setBookmark(null)`) to immediately remove the card from the rendered tree.

---

## ✅ All Screens — Detailed Pass Results

### 1. Home Screen
| Feature | Result |
|---------|--------|
| "Good evening 🌙" greeting + tagline | ✅ Pass |
| Energy level selector (5 emojis, 1–5) | ✅ Pass |
| NOW pool — task display, "✓ Complete" button | ✅ Pass |
| NOW pool — "Park it →" moves task to Later | ✅ Pass |
| "Pool clear! 🎉" empty state | ✅ Pass |
| FOCUS AUDIO quick widget (4 presets) | ✅ Pass |
| "Just 5 minutes ⚡" quick-start card | ✅ Pass |
| PROGRESS widget (level, XP bar) | ✅ Pass |
| Arrange mode — grid toggle drag UI | ✅ Pass |
| "+ Add task" FAB → AddTaskModal | ✅ Pass |
| AddTaskModal — title input, difficulty, pool selector | ✅ Pass |
| AddTaskModal — "Add task" submit | ✅ Pass |
| BottomNav — 5 tabs visible and tappable | ✅ Pass |
| Mochi avatar in top-right | ✅ Pass |

---

### 2. Tasks Screen
| Feature | Result |
|---------|--------|
| NOW / NEXT / SOMEDAY pools | ✅ Pass |
| Empty state ("Pool clear!") in all pools | ✅ Pass |
| "+" FAB → AddTaskModal | ✅ Pass |
| Add task → appears in correct pool | ✅ Pass |
| Complete task → removed from active list | ✅ Pass |
| Task chip difficulty coloring | ✅ Pass |

---

### 3. Focus Screen
| Feature | Result |
|---------|--------|
| Empty state → "Go to Tasks →" link navigates | ✅ Pass |
| Duration selector — 5 / 25 / 52 min presets | ✅ Pass |
| **90 min preset visible** (Bolt 6.16) | ✅ Pass |
| Custom duration input (tested: 45 min) | ✅ Pass |
| Quick-start "Just 5 min" auto-starts session | ✅ Pass |
| Struggle phase (0–7 min): "Getting into it... 💪" label | ✅ Pass |
| ArcTimer renders, ticking | ✅ Pass |
| Digit tap-to-toggle (show/hide) | ✅ Pass |
| Sound toggle (off → on) | ✅ Pass |
| "End session" → interrupt-confirm screen | ✅ Pass |
| Interrupt confirm → bookmark-capture screen | ✅ Pass |
| Bookmark text input + "Save & Exit 📌" | ✅ Pass |
| Bookmark "Skip" → session ends, no bookmark saved | ✅ Pass |
| Post-session toast ("💪 2 min of deep focus!") | ✅ Pass |
| Anchor card shown on next setup visit | ✅ Pass |
| **BUG-001**: Anchor card Dismiss doesn't clear React state | ⚠️ Bug |

---

### 4. Audio Screen
| Feature | Result |
|---------|--------|
| 5 preset cards in 2-col grid (Gamma full-width) | ✅ Pass |
| Tap preset → plays (EqBars animation) | ✅ Pass |
| Tap same preset → stops | ✅ Pass |
| "Playing" label + color glow while active | ✅ Pass |
| Volume slider drag (0–100%) | ✅ Pass |
| dBA label updates with volume | ✅ Pass |
| Warning indicator at high volume | ✅ Pass |
| CoachMark (🎯 Sound Anchor hint) dismissable | ✅ Pass |
| Sound Anchor selection (✓ per preset) | ✅ Pass |
| "★ Anchor" badge on selected preset | ✅ Pass |
| State persists across navigation | ✅ Pass |
| Science note section visible | ✅ Pass |

---

### 5. Progress Screen
| Feature | Result |
|---------|--------|
| Level 1 "Seedling 🌱" + XP bar | ✅ Pass |
| XP total reflects completed sessions | ✅ Pass |
| 7-day focus chart (bar chart) | ✅ Pass |
| Stats grid (sessions, tasks, streak) | ✅ Pass |
| "Generate" insight button (≥44px) | ✅ Pass |
| AI insights appear (3 items) | ✅ Pass |
| 18 achievement cards rendered | ✅ Pass |
| Unlocked achievement shows date | ✅ Pass |

---

### 6. Settings Screen
| Feature | Result |
|---------|--------|
| Plan section (Free tier shown) | ✅ Pass |
| Avatar selector (6 tree icons) | ✅ Pass |
| Avatar selection persists | ✅ Pass |
| App Mode selector (3 modes) | ✅ Pass |
| Focus Style selector (2 options) | ✅ Pass |
| Reduced Stimulation toggle (min-h-[44px] ✓) | ✅ Pass |
| "Download my data" button tappable | ✅ Pass |
| "Delete account" → confirmation dialog | ✅ Pass |
| Delete dialog: email verification required | ✅ Pass |
| Delete "Cancel" closes dialog | ✅ Pass |
| "Sign out" → redirects to Auth screen | ✅ Pass |

---

### 7. Auth Screen
| Feature | Result |
|---------|--------|
| MindShift logo + "Focus made kind" tagline | ✅ Pass |
| Email input (Mail icon — no bleeding into placeholder) | ✅ Pass |
| "Send magic link →" disabled by default | ✅ Pass |
| Consent checkbox (custom Framer Motion) toggles | ✅ Pass |
| Button stays disabled with consent but no email | ✅ Pass |
| Button **enables** with email + consent | ✅ Pass |
| "Check your inbox 📬" state renders | ✅ Pass |
| Email displayed in pill on check screen | ✅ Pass |
| "← Use a different email" button (44px, min-h-[44px] px-4) | ✅ Pass |
| "← Use a different email" → back to email step | ✅ Pass |
| Email + consent state preserved on back | ✅ Pass |

---

### 8. Onboarding Flow (`/onboarding`)
| Feature | Result |
|---------|--------|
| Step 1: "What brings you here today?" (3 modes) | ✅ Pass |
| Step 1: Progress bar = 33% | ✅ Pass |
| Step 1: No BackBtn (correct — first step) | ✅ Pass |
| Step 2: "How's your brain right now?" (5 energy levels) | ✅ Pass |
| Step 2: Progress bar = 67% | ✅ Pass |
| Step 2: BackBtn visible, height = **44px** (`min-h-[44px] px-2`) | ✅ Pass |
| Step 2: BackBtn → returns to Step 1 | ✅ Pass |
| Step 3: "One last question 🧠" (ADHD signal, 2 options) | ✅ Pass |
| Step 3: Progress bar = 100% | ✅ Pass |
| Step 3: BackBtn visible, height = **44px** | ✅ Pass |
| Completion → Home screen | ✅ Pass |
| Sample tasks seeded on completion (Bolt 6.10) | ✅ Pass |
| Energy pre-set from onboarding selection | ✅ Pass |
| Onboarding widget hidden after completion | ✅ Pass |

---

## ✅ UI Audit Fixes — Verification (7/7)

All fixes from `docs/ui-audit-2026-03-09.md` confirmed in DOM:

| # | File | Fix | Verified |
|---|------|-----|---------|
| 1 | `AuthScreen.tsx` | "← Use a different email" `min-h-[44px] px-4` → height 44px | ✅ |
| 2 | `OnboardingFlow.tsx` | BackBtn `min-h-[44px] px-2` → height 44px (Steps 2 & 3) | ✅ |
| 3 | `FocusScreen.tsx` | `min-h-screen` removed from setup wrapper (no black void) | ✅ |
| 4 | `AudioScreen.tsx` | Sound Anchor buttons `py-3 px-2.5 min-h-[44px]` | ✅ |
| 5 | `ProgressScreen.tsx` | Generate button `py-2.5 px-4 min-h-[44px]` | ✅ |
| 6 | `SettingsScreen.tsx` | All toggle/button groups `py-3 min-h-[44px]` | ✅ |
| 7 | `InstallBanner.tsx` | `bottom-[calc(64px+env(safe-area-inset-bottom))]` (no inline style) | ✅ |

---

## Z-Index Stack (verified)

| Layer | z-index | Status |
|-------|---------|--------|
| BottomNav | 30 | ✅ |
| FAB (Add Task) | 30 | ✅ |
| InstallBanner | 40 | ✅ renders above BottomNav |
| Modals / toasts | 50+ | ✅ |

---

## Build & Tests

```
Build:  ✅ 0 TypeScript errors · 0 Vite errors
Tests:  ✅ 78/78 passing
Bundle: 98.41 kB gzip (index)
```

---

## Recommendation

**1 bug to fix before release:**

- **BUG-001** (`FocusScreen.tsx`): Add a local state setter call inside the bookmark Dismiss handler so the anchor card disappears immediately without requiring navigation.

Everything else is **ship-ready**. All ADHD UX principles verified in-app:
no red colors, no streak counters, no countdown timers, no shaming copy. ✅
