# MindShift — UX Writing Audit
**Date:** March 9, 2026 | **Skill:** design:ux-writing | **Scope:** All screens + components

---

## Voice & Tone Assessment

MindShift's microcopy is **overall excellent** — the ADHD-aware voice is consistent, warm, and shame-free throughout. The Recovery Protocol fallback messages are genuinely best-in-class for neurodivergent product design. Several micro-improvements were applied below.

**Voice principles applied correctly throughout:**
- Non-punitive language ("carry-over" not "overdue", "park it" not "snooze")
- Identity reinforcement ("You always come back. 💫 That's who you are — a consistent returner")
- Collaborative framing ("Where were we?", "What's the ONE thing that matters most right now?")
- Forward-looking (no "You missed X days", no shame spirals)
- Low-barrier entry ("Just one thing...", micro-win chips)

---

## Fixes Applied (7 changes)

### 1. Auth error toast — AuthScreen.tsx
**Before:** `"Something went wrong. Please try again."`
**After:** `"Couldn't send your link. Check the email address and try again."`
**Why:** The original is generic. The fix follows the UX writing error formula (what happened + how to fix). "Check the email address" gives the user something actionable without being accusatory.

---

### 2. NOW pool empty state — TasksScreen.tsx
**Before:** `"Now pool is empty — add a task!"`
**After:** `"Nothing here yet — what do you want to work on first?"`
**Why:** "Add a task!" is an imperative that can feel demanding to ADHD users. The new copy is curious and inviting, turning an empty state into a gentle open question.

---

### 3. NEXT pool empty state — TasksScreen.tsx
**Before:** `"Next pool is empty"`
**After:** `"Queued tasks will appear here. No rush."`
**Why:** A bare fact with no context. The new copy explains the pool's purpose and uses "No rush" — a key phrase in the ADHD-safe vocabulary.

---

### 4. SOMEDAY pool empty state — TasksScreen.tsx
**Before:** `"Someday pool is empty"`
**After:** `"Ideas parked here will wait patiently until you're ready."`
**Why:** SOMEDAY is a pressure-free zone. The copy now communicates that concept explicitly — "patiently" and "when you're ready" are calm, non-demanding phrases.

---

### 5. AddTaskModal pool-full hint — AddTaskModal.tsx
**Before:** `"ℹ️ NOW pool is full (3/3) — task will go to NEXT"`
**After:** `"💙 NOW is full — this will land in NEXT, ready when you are."`
**Why:** The original is technical ("3/3") and cold. The fix uses warm language, drops the fraction counter (information overload for ADHD), and ends with "ready when you are" — removing any sense of penalty for hitting the limit.

---

### 6. AddTaskModal AI steps label — AddTaskModal.tsx
**Before:** `"✨ AI micro-steps"`
**After:** `"✨ Here's a plan:"`
**Why:** "AI micro-steps" reads like a feature label, not copy. "Here's a plan:" is conversational and leads naturally into the list below it, like a helpful colleague just drafted something.

---

### 7. Nature Buffer screen — FocusScreen.tsx
**Before (title):** `"Nature Buffer"`
**After (title):** `"Time to breathe 🌿"`
**Why:** "Nature Buffer" is internal jargon — a technical term from the code, not user-facing vocabulary. "Time to breathe" is emotionally resonant and immediately understood.

**Before (description):** `"Let your mind settle. Nature sounds are playing softly to ease the transition."`
**After:** `"Great session. Let your mind settle before the next one."`
**Why:** Added positive reinforcement ("Great session.") before the instruction. Removed the technical explanation of what's playing — users don't need to know the mechanism.

**Before (timer label):** `"transition time"`
**After:** `"until next session"`
**Why:** More specific and useful — tells the user what the countdown is counting toward.

**Before (skip button):** `"Skip → Ready for more"`
**After:** `"Skip rest"`
**Why:** "Ready for more" subtly pressures users to feel they *should* be ready for more. "Skip rest" is neutral — just describes the action without emotional loading.

---

### 8. CookieBanner — CookieBanner.tsx
**Before:** `"We use localStorage & cookieless analytics."`
**After:** `"We save your preferences on-device. No cookies, no tracking."`
**Why:** "localStorage" is developer jargon invisible to most users. The new copy explains the *benefit* (preferences saved) and the *privacy commitment* (no cookies) in plain language. Bold "No cookies, no tracking." creates a clear privacy signal.

---

### 9. ContextRestore dismiss — ContextRestore.tsx
**Before:** `"Later"`
**After:** `"Maybe later"`
**Why:** "Later" is abrupt and slightly dismissive. "Maybe later" softens the tone, feels more human, and reduces any implied commitment.

---

## What's Already Excellent (No Changes Needed)

| Location | Copy | Why it's excellent |
|----------|------|-------------------|
| RecoveryProtocol | "You always come back. 💫 That's who you are — a consistent returner, not a perfect one." | Identity-level language. Shame-free. Research #7 compliant. |
| RecoveryProtocol | "🗃️ X old tasks tucked into your time capsule — they waited patiently." | "Time capsule" is delightful. Completely removes urgency from overdue tasks. |
| RecoveryProtocol | "What's the ONE thing that matters most right now?" | Classic activation energy reduction. Perfect ADHD prompt. |
| TaskCard | "Park it →" (tooltip: "Parked for later. No rush.") | Brief, non-shaming, in-brand. "No rush" is exactly right. |
| TaskCard | "carry-over" badge | Non-shaming badge language. The gold color reinforces warmth without urgency. |
| AuthScreen | "No account? We'll create one automatically" | Removes a huge friction point for new users. |
| AuthScreen | "No password needed — ever." | Strong value proposition, clearly stated. |
| OnboardingFlow | "Do you ever feel like your brain forgets tasks exist if they're out of sight?" | This is extraordinary UX copy. Users feel seen. |
| OnboardingFlow | "No wrong answer — this helps us show tasks at the right pace." | Classic reassurance that lowers stakes. |
| FocusScreen phases | "Getting into it... 💪" / "Finding your flow... 🌊" | Phase labels describe *experience*, not progress. ADHD-safe (no countdown framing). |
| ContextRestore | "Where were we?" | Collaborative, not accusatory. Perfect for ADHD return-to-context. |
| TasksScreen (all empty) | "Your mind is clear." (full empty state) | Headline worthy. Reframes emptiness as achievement. |
| ProgressScreen | "Every step counts, no matter how small." | Consistent with growth mindset, non-comparative. |
| ProgressScreen consistency labels | "You showed up! 🌱" for 1 active day | Celebrates showing up, not the streak count. |

---

## Minor Observations (Not Fixed — Low Priority)

These are very low priority and a matter of taste rather than errors:

| Location | Note |
|----------|------|
| OnboardingFlow progress bar | "Step 1 of 3 / 33% complete" shows both formats — slight redundancy. Could use one or the other. |
| FocusScreen setup | "Smart default" duration appears without explicit UI label — users may not notice the energy-aware default. Consider adding a subtle "✨ Based on your energy" caption. |
| ProgressScreen | "Next stage: {name} at Level {n}" — the word "stage" is used inconsistently with "level" elsewhere. Worth aligning. |
| TasksScreen header | "All Tasks 🗂️" is functional but slightly flat. "Your tasks" or "Everything" might feel more personal. |

---

## Summary

9 improvements applied across 6 files. The codebase's voice is already strong — these changes sharpen edge cases (empty states, loading states, jargon) rather than addressing systemic issues. The ADHD-aware tone principles are well-established and consistently followed throughout.

**Status: ✅ PASS with improvements applied**
