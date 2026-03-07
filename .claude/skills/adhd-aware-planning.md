# Skill: adhd-aware-planning

> Read this file when planning features, writing copy, designing flows, or making
> product decisions that affect how users interact with their tasks and thoughts.
> MindFocus is built **for** neurodivergent users — every design choice should reflect that.

---

## Who We're Building For

Our primary users experience one or more of:

- **Time blindness** — difficulty perceiving how much time has passed or will pass
- **Working memory overload** — thoughts and tasks fall out of mind instantly
- **Task initiation paralysis** — knowing what to do but being unable to start
- **Shame loops** — incompletion triggers guilt, guilt prevents starting, nothing gets done
- **Hyperfocus / context switching cost** — interruptions are disproportionately expensive
- **Decision fatigue** — too many choices = no choice

These are not character flaws. They are neurological patterns. The app's job is to reduce
friction at every step.

---

## Core Design Principles for ADHD Users

### 1. The Capture-First Model

The brain dump is the most important feature. It must be:
- Accessible in **one tap** from anywhere in the app
- Accepting of **any format** (messy, unstructured, emotional, fragmentary)
- **Never judging** — no "You haven't added anything today!" shame messages
- Processed by AI so the user never has to organise manually

Never add friction to the dump input. No required fields, no formatting requirements,
no character limits that block submission.

### 2. Small, Concrete Lists

The Today screen shows **3–5 tasks maximum**. This is not a limitation — it is the
feature. Cognitive load from a 47-item list is not motivating; it is paralyzing.

Rules for the Today screen:
- Enforce a soft cap (show first 5, hide the rest with a "show more" that expands)
- Suggest the AI pick 3 tasks by default
- Never auto-populate with undone items from yesterday (shame loop risk)

### 3. Eliminate Decision Points

Each flow should have a clear **single next action**. When a user finishes a dump,
the natural next step should be obvious without reading any UI chrome.

- "Review your 3 tasks for today →" (not "What would you like to do next?")
- "Great, 1 thing done. Rest tomorrow?" (not "Would you like to archive more items?")
- Pre-select the most likely option — user confirms rather than chooses

### 4. No Shame Language

Audit every string in `translations.js` for shame-adjacent language:

```
❌ "You haven't completed any tasks today."
✅ "Everything's ready for tomorrow."

❌ "You've missed your evening review 3 days in a row."
✅ "Evening check-in takes 2 minutes — want to do it now?"

❌ "You have 23 overdue tasks."
✅ "3 things from today — archive or move to tomorrow?"
```

The tone is **calm, supportive coach** — not productivity app, not alarm system.

### 5. The Reset Day Concept

Users need to be able to hit a reset without guilt. The evening review's primary job is
to **close the day** — not to audit failures.

Evening review flow:
1. "What did you actually do today?" (free text, optional)
2. "What's the one thing you'd like to carry to tomorrow?" (single task, optional)
3. "Everything else is filed away. You're done." (no list of failures shown)

Never show a list of incomplete tasks in the evening review. Show only what the user
chooses to carry forward.

---

## Time Blindness Accommodations

### Deadlines

- Show deadlines as relative time **and** absolute: `"Today 3pm · in 2 hours"`
- For tasks with no deadline: show `"No rush"` not an empty field
- Overdue tasks: `"Was yesterday"` not `"OVERDUE · 1 day"`
- Time estimates from AI: always ranges (`"15–30 min"`) not point estimates

### Notifications

- Offer morning briefing (9am default) and evening check-in (9pm default)
- Reminders are opt-in, easy to silence, easy to reschedule
- No badge counts on the app icon (too stressful) — preference should be settable
- Notification copy uses gentle future framing: `"Your morning review is ready"` not
  `"Don't forget to check your tasks!"`

---

## Task Paralysis Interventions

When the user has tasks but the app detects inaction (e.g., moodTrend = "down",
lastActiveDate > 2 days), use **soft nudges** not guilt:

```
"Hi — whenever you're ready, your 3 tasks are here."   ✅
"You haven't opened the app in 3 days!"                ❌
```

The nudge should appear as a **gentle banner** (dismissible, low visual weight) not a
modal that blocks the UI.

### The "Start Anywhere" Escape Hatch

When a user opens the app and seems stuck (no interaction for 10+ seconds on the Today
screen), offer:

- "Not sure where to start? → Brain dump first"
- This routes them back to the dump screen (lowest friction action)

---

## Freemium UX for ADHD Users

The freemium gate must never:
- Appear in the middle of a task the user is doing
- Require reading lengthy plan comparison text
- Use countdown timers or urgency language

```
❌ "You've used 29/30 of your monthly AI dumps. Upgrade NOW before you lose access!"
✅ "You've made great use of AI this month. Want unlimited dumps? → See Pro"
```

The `<ProBanner>` component should appear **after** the blocked action, with a clear
"continue without AI" fallback if possible.

---

## Planning Feature Work

When planning a new feature, ask:

1. **What decision does this feature eliminate for the user?**
   Good features reduce choices. Features that add choices need strong justification.

2. **What is the fastest path from "opened app" to "felt productive"?**
   Measure in taps. Every extra tap is friction. ADHD users abandon high-friction flows.

3. **Could this feature become a shame loop?**
   Streaks, counts, and percentages can motivate or shame. Default to hiding them;
   let users opt into gamification.

4. **What happens if the user ignores this feature for 2 weeks?**
   The app should welcome them back warmly, not confront them with accumulated debt.
