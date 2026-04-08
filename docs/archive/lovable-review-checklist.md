# Lovable → MindShift: Чеклист готовности

> Вставь этот промпт в Lovable (или используй сам для ревью).
> Цель: понять что готово на 100%, что частично, что отсутствует.

---

```
Review this MindShift app against the following checklist. For EACH item answer exactly one of:
✅ DONE — fully matches spec
⚠️ PARTIAL — exists but differs from spec (explain what's wrong)
❌ MISSING — not implemented

Be brutally honest. Don't say DONE if something is close but not exact.

---

## DESIGN SYSTEM

DS-1. Background color is #0F1120 (not pure black, not gray)
DS-2. Card backgrounds are #1E2136
DS-3. Primary color is #7B72FF (indigo) — used for CTAs, selected states, accents
DS-4. Teal is #4ECDC4 — used for success, easy tasks, positive feedback
DS-5. Gold is #F59E0B — used for warnings, hard tasks, carry-over badges
DS-6. NO RED ANYWHERE — not in errors, not in delete buttons, not in alerts
DS-7. Text primary is #E8E8F0, text muted is #8B8BA7
DS-8. Font is Inter
DS-9. Cards have rounded-2xl (16px border-radius)
DS-10. All interactive elements have min-height 44px
DS-11. Primary buttons use gradient: linear-gradient(135deg, #7B72FF, #8B7FF7)
DS-12. Glass effect on bottom nav: rgba(23,26,43,0.95) + backdrop-blur
DS-13. Border subtle: rgba(255,255,255,0.06)
DS-14. Selected chips: bg rgba(123,114,255,0.15) + border #7B72FF
DS-15. Spacing follows 4px grid (p-1, p-2, p-3, p-4, p-6, p-8)

## BOTTOM NAV

NAV-1. Fixed at bottom, glass background
NAV-2. 5 tabs: Home, Tasks, Focus, Progress, Settings
NAV-3. Active tab: primary color + subtle glow background
NAV-4. Inactive: #8B8BA7
NAV-5. Labels below icons, 11px
NAV-6. Safe-area padding at bottom

## HOME SCREEN

H-1. Greeting changes by time of day (morning ☀️ / afternoon 🌤️ / evening 🌙)
H-2. Subtitle: "One task at a time. What matters most?"
H-3. Mochi mascot (teal-blue blob, dot eyes, smile) — top right
H-4. Welcome card with 3 mode options (One thing / Daily habits / Manage everything)
H-5. Welcome card has "Skip for now" text button
H-6. Selected mode card: primary border + alpha background
H-7. Energy check-in: 5 emojis (😴😌🙂😄⚡) with labels below
H-8. First Task Prompt: dotted border card with "What's one thing on your mind?"
H-9. NOW pool: "NOW" label (primary, uppercase) + counter + TaskCards
H-10. Up Next preview card: "📋 Up next" + task count + "See all →"
H-11. Bento Grid: 2 columns, widget cards (stats, energy, streak, burnout)
H-12. Add Task FAB: pill shape, gradient, "Add task" text + plus icon, fixed bottom-24

## TASK CARD

TC-1. Left border 3px: teal (easy), #7B72FF (medium), #F59E0B (hard)
TC-2. Difficulty dots (3 dots, filled based on level) + label badge
TC-3. Time estimate "~15m" (muted)
TC-4. Title: 15px semibold, max 2 lines
TC-5. "✓ Done" button (teal outlined) + "Park it →" button (dark bg)
TC-6. Optional badges: 💡 idea, 🔔 reminder, amber carry-over
TC-7. Different difficulty examples shown (easy, medium, hard)

## TASKS SCREEN

T-1. Header: "Your Tasks" + "N tasks in play"
T-2. NOW section with label + counter + TaskCards
T-3. Energy hint banner (teal-tinted): "Low energy day? Start with an easy one"
T-4. NEXT section with label + counter + TaskCards
T-5. SOMEDAY section — collapsible with chevron
T-6. Done recently section — collapsible, teal header, strikethrough titles, relative dates
T-7. Add Task FAB present

## FOCUS SCREEN (SETUP)

F-1. Header: "Focus Session ⏱️" + energy label
F-2. Bookmark anchor card (📌 PICK UP WHERE YOU LEFT OFF)
F-3. Task picker: "Open focus" default + list of tasks with pool badges
F-4. Duration presets: pills 5|15|25|45|60|Custom, 25 has ⭐
F-5. Start button: full width, gradient, "Start Focus →", 52px height, big shadow

## FOCUS SCREEN (ACTIVE)

FA-1. Full screen, no bottom nav
FA-2. Phase label: "Struggle" / "Release" / "Flow" — color coded
FA-3. ARC TIMER: large SVG circle (280px), thick arc, phase-colored
FA-4. Time digits centered: "14:32" (30px bold)
FA-5. Subtle pulsing glow around arc
FA-6. Task title below timer (muted)
FA-7. Mochi companion: small speech bubble with encouragement
FA-8. 3 control buttons (48px circles): Audio, End, Park thought
FA-9. Background is #0F1120, immersive feel

## PROGRESS SCREEN

P-1. Header: "Your Progress 🌱" + subtitle
P-2. Avatar + XP card: level, XP total, progress bar (gradient fill)
P-3. Weekly consistency: 7 vertical bars, gradient fill, day labels
P-4. Stats grid (3 cols): Achievements, Tasks Done, Active Days
P-5. Energy trends: emoji row + trend arrow (↑↓→)
P-6. AI Insights: 3 insight cards with emojis
P-7. Achievements grid: unlocked (full color) vs locked (grayscale 40%)

## SETTINGS SCREEN

S-1. Header: "Settings" + email
S-2. Plan: "🌱 MindShift Free"
S-3. App Mode: 3 options (Minimal/Habit/System) with descriptions
S-4. Timer Style: 3 chips (Countdown/Count-up/Surprise)
S-5. Energy: 5 emoji buttons with labels
S-6. Phase: 2×2 grid (Launch/Maintain/Recover/Sandbox) with task limits
S-7. Rest Mode toggle
S-8. Accessibility toggle: "Reduced stimulation"
S-9. Export data button (teal)
S-10. Delete account (GOLD text, NOT red)
S-11. Sign out (amber #E8976B, NOT red)
S-12. Footer: privacy links + "Built with 💜 for ADHD minds"

## ONBOARDING

O-1. Progress bar: 4 segments, filled = primary gradient
O-2. Step counter: "Step N of 4"
O-3. Back button on steps 2-4
O-4. Step 1 — Intent: 3 large cards (One thing / Habits / Full picture)
O-5. Step 2 — Energy: 5 emoji buttons (56px), selected = scale + glow
O-6. Step 3 — Timer: 3 cards (Countdown / Count-up / Surprise)
O-7. Step 4 — Style: 2 cards (One at a time / See everything) + "Let's go ✨"
O-8. Transitions: slide horizontal between steps

## ADD TASK MODAL

AT-1. Bottom sheet (slides up)
AT-2. Handle bar + header + close X
AT-3. Title input: placeholder "What's on your mind?", bg #252840
AT-4. Difficulty: 3 buttons (Easy teal / Medium primary / Hard gold)
AT-5. Time estimate: pill row (5m|15m|25m|45m|60m|Custom)
AT-6. Due date: toggle to show date + time pickers
AT-7. Pool indicator: "Adding to NOW" or "NOW is full — landing in NEXT"
AT-8. Submit: "Add to Now →" or "Add to Next →" gradient button

## OVERALL FEEL

UX-1. App feels calm and spacious, not cluttered
UX-2. Generous whitespace between sections
UX-3. Animations present (fade-in, slide, stagger)
UX-4. No visual overwhelm — feels like a companion not a task manager
UX-5. Dark theme consistent across all screens
UX-6. Touch targets large enough for mobile

---

After the checklist, write a SUMMARY:
- Total ✅: ___
- Total ⚠️: ___
- Total ❌: ___
- Top 3 things that need fixing before handoff
```
