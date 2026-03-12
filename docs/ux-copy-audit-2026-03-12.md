# MindShift — Full UX Copy Audit
**Date:** 2026-03-12
**Scope:** All user-facing copy across the full app (Auth → Onboarding → Home → Tasks → Focus → Progress → Settings → Overlays)
**Voice target:** Warm, direct, ADHD-safe — non-punitive, never urgent, shame-free.

---

## Executive Summary

The copy is overwhelmingly strong. The neuroinclusive voice is consistent and the shame-free philosophy is well-executed throughout. This audit documents what's working, flags the handful of inconsistencies, and proposes sharpened alternatives for the weak spots.

Findings are organized by screen/feature, followed by a consolidated fix list.

---

## 1. Auth Screen

### What works
- **"Focus made kind"** — perfect tagline. Concise, differentiated, emotionally resonant.
- **"No password. No friction."** — dual value props in four words.
- **"No account? We'll create one automatically"** — pre-empts the most common hesitation.
- **"Tap the link in the email to sign in instantly."** — plain language, zero ambiguity.

### Issues

**Issue 1.1 — Heading inconsistency**
- Current: `"Welcome — let's get you in"`
- The dash creates a halt. The two clauses fight each other (greeting vs. action).
- Suggested: `"Welcome. Let's get started."` or `"Good to have you here."`

**Issue 1.2 — Magic link sent screen emoji**
- Current: `"Check your inbox 📬"` (mailbox with raised flag)
- The 📬 emoji signals unread mail, which is accurate, but the tone is perfunctory. Given this is the emotional payoff moment after the CTA, it could be warmer.
- Suggested: `"Magic link on its way ✨"` — matches the product language used in the button.

**Issue 1.3 — Redundant legal footer**
- The consent checkbox already requires agreeing to Terms & Privacy. The footer repeats "By continuing you agree to our Privacy Policy" — this is redundant and adds cognitive load for no legal reason.
- Suggested: Remove the footer on the auth screen, or replace with a single reassurance line: `"Your data stays private. We don't sell it."`

**Issue 1.4 — "← Use a different email" back link**
- The `←` arrow is decorative/emoji-style, but the link uses CSS underline. Inconsistent treatment.
- Suggested: `"Wrong email? Go back"` — removes arrow, keeps the action clear.

---

## 2. Onboarding Flow (4 steps)

### What works
- **"Choose your mental mode — you can change this anytime."** — reduces commitment anxiety.
- **"No wrong answer"** — classic ADHD-safe framing.
- **"One last question 🧠"** — good progress signaling, reduces the overhead of another screen.
- Mode subtitles ("I need to focus on a single thing right now") — first-person framing makes choices feel personal, not clinical.

### Issues

**Issue 2.1 — Step indicator label: "Step X of Y"**
- Current: `"Step 1 of 4"` + `"25% complete"`
- Showing both "Step X of Y" and a percentage is redundant. The percentage is useful; the step number is not.
- Suggested: Keep only the percentage. Or flip: show step number, drop percentage (simpler for ADHD brains).

**Issue 2.2 — Timer preference screen heading emoji conflict**
- Current heading: `"How do you like to see time? ⏱️"`
- The ⏱️ is also used on the Focus tab in the bottom nav and in the onboarding "Intent" screen (mode card for minimal). Creates visual noise.
- Suggested: `"How do you want to see your timer?"` — removes emoji, the question is clear enough.

**Issue 2.3 — "Count up" subtitle**
- Current: `"See how long you've been going — less pressure"`
- The escaped apostrophe `\'` will render correctly but should be a proper `'`. Minor.
- The copy itself is good.

**Issue 2.4 — "Surprise me" subtitle**
- Current: `"Arc ring only — no numbers, pure presence"`
- "Pure presence" is evocative but may land as jargon for new users. Consider: `"Arc ring only — no numbers, just now"`.

**Issue 2.5 — ADHD signal screen: "One last question 🧠"**
- The body copy is long and academic-feeling: "Do you ever feel like your brain forgets tasks exist if they're out of sight?"
- Suggested shorter version: `"Do tasks vanish from your mind if you can't see them?"`

**Issue 2.6 — Timer preference screen: sub-labels in Settings vs Onboarding are inconsistent**
- Onboarding: "Count down" (two words)
- Settings: "Countdown" (one word)
- Pick one and use it everywhere. Recommend "Countdown", "Count-up", "Surprise" for all contexts.

---

## 3. Home Screen

### What works
- Greeting + time-of-day personalization ("Good morning ☀️ / Good afternoon 🌤️ / Good evening 🌙") — warm, zero effort.
- App-mode subtitles are well-tuned: "One task at a time. What matters most?" is a genuine ADHD nudge.

### Issues

**Issue 3.1 — QuickSetupCard heading**
- Current: `"Welcome to MindShift"`
- This is generic and already seen on the Auth screen. On Home, the user has logged in — the welcome should be functional, not ceremonial.
- Suggested: `"Personalise your layout"` or `"Quick setup — 10 seconds"`

**Issue 3.2 — QuickSetupCard skip link**
- Current: `"Skip — I'll explore on my own →"`
- This is fine but the `→` arrow is a repeated pattern used for both CTA arrows and skip links throughout the app. Reserve the arrow for forward-progress CTAs only.
- Suggested: `"Skip for now"` (no arrow).

**Issue 3.3 — FirstTaskPrompt body**
- Current: `"Capture it — we'll help you break it down into steps."`
- Good but passive. "We'll help you" implies waiting for you. Consider: `"Capture it and we'll break it into steps together."` Or more direct: `"Add it and we'll help you break it down."`

**Issue 3.4 — Energy check-in — on Home vs. Settings: label inconsistency**
- Home: `"How's your energy right now?"` (emoji-less)
- HomeScreen inline version uses `"Exhausted / Low / Neutral / Good / High"` energy labels
- PostSessionFlow uses `"Drained / Calm / Good / Great / Wired"`
- Onboarding's EnergyCheckin uses a third set (TBD — not directly visible in this scan but the component is shared)
- Settings uses `"Low / Calm / Good / High / Peak"`

These four label sets all describe the same five energy levels. **Pick one set and use it everywhere.** Recommended canonical set: `Drained · Low · Okay · Good · Wired` — covers the full range without being clinical.

**Issue 3.5 — BentoGrid error fallback**
- Current: `"Widget layout couldn't load"` + `"Tap to refresh"`
- This is fine technically, but "Tap to refresh" sounds like a browser. On a PWA, prefer: `"Something glitched — tap here to reload"`.

---

## 4. Tasks Screen

### What works
- Pool labels — **NOW / NEXT / SOMEDAY** — are clean, memorable, and ADHD-validated.
- **"carry-over"** badge — non-shaming, lowercase, understated. Excellent.
- **"Nothing here yet — what do you want to work on first?"** — great empty state for NOW pool.
- **"Ideas parked here will wait patiently until you're ready."** — excellent SOMEDAY empty state.
- **"Park it →"** and **"✓ Complete"** — verb-first, clear, distinct.
- Snooze toast: **"Parked for later. No rush. 🌿"** — perfect.
- Complete toast: **"Done! ✓"** with Undo — correct pattern.

### Issues

**Issue 4.1 — TasksScreen subtitle copy**
- Current: `"{n} tasks in play"`
- "In play" is slightly game-y — good for the tone, but also technically includes NEXT and SOMEDAY tasks which aren't "in play". Consider: `"{n} active"` or just `"{n} tasks"`.

**Issue 4.2 — NOW pool counter label**
- Current section header: `"Now"` + counter `"{n}/3"`
- The counter without a label is ambiguous on first visit. Consider: `"{n}/3 active"` or add a tooltip/aria-label.
- (The `aria-label` on the section is already "Now — active tasks (up to 3)" which is correct, but sighted users don't see it.)

**Issue 4.3 — NEXT pool empty state**
- Current: `"Queued tasks will appear here. No rush."`
- "Queued" is slightly technical. Suggested: `"Tasks you park from Now will appear here."` or keep it simpler: `"Your upcoming tasks will live here."`

**Issue 4.4 — Low-energy banner in NOW pool**
- Current: `"Low energy day? Start with an easy one — momentum builds from small wins."`
- "Low energy day?" is a question that could feel assumptive if the user just set a low energy level for context, not distress. Consider: `"Easy tasks available — small wins build momentum."`

**Issue 4.5 — CoachMark copy**
- Current: `"Tap Focus for a distraction-free session — it's designed for exactly this."`
- "Exactly this" is vague. What is "this"? Better: `"Tap Focus to work on this task without distractions."` or `"Use Focus mode for a timed, distraction-free session."`

**Issue 4.6 — Empty state headline (all tasks empty)**
- Current: `"Your mind is clear."` + `"Add your first task and let's get moving."`
- The headline is beautiful. The body mixes a statement with an imperative CTA awkwardly. Consider: `"Add a task to get started."` (cleaner CTA follow-through).

---

## 5. Add Task Modal

Key copy findings (from the large file):

**Issue 5.1 — Voice: empty transcript feedback**
- Current: `"Nothing captured — try again in a quiet spot."`
- Good empathy, but "quiet spot" assumes the problem is noise. Could also be a permission issue or mic failure.
- Suggested: `"Nothing captured — try again, or type it instead."`

**Issue 5.2 — Voice: AI classify error fallback**
- Current: `"Voice input stopped — you can type instead."`
- This is excellent. No change needed.

**Issue 5.3 — Voice: recorded note fallback**
- Current: `"Recorded your note — edit the details below."`
- "Your note" is slightly odd; the user said a task. Suggested: `"Got it — check the details below."` or `"Captured — edit below if needed."`

**Issue 5.4 — AI decompose: rate limit error**
- Current: `"AI limit reached — add the task and break it down later."`
- Good. The `⏳` icon adds the right tone.

**Issue 5.5 — AI decompose: generic error**
- Current: `"Couldn't reach AI right now — add the task and break it down later."`
- Identical to the rate-limit message structure. That's intentional and good — no need to expose the difference to users.

**Issue 5.6 — AI decompose: unexpected response**
- Current: `"AI returned an unexpected response. Add the task manually for now."`
- "Unexpected response" is technical language. Suggested: `"Something went wrong with the AI — add the task and we'll try again next time."`

**Issue 5.7 — ICS calendar export toast**
- Current: `"📅 Opening in your calendar app..."`
- This is what a success toast says, but the action is a file download — it doesn't "open" anything. This will land as false feedback on desktop. Suggested: `"📅 Calendar event saved — open it in your calendar app."`

---

## 6. Focus Screen

### What works
- **"Start Focus →"** — clean CTA, verb-first.
- **"PICK UP WHERE YOU LEFT OFF"** bookmark anchor — all-caps works here as a label.
- **"Open focus — no specific task"** — good option naming.
- **"TASK (OPTIONAL)"** label — correctly sets expectations.
- **"DURATION"** + smart recommendation indicator — clear system.
- **"Sound Anchor ready"** — evocative and specific.

### Issues

**Issue 6.1 — Interrupt-confirm screen — warning emoji**
- Current: `⚠️ "Leave focus session?"`
- The ⚠️ emoji triggers danger/alarm associations — counter to the calm palette. The screen already handles the tone well in the body copy ("Your progress will be saved"). The emoji is the problem.
- Suggested: Use `⏸️` or `🚪` — neutral, not alarming.

**Issue 6.2 — Interrupt-confirm: "Keep going 💪"**
- The 💪 muscle emoji reads as aggressive motivation, which is precisely the ADHD shame-trigger profile. Consider `"Stay in session"` or `"Keep going 🌿"`.

**Issue 6.3 — Interrupt-confirm body copy**
- Current: `"You've been focused for {n}m. Your progress will be saved."`
- This is good but doesn't answer: why would the user want to leave? Give them something to hold onto. Suggested: `"You've been at it for {n}m — your progress is saved. Ready to keep going?"`

**Issue 6.4 — Bookmark capture — "Park your progress"**
- This is potentially confusing with the task "Park it" snooze action. Both use "park" in different contexts (parking a focus-progress note vs. parking a task). Fine for now, but worth flagging for future consolidation.

**Issue 6.5 — Hard-stop screen: "I'm in hyperfocus — keep going"**
- Technically correct but feels self-contradicting (the app is interrupting hyperfocus to ask if you're in hyperfocus).
- Suggested: `"I know — let me keep going"` — acknowledges the interruption without requiring self-diagnosis.

**Issue 6.6 — Setup: empty state body**
- Current: `"Pick a task to focus on — it gives your session direction."`
- Good. No change needed.

---

## 7. Post-Session Flow

### What works
- **"Time to breathe 🌿"** — perfect landing after a session.
- **"Great session. Let your mind settle before the next one."** — warm, non-prescriptive.
- **"until next session"** timer label — informational, not threatening.
- **"How do you feel after that session?"** — good post-energy framing.

### Issues

**Issue 7.1 — Nature Buffer: "Skip rest"**
- This is the only CTA on the screen once the energy check-in is logged. "Skip rest" has a slightly dismissive framing — you're "skipping" something you should be doing.
- Suggested: `"I'm ready to continue"` or `"Continue"` — no implication that skipping is wrong.

**Issue 7.2 — Recovery Lock: "90 minutes! Amazing 🌊"**
- The exclamation mark + wave emoji is unusually exuberant for this app's tone. "Amazing" is slightly over-the-top. The rest of the screen is calm.
- Suggested: `"90 minutes of deep focus. 🌊"` — lets the number speak for itself.

**Issue 7.3 — Recovery Lock suggestions block label**
- Current: `"Try one of these 🌱"`
- This is great. No change needed.

**Issue 7.4 — Recovery Lock hyperfocus bypass**
- Current: `"I'm in hyperfocus — continue →"`
- Same note as Issue 6.5. Suggested: `"I know — keep going →"`.

---

## 8. Recovery Protocol (72h+ return)

### What works
The fallback messages are exceptional. Particular standouts:
- *"You always come back. 💫 That's who you are — a consistent returner, not a perfect one."* — identity-affirming, research-grounded.
- *"Back again 🌸 Opening this app took courage."* — vulnerable and true.
- *"Tucked into your time capsule"* metaphor for archived tasks — gentle, poetic.

**Issue 8.1 — "Let's go →" CTA**
- This is used in both RecoveryProtocol and ContextRestore as the primary CTA. It's warm. But "Let's go" is also in AddTaskModal (sample tasks section) and other places. Not a problem per se — just note it as a shared phrase.

**Issue 8.2 — "Skip — just show me my tasks"**
- The dash creates an odd pause. Suggested: `"Skip — show my tasks"` or `"Not now — show my tasks"`.

**Issue 8.3 — Micro-win chip label prefix**
- Current: `"Or pick a micro-win to start:"`
- "Micro-win" is internal product language. New users won't know this term. Suggested: `"Or pick something easy to start with:"`.

---

## 9. Context Restore (30–72h return)

### What works
- **"Where were we?"** header — inclusive "we", forward-looking.
- **"You're all caught up — ready for what's next?"** — excellent empty state.
- **"Dive back in →"** — verb-first, energetic without being pushy.

**Issue 9.1 — "Maybe later" secondary button**
- Both "Maybe later" buttons in this app (ContextRestore, trial activation in Settings) have inconsistent capitalization handling. Both are fine stylistically but could be unified.

---

## 10. Progress Screen ("Your Garden")

### What works
- **"Your Garden 🌱"** — beautiful, non-competitive reframe of progress.
- **"Every step counts, no matter how small."** — ADHD-safe progress framing.
- Consistency messages: "You showed up! 🌱" / "Fresh start ahead ✨" — the low-activity messages are the most important to get right and these nail it.
- Fallback insights are warm and specific without being condescending.

### Issues

**Issue 10.1 — Weekly Insight "Generate" button**
- Current: just "Generate" (and "Loading..." when active).
- "Generate" is technical. Suggested: `"Get insights"` or `"See this week's patterns"`.

**Issue 10.2 — "Active Days" stat label**
- Current: `"Active Days"` stat showing `"{n}/7"`
- The "/" could be read as "out of" (progress framing) or a ratio (which could feel like a grade). Since the goal is to not streak-shame, "Active Days" is fine — but the "/ 7" denominator re-introduces a hidden streak feel. Consider: just show the number with a label, e.g. `"{n} days focused"`.

**Issue 10.3 — XP progress bar label**
- Current: `"{progress} / {needed} XP to Level {level + 1}"`
- "/ {needed}" shows the ceiling. For ADHD users who can have a complicated relationship with progress bars, showing only `"{progress} XP"` with no ceiling might reduce anxiety. Lower priority.

**Issue 10.4 — "Achievements" section heading (all-caps tracker style)**
- Current: `"Achievements"` with unlocked count `"{n}/{total}"`.
- The ratio again. Consider `"{n} unlocked"` instead of `"{n}/{total}"`.

---

## 11. Settings Screen

### What works
- **"You own your data. Export everything or delete your account at any time."** — strong trust signal.
- **"No card required. No charges. Just full access for 30 days."** — great trial confirmation copy.
- **"Back in action 💪"** toast — fine here (action-oriented, voluntary context).
- **"Stays on this device only."** — privacy signal for health data.
- **"MindShift v1.0.0 — Built with 💜 for ADHD minds"** — lovely footer.

### Issues

**Issue 11.1 — Account deletion confirm text**
- Current: `"This will permanently delete all your tasks, sessions, achievements, and account. This action cannot be undone."`
- This is good. But the button label `"Permanently delete"` is slightly softer than the warning. Should match more directly: `"Delete everything"` or `"Yes, delete my account"`.

**Issue 11.2 — Health & Rhythms: medication toggle label**
- Current: `"💊 Taken medication today"`
- This is in past tense, which is correct as a log action. Fine.

**Issue 11.3 — Rest mode toast: "Back in action 💪"**
- If a user is *disabling* rest mode because they're still recovering, the 💪 emoji feels slightly tone-deaf. Consider: `"Rest mode off"` (neutral) or `"Back when you're ready 🌿"` if you want warmth.

**Issue 11.4 — Seasonal phase descriptions**
- Current descriptions are functional: "Ambitious goals — up to 5 NOW tasks", etc.
- "Sandbox — Explore freely — no limits" — "no limits" could feel overwhelming for ADHD users who struggle with open-ended contexts. Consider: `"Open mode — no pool constraints"`.

**Issue 11.5 — Settings screen header subtitle**
- Current: shows the user's email address as the subtitle.
- Factual, but cold. Could add a warm touch: `"{email} · {subscriptionTier}"` or just keep the email (it does function as account confirmation).

---

## 12. Offline Indicator (AppShell)

### What works
- **"Offline — changes saved locally"** — reassuring, factual.
- **"Back online — changes synced ✓"** — clean confirmation.

No issues. This is optimal copy for the feature.

---

## 13. Mochi Session Companion

### What works
The message pools are excellent. Highlights:
- *"The resistance is lifting. You're finding your rhythm."* — neurologically accurate and poetic.
- *"You're in flow. Beautiful. I'll stay quiet. 🌙"* — Mochi yielding to the user's state is the right move.
- *"Not nothing. This is something. ✨"* — unexpected line break rhythm makes this line land hard.

**Issue 13.1 — Milestone 60: "Remember this feeling. 🌟"**
- This is a powerful line but risks pressure: if the user can't reliably reproduce the feeling, they may feel worse next time. Consider: `"One hour. Take a moment — this was real."` — grounding without expectation.

---

## 14. Burnout Cards (BurnoutAlert + BurnoutNudgeCard)

### What works
- **"Your rhythm feels a bit stretched"** — caution tier title is perfectly measured.
- **"Rest is part of the work"** — burnout tier title is a classic reframe, used correctly here.
- **"ADHD brains run in bursts, not lines"** — research-grounded, non-pathologizing.
- **BurnoutNudgeCard: "It's been a quiet few days"** — neutral observation, not accusation.
- **"Small starts are real starts."** — excellent. Should be a system-wide principle.

**Issue 14.1 — BurnoutAlert caution CTA**
- Current: `"Try a 5-min micro-focus →"`
- "Micro-focus" is internal product language (same note as micro-win in Recovery Protocol). Suggested: `"Try a 5-minute session →"`.

**Issue 14.2 — BurnoutAlert burnout CTA**
- Current: `"Start with just 5 minutes →"`
- This is great. No change needed.

---

## 15. Error Boundary

### What works
- **"Something went sideways"** — the right level of casual without being dismissive.
- **"No worries — your data is safe. Let's get you back on track."** — reassuring and forward-looking.

**Issue 15.1 — "Try again" vs "Go home"**
- Correct button order and labels for destructive/safe hierarchy.
- One small note: "Go home" could be mistaken for a navigation action (like going to the Home tab). If routes have names in this app, consider `"Go to Home screen"` or just `"Start over"`.

---

## 16. Install Banner

**Issue 16.1 — Android copy: "Works offline · No browser bar · Feels native"**
- "Feels native" is developer-speak. Users don't know what "native" means. Suggested: `"Works offline · No browser bar · Full screen"`.

---

## 17. Cookie Banner

**Issue 17.1 — "No cookies, no tracking." is technically inaccurate**
- The app uses `localStorage` for state and Supabase for auth. While the analytics may be cookieless, the app does use functional storage. "No cookies" could be disputed.
- Suggested: `"We save your preferences locally. No tracking cookies."` — more precise.

---

## Consolidated Fix List (Priority Order)

### P0 — High impact, quick wins

| ID | Location | Current | Suggested |
|----|----------|---------|-----------|
| 3.4 | Energy labels (everywhere) | 4 different label sets | Standardize: **Drained / Low / Okay / Good / Wired** |
| 2.6 | Timer style label | "Count down" vs "Countdown" | Standardize: **Countdown / Count-up / Surprise** |
| 5.7 | ICS export toast | "📅 Opening in your calendar app..." | **"📅 Calendar event saved — open it in your calendar app."** |
| 6.1 | Interrupt-confirm emoji | ⚠️ | Replace with **⏸️** |
| 6.2 | Interrupt-confirm CTA | "Keep going 💪" | **"Keep going 🌿"** or **"Stay in session"** |

### P1 — Copy clarity improvements

| ID | Location | Current | Suggested |
|----|----------|---------|-----------|
| 1.2 | Auth — sent state | "Check your inbox 📬" | **"Magic link on its way ✨"** |
| 1.3 | Auth — footer | Redundant consent | Remove or replace with trust line |
| 4.5 | CoachMark | "it's designed for exactly this" | **"Use Focus mode for a timed session."** |
| 5.1 | Voice empty transcript | "try again in a quiet spot" | **"try again, or type it instead"** |
| 5.6 | AI unexpected response | "AI returned an unexpected response" | **"Something went wrong — add the task manually."** |
| 7.1 | Nature Buffer skip | "Skip rest" | **"Continue"** or **"I'm ready"** |
| 7.2 | Recovery Lock header | "90 minutes! Amazing 🌊" | **"90 minutes of deep focus. 🌊"** |
| 8.3 | Recovery Protocol chip | "Or pick a micro-win to start:" | **"Or pick something easy to start with:"** |
| 10.1 | Weekly Insight button | "Generate" | **"Get insights"** |
| 14.1 | BurnoutAlert caution CTA | "Try a 5-min micro-focus →" | **"Try a 5-minute session →"** |
| 16.1 | Install Banner | "Feels native" | **"Full screen"** |

### P2 — Polish and consistency

| ID | Location | Current | Suggested |
|----|----------|---------|-----------|
| 1.1 | Auth heading | "Welcome — let's get you in" | **"Welcome. Let's get started."** |
| 2.1 | Onboarding progress | Both step number + % | Show only one |
| 3.2 | QuickSetup skip | "Skip — I'll explore on my own →" | **"Skip for now"** |
| 4.3 | NEXT pool empty | "Queued tasks will appear here." | **"Your upcoming tasks will live here."** |
| 6.5 | Hard-stop bypass | "I'm in hyperfocus — keep going" | **"I know — let me keep going"** |
| 8.2 | Recovery CTA skip | "Skip — just show me my tasks" | **"Skip — show my tasks"** |
| 10.2 | Active Days stat | "{n}/7" | **"{n} days focused"** |
| 11.1 | Delete button | "Permanently delete" | **"Yes, delete my account"** |
| 11.4 | Sandbox phase | "Explore freely — no limits" | **"Open mode — no pool constraints"** |
| 13.1 | Mochi 60min | "Remember this feeling. 🌟" | **"One hour. This was real. 🌟"** |
| 17.1 | Cookie banner | "No cookies, no tracking." | **"No tracking cookies."** |

---

## Systemic Voice Observations

**Strengths to preserve:**
1. The consistent use of forward-looking, non-shame framing is excellent and should be actively protected as the app grows.
2. "No rush." appears in multiple places as a closing reassurance. This is a signature phrase — consider formally adopting it as a brand voice pillar.
3. First-person plural "we" (e.g. "Where were we?") and "Let's" create collaborative feel without being patronizing. Keep this pattern.
4. The distinction between task snooze ("Park it") and session interruption ("Park your progress") is an emerging naming collision to watch.

**Terminology to standardize in a glossary:**
| Term | Definition | Where used |
|------|-----------|------------|
| Park it | Snooze a task from NOW → NEXT | TaskCard |
| Carry-over | Task older than 24h | TaskCard badge |
| Focus session | A timed work block | FocusScreen |
| Sound Anchor | Audio preset paired to focus | FocusScreen setup |
| Flexible Pause / Rest mode | 24h low-pressure window | Settings |
| Phase | Seasonal mode (Launch/Maintain/Recover/Sandbox) | Settings |
| Micro-win | A low-stakes starter action | RecoveryProtocol (internal — avoid in UI) |
