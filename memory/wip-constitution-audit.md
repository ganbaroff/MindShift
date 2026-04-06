# Constitution vs MindShift Code Audit — 2026-04-06
# Breadcrumb — READ THIS if context compresses

## VIOLATIONS FOUND

| # | Rule | Status | What's wrong | Fix |
|---|------|--------|-------------|-----|
| 1 | Rule 9: XP display | VIOLATED | XpCard.tsx:45 shows raw "2,450 XP" | Remove raw XP line, show only "Level X · Name" |
| 2 | Law 4: Confetti particles | VIOLATED | Confetti.tsx:8 — PARTICLE_COUNT=20, max is 12 | Change to 12 |
| 3 | Rule 11: Onboarding shame-free contract | NOT IMPLEMENTED | No "no penalties ever" pledge on screen 1 | Add banner |
| 4 | Rule 12: Flow breakers question | NOT IMPLEMENTED | No "What breaks your flow?" with 3-4 options | Add onboarding step |
| 5 | Rule 13: If-Then intentions | NOT IMPLEMENTED | No pre-session "If distracted, then..." prompt | Build in FocusSetup |
| 6 | Rule 14: Hyperfocus detection | PARTIAL | NatureBuffer skips logged but no 3-skip trigger | Add pattern detection |
| 7 | Rule 15: Tab churn monitoring | NOT IMPLEMENTED | No 3-switch counter → Mochi intervention | Build with Page Visibility API |
| 8 | Law 1: Button "danger" variant | MINOR | Button.tsx has variant="danger" in API (unused) | Rename to "warning" |

## COMPLIANT

| Rule | Status |
|------|--------|
| Law 1: No red hex codes | ✓ Zero red found |
| Law 1: No red Tailwind classes | ✓ None found |
| Rule 3: Streaks invisible at 0-1 | ✓ Shows >= 2 only |
| Rule 8: Crystals Progress-only | ✓ Not in NatureBuffer/PostSession |
| Crystal Law 6: Post-session vulnerability | ✓ No crystals in vulnerability window |
| Law 3: Banned phrases | ✓ No "You haven't", "% complete", etc. |
| Law 4: Motion safety | ✓ All animations have prefers-reduced-motion |
| Law 5: One primary action | ✓ Single gradient button per screen |

## Priority for fixes
1. Rule 9 (XP raw numbers) — 1 line change
2. Confetti particles 20→12 — 1 line change
3. Button "danger" → "warning" — rename
4-8: New features (onboarding, if-then, tab churn) — sprints
