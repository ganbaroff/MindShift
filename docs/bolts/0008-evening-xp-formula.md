# ADR 0008 — Evening Review XP Formula

**Date:** 2026-03-07
**Status:** Accepted
**Bolt:** 2.4

---

## Context

Bolt 2.4 adds a character progression system to the Evening Review screen.
Users earn XP after completing an evening review. We need a formula that is:

1. ADHD-safe (does not create shame or loss-aversion)
2. Predictable (users can trust what they'll earn)
3. Motivating without being manipulative

---

## Decision — Activity-Based XP, Not Completion-Based

### Formula

| Activity | XP | Reasoning |
|----------|----|-----------|
| Opened evening review and pressed "How did the day go?" | +10 | Base award — you showed up |
| Had a day plan (≥1 task created via day planner) | +10 | Rewarding intention, not outcome |
| Completed at least 1 task | +10 | Rewarding any progress, not percentage |
| Wrote a personal note in the textarea | +10 | Rewarding reflection |
| Requested AI reflection | +10 | Always awarded when button pressed |

**Range:** 10 (base only) → 50 (all activities)
**Formula:** `floor(total_xp / 100) + 1` → Level

### Why NOT percentage-based

Completion-based XP (e.g. 80% completion = 40 XP) would:

- Create shame for days with low completion (RSD trigger — rejection-sensitive dysphoria)
- Incentivise planning fewer tasks to guarantee high completion rate (perverse incentive)
- Punish complex/hard days where ADHD tax is highest — exactly when the user needs the most support
- Create binary "good day / bad day" narrative that neurodivergent-ux skill explicitly prohibits

The research basis (ADHD-aware-planning skill, Principe 2): streaks and completion-rate mechanics are known shame-loop triggers for ADHD users. XP is activity-based to reinforce the habit of reflection itself, not task completion.

### Why the AI confirms but does not compute XP

The XP is computed client-side before the AI call. The AI prompt includes the computed value and is asked to "confirm" it. The AI cannot override the formula. This ensures:

- Deterministic XP (same activities = same XP, always)
- No hallucination-driven XP inflation or deflation
- The AI response parsing clamps xp_earned to [10, 50] as a safety net
- If AI parse fails, the client-calculated value is used directly

---

## Consequences

- Users who open the evening review always get ≥10 XP — no day is "0 XP"
- Level progression is slow by design: 100 XP per level = ~3-4 daily reviews per level
- No streak counter anywhere (ADHD-aware-planning Principle 2)
- The `character_progress` table has no DELETE policy — XP is permanent
  (resetting progress is not available in MVP; if added, it's a user-initiated action in settings)

---

## Alternatives Considered

| Option | Rejected Because |
|--------|-----------------|
| % completion → XP | Shame-loop, perverse incentive (see above) |
| AI freely computes XP | Non-deterministic, hallucination risk, gameable |
| Streak-based XP bonus | Violates ADHD-aware-planning Principle 2 |
| XP decay over time | Creates anxiety and urgency — exact opposite of our UX goal |
| Random XP (variable reward) | Hook-model dark pattern — prohibited by Principle 7 |
