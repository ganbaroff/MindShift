# ADR-003: Variable Ratio XP Schedule for Gamification

**Status:** Accepted
**Date:** 2026-03-09
**Deciders:** Yusif (sole owner)
**Context area:** Engagement / reward system design

---

## Context

MindShift includes an XP and achievement system to reward task completion. The challenge is that ADHD is characterized by a **Dopamine Transfer Deficit** (Research #5): the dopamine response to anticipated rewards is blunted compared to neurotypical brains, but the response to *unexpected* rewards remains intact.

A fixed reward schedule (e.g., "always +10 XP per task") will rapidly habituate and lose motivational power for ADHD users. The reward becomes predictable and the dopamine anticipation response extinguishes.

---

## Decision

Use a **Variable Ratio (VR) XP bonus schedule** modeled after behavioral reinforcement research:
- 8% of completions → 2.0× XP burst
- 17% of completions → 1.5× XP burst
- 75% of completions → 1.0× XP (baseline)

Base XP is also modulated by task difficulty (×1, ×2, ×3) and energy level (low energy = 1.2× bonus, high energy = 0.8× — rewards effort at low battery).

---

## Options Considered

### Option A: Fixed XP per task
| Dimension | Assessment |
|-----------|------------|
| Predictability | High (bad for ADHD) |
| Implementation | Trivial |
| Long-term retention | Poor — habituates quickly |
| Perceived fairness | High |

**Pros:** Simple to explain, predictable, easy to test
**Cons:** Dopamine anticipation extinguishes within 1–2 weeks; no surprise factor; neurotypical design antipattern for ADHD

### Option B: VR Schedule (variable ratio) ✅ CHOSEN
| Dimension | Assessment |
|-----------|------------|
| Predictability | Low (good for ADHD) |
| Implementation | Simple (Math.random + thresholds) |
| Long-term retention | High — mirrors slot machine psychology |
| Perceived fairness | Medium — users know bonuses are random |

**Pros:** Exploits intact dopamine response to unexpected rewards; never punishes (minimum is baseline, no penalty); creates "dopamine bridge" over activation energy barriers
**Cons:** Can feel arbitrary; harder to explain to users; requires honest communication ("sometimes you get bonus XP!")

### Option C: Streak-based multiplier
| Dimension | Assessment |
|-----------|------------|
| Retention mechanism | Streak anxiety (harmful for ADHD) |
| Implementation | Simple |

**Pros:** Common pattern, well-understood
**Cons:** Streak mechanics are a documented ADHD anxiety trigger — breaking a streak causes disproportionate shame response, often leading to app abandonment (Research #7). **Hard no.**

### Option D: XP only on first daily completion
**Pros:** Prevents gaming
**Cons:** Punishes users who complete many tasks in a day; disincentivizes momentum

---

## Trade-off Analysis

The VR schedule is the only option aligned with the neuroscience. The key constraints from Research #5 are:
1. The reward must come *after* the behavior (not before, not during)
2. The ratio of bonus:normal must create genuine surprise (~1:10)
3. There must be no penalty for not receiving a bonus (pure positive reinforcement)

The 8%/17%/75% split was chosen to match the literature on optimal VR schedules for sustained behavior. The 2.0× ceiling prevents XP inflation while still feeling like a meaningful "jackpot."

The energy multiplier (low energy = bonus) directly addresses a core ADHD frustration: completing tasks when your executive function is depleted is genuinely harder. The system rewards that extra effort.

---

## Consequences

**Easier:**
- Long-term engagement without streak anxiety
- Genuine dopamine surprise response sustained over weeks
- No punishment mechanics anywhere in the app

**Harder:**
- Explaining the system to users (needs good copy in onboarding/progress screen)
- Testing exact XP calculations (addressed in test suite: `calculateXP.test.ts`)
- Balancing: if base XP is too low, even 2× feels meaningless

**Revisit if:**
- Research suggests different ratio thresholds
- User interviews reveal the randomness feels unfair rather than exciting
- XP inflation becomes a problem at high levels

---

## Action Items
- [x] Implement VR schedule in `TaskCard.handleComplete()`
- [x] `notifyXP()` for normal XP, `notifyXPBonus()` for bonus (different toast styles)
- [x] Energy multiplier: ≤2 = 1.2×, ≥4 = 0.8×, else 1.0×
- [x] Unit tests for XP calculation in `calculateXP.test.ts`
- [ ] Add XP system explanation to onboarding (progressive disclosure via CoachMark after first bonus)
