# MindShift Design Rules & ADHD Principles

## Core Philosophy
MindShift is built for ADHD brains. Every design decision must pass:
1. **Non-punitive** — no red, no shame, no urgency language
2. **Calm palette** — Research #8: teal/indigo/gold only. Red = banned.
3. **Progressive disclosure** — show less, not more
4. **Variable ratio rewards** — VR schedule (8/17/75) for dopamine
5. **Phase-aware focus** — struggle→release→flow, not a countdown

## Color System
| Token | Hex | Use |
|-------|-----|-----|
| primary | #7B72FF | CTAs, FAB, progress fills |
| teal | #4ECDC4 | Easy tasks, release/flow phase, complete actions |
| gold | #F59E0B | Hard tasks, carry-over badge, recovery phase (warm amber) |
| surface | #1E2136 | Card background |
| surface-raised | #252840 | Input bg, disabled states, tracks |
| text-primary | #E8E8F0 | Body text |
| text-muted | #8B8BA7 | Secondary / placeholder |
| border | rgba(255,255,255,0.06) | Subtle separators |
| ❌ RED | any red | BANNED. Anxiety trigger. Use gold for warnings. |

Calm mode (via usePalette): all colors desaturated ~30%

## Touch Target Rules (WCAG 2.1 AA + iOS HIG)
- Minimum: **44×44px** on all interactive elements
- Pattern for visual-only small elements: wrap in `min-w-[44px] min-h-[44px] flex items-center justify-center`
- CTA buttons: `py-3.5` (56px) minimum
- Action buttons: `py-3` (44px) minimum
- Never use just `p-1` or `p-2` on a button without expanding touch area

## Z-Index Stack
```
z-10  — floating elements (card badges)
z-20  — sticky headers
z-30  — BottomNav
z-40  — InstallBanner, ContextRestore backdrop
z-50  — CookieBanner, RecoveryProtocol, modals, tooltips
```

## Safe Area Handling
- BottomNav total height: 60px content + env(safe-area-inset-bottom)
- Main scroll padding: `pb-[calc(64px+env(safe-area-inset-bottom))]` (AppShell)
- Floating elements above nav: `bottom-[calc(64px+env(safe-area-inset-bottom))]`
- CookieBanner: `bottom: calc(64px + env(safe-area-inset-bottom) + 8px)` (extra 8px gap)

## Animation Rules
- Always check `useMotion()` → `shouldAnimate` before animations
- `prefers-reduced-motion: reduce` → shouldAnimate=false → skip all motion
- Use `transition={{ ...t() }}` from useMotion for consistent spring
- Never animate during reduced motion — instant state changes only
- Pulsing glow (struggle phase) also respects shouldAnimate

## Typography
- Font: System font stack (no custom fonts — performance + PWA)
- Headings: `font-semibold` or `font-bold`
- Body: `text-base` (16px)
- Labels/tags: `text-xs` with `tracking-widest uppercase`
- Mono (timer): `font-mono tabular-nums`

## Empty States (required for every list)
- NOW pool empty: "Pool clear! 🎉" with add task CTA
- NEXT pool empty: shown (no tasks message)
- SOMEDAY empty: shown
- Achievements locked: greyed out with lock emoji
- Progress no data: 0 bar, no chart crash

## ADHD-Specific Rules
- **No countdown timers on tasks** — time anxiety trigger
- **No red difficulty** — teal/indigo/gold difficulty gradient
- **Carry-over badge** not "overdue" — shame-free language
- **Park it** not "snooze" — calm, no negative connotation
- **Recovery Protocol** — never "You missed X days" (shame). Always welcome back.
- **NOW pool max 3** — cognitive load theory
- **VR XP** — variable ratio for dopamine (not fixed rewards)
- **Flow phase: digits vanish** — no time anxiety during deep focus
- **5-minute rule** (quick start) — activation energy reduction
