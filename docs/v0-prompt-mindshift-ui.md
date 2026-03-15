# MindShift — UI Build Prompt

> Этот промпт предназначен для v0.dev (или Lovable / Bolt).
> Результат: набор React + Tailwind экранов, которые будут интегрированы в существующий проект.
> **Язык промпта — английский** (v0 лучше работает на английском).

---

## Как использовать

1. Скопируй **Section 0 (Design System)** + один из экранов (Section 1-7)
2. Вставь в v0.dev
3. Получи код
4. Скинь мне `.tsx` файл(ы) — я интегрирую в проект

Каждый экран — отдельный промпт. Не кидай всё сразу.

---

## Section 0 — Design System (ВСТАВЛЯТЬ В КАЖДЫЙ ПРОМПТ)

```
Design system for a mobile-first PWA called MindShift — an ADHD-friendly productivity app.

CRITICAL RULES:
- NEVER use red. Not for errors, not for alerts, not for anything. This is an ADHD-safe app. Use gold (#F59E0B) for warnings/overdue.
- Dark theme ONLY. Background: #0F1120. No light mode.
- Font: Inter (import from Google Fonts)
- All interactive elements: min-height 44px (Apple HIG)
- Border-radius: cards 16px, buttons 12px, pills 9999px
- All cards: background #1E2136, border 1px solid rgba(255,255,255,0.06)
- Mobile viewport: max-width 430px, centered

COLOR TOKENS:
- Primary (CTA, accents): #7B72FF (indigo)
- Teal (success, easy tasks, positive): #4ECDC4
- Gold (warnings, hard tasks, carry-over): #F59E0B
- Purple (hard tasks accent): #A78BFA
- Background: #0F1120
- Card surface: #1E2136
- Raised surface: #252840
- Text primary: #E8E8F0
- Text muted: #8B8BA7
- Text subtle: #6B6B8A
- Border subtle: rgba(255,255,255,0.06)
- Primary alpha (15%): rgba(123,114,255,0.15)
- Glass effect: rgba(23,26,43,0.95) + backdrop-blur-xl

TYPOGRAPHY SCALE:
- 11px: captions, nav labels (font-medium)
- 13px: secondary text, badges
- 15px: body text
- 17px: subheadings (font-semibold)
- 20px: section titles (font-bold)
- 24px: screen titles (font-bold)
- 30px: hero numbers

SPACING: 4px base grid. Cards: p-4. Screen horizontal: px-5. Between sections: gap-6.

COMPONENT PATTERNS:
- Buttons: gradient background (linear-gradient 135deg #7B72FF → #8B7FF7), text white, shadow 0 8px 32px rgba(123,114,255,0.3)
- Outlined buttons: bg transparent, border 1.5px solid rgba(123,114,255,0.35), text #7B72FF
- Chips (selected): bg rgba(123,114,255,0.15), border 1.5px solid #7B72FF, text #7B72FF
- Chips (unselected): bg #252840, border 1px solid rgba(255,255,255,0.06), text #8B8BA7
- Toast: bg #252840, border-left 3px solid #4ECDC4, text #E8E8F0
- Bottom navigation: fixed bottom, glass bg, 5 items, active = primary color + glow

ANIMATIONS (use framer-motion):
- Page transitions: slide horizontal, 300ms ease-out
- Cards appear: fade-in + slide-up 20px, staggered 50ms
- Buttons: scale 0.97 on press
- Expand/collapse: height auto with spring animation
```

---

## Section 1 — HomeScreen

```
Create a mobile HomeScreen for MindShift app.

LAYOUT (top to bottom, each section is a separate visual block):

1. HEADER (pt-10 pb-2, flex justify-between)
   Left side:
   - Large title "Good evening 🌙" (24px bold, #E8E8F0)
     (Use time-based greeting: morning ☀️ / afternoon 🌤️ / evening 🌙)
   - Subtitle "One task at a time. What matters most?" (13px, #8B8BA7)
   Right side:
   - Circular mascot avatar (48px) — use a friendly blob character, teal/blue gradient, two dot eyes and a smile. This is "Mochi" the mascot.

2. WELCOME CARD (only for new users, dismissible)
   - Card with subtle glow border (rgba(123,114,255,0.25))
   - "👋 Welcome to MindShift" (17px bold)
   - "Pick a style to personalise your widget layout — or skip and explore." (13px muted)
   - 3 selectable cards stacked vertically inside:
     a) 🎯 "One thing at a time" / "Just need to focus on one task right now" (13px muted)
     b) 🌱 "Build daily habits" / "Consistency without overwhelm" (13px muted)
     c) 🗂️ "Manage everything" / "Full visibility over my projects" (13px muted)
   - Selected card: primary border + primary alpha bg
   - "Skip for now" text button at bottom (muted, centered)

3. ENERGY CHECK-IN (dismissible)
   - "How's your energy right now?" (15px, #E8E8F0)
   - Row of 5 circular buttons (48px each), evenly spaced:
     😴 Drained | 😌 Low | 🙂 Okay | 😄 Good | ⚡ Wired
   - Selected: scale 1.15 + primary ring
   - Labels below each emoji (11px, muted)

4. FIRST TASK PROMPT (shows when no tasks exist)
   - Card with dotted border (rgba(123,114,255,0.35))
   - 🧠 icon (24px)
   - "What's one thing on your mind right now?" (17px semibold)
   - "Capture it — we'll help you break it down." (13px muted)
   - Button: "✨ Add my first task →" (gradient, full width, 44px height)
   - Small dismiss X button (top right corner)

5. NOW POOL WIDGET
   - Header: "NOW" (11px, uppercase, tracking-widest, #7B72FF) + "1/3" counter (muted)
   - 1-3 TaskCards (see TaskCard spec below)
   - Empty state: "Nothing here yet — tap + to add a task" (13px, muted, centered)

6. UP NEXT PREVIEW (compact card)
   - "📋 Up next" (15px semibold) + "2 tasks queued" (13px muted)
   - Show first 2 task titles as one-liners (13px, muted)
   - "See all →" link (primary color)

7. BENTO GRID (2 columns, gap-3)
   Widget cards (each ~equal height, rounded-2xl):
   a) Lifetime Stats: "✅ 47 tasks done" / "⏱ 12.5h focused" / "⚡ 2,340 XP" / "📋 5 in play"
   b) Energy Widget: Current energy emoji (large) + "Tap to update"
   c) Burnout Radar: Gauge from 0-100, current score, color-coded (teal < 40, gold 40-65, purple 66+)
   d) Focus Streak: "🔥 5 day streak"

8. ADD TASK FAB (fixed, bottom-24, centered)
   - Pill shape button: Plus icon + "Add task" text
   - Gradient bg (#7B72FF → #8B7FF7)
   - Shadow: 0 8px 32px rgba(123,114,255,0.3)
   - Floats above bottom nav

9. BOTTOM NAV (fixed bottom, glass bg)
   - 5 items evenly spaced: 🏠 Home | ✅ Tasks | ⏱ Focus | 📅 Upcoming | ⚙️ Settings
   - Active: primary color icon + text, subtle glow bg
   - Inactive: #8B8BA7
   - Labels: 11px
   - Safe area padding at bottom

TASK CARD COMPONENT (used inside NOW pool):
- Card bg #1E2136, border-left 3px solid (teal for easy, #7B72FF for medium, #F59E0B for hard)
- Top row: 3 difficulty dots (filled/unfilled) + "Easy" badge (11px, teal bg 15%) + "~15m" estimate (muted)
- Title: "Review project proposal" (15px semibold, max 2 lines)
- Bottom row: "✓ Done" button (outlined teal, 36px height) + "Park it →" button (dark bg, muted text)
- Optional badges: "🔔" for reminders, "💡" for ideas, amber "carry-over" badge for old tasks

Show 2-3 example TaskCards with different difficulties.

Make everything feel calm, spacious, and non-overwhelming. Generous whitespace between sections. No visual clutter. The app should feel like a gentle companion, not a demanding todo list.
```

---

## Section 2 — TasksScreen

```
Create a mobile Tasks screen for MindShift app.

[Paste Section 0 design system here]

LAYOUT (scrollable, top to bottom):

1. HEADER (pt-10 pb-4)
   - "Your Tasks" (24px bold)
   - "5 tasks in play" (13px muted)

2. NOW SECTION
   - Label row: "NOW" (11px uppercase tracking-widest, #7B72FF) + "2/3" counter (muted right-aligned)
   - 2 TaskCards (see HomeScreen spec for TaskCard format)
   - Between cards: gap-3

3. ENERGY HINT BANNER (conditional, shown when energy is low)
   - Rounded card, bg rgba(78,205,196,0.08), border rgba(78,205,196,0.22)
   - "🌱 Low energy day? Start with an easy one — momentum builds from small wins."
   - Text: 13px, #4ECDC4

4. NEXT SECTION
   - Label row: "NEXT" (11px uppercase, #8B8BA7) + "3/6" counter
   - 3 TaskCards (different difficulties)
   - Empty state: "Your upcoming tasks will live here. No rush." (centered, muted)

5. SOMEDAY SECTION (collapsible)
   - Button row: "SOMEDAY" (11px uppercase, muted) + chevron (▼) + "2 tasks" badge
   - When expanded: 2 TaskCards
   - When collapsed: just the header

6. DONE RECENTLY SECTION (collapsible, collapsed by default)
   - Button row: "✓ Done recently" (13px, #4ECDC4) + count badge (teal pill) + chevron
   - When expanded, each completed task row:
     - ✓ icon (teal, 16px)
     - Title (strikethrough, muted, 15px)
     - Difficulty badge (11px, pill)
     - Relative date "today" / "yesterday" / "3d ago" (11px, muted)
   - Show 3 example completed tasks

7. ADD TASK FAB (same as HomeScreen — fixed, bottom-24)

8. BOTTOM NAV (Tasks tab active)

Make the screen feel organized but not rigid. Sections should breathe with generous spacing.
```

---

## Section 3 — FocusScreen (Setup State)

```
Create a Focus Session setup screen for MindShift app.

[Paste Section 0 design system here]

This is the pre-session state — user configures and launches a focus session.

LAYOUT:

1. HEADER (pt-10 pb-4)
   - "Focus Session ⏱️" (24px bold)
   - "Energy: Good 😄" (13px, #4ECDC4) — energy label color-coded

2. BOOKMARK ANCHOR (optional saved progress card)
   - Card with primary-alpha border
   - "📌 PICK UP WHERE YOU LEFT OFF" (11px uppercase, primary)
   - "Finish the quarterly report" (15px semibold)
   - Row: "Continue →" button (primary) + "Dismiss" (muted text)

3. TASK PICKER
   - "TASK (OPTIONAL)" label (11px uppercase, muted)
   - First option card: "🧠 Open focus — no specific task" (selected state)
   - Then list of 3-4 tasks from NOW/NEXT pools:
     - Each: pool badge ("NOW" primary / "NEXT" muted) + task title
     - Selected: primary border + alpha bg
     - Not selected: subtle border
   - Empty: "🎯 No tasks yet — add one first"

4. DURATION PRESETS
   - "DURATION" label (11px uppercase, muted) + "(smart: 25m ⭐)" hint
   - Row of pill buttons: 5 | 15 | 25 | 45 | 60 | ✎
   - "25" has ⭐ badge (recommended)
   - Selected: gradient bg, white text
   - Unselected: surface-raised bg, muted text

5. SOUND ANCHOR (if preset saved)
   - Small card: "🎯 Sound Anchor ready" + "Brown noise will play automatically" (muted)

6. START BUTTON (full width, prominent)
   - "Start Focus →" (white text, 17px semibold)
   - Gradient bg: #7B72FF → #8B7FF7
   - Height: 52px
   - Shadow: 0 8px 32px rgba(123,114,255,0.3)
   - Rounded: 16px

7. BOTTOM NAV (Focus tab active)
```

---

## Section 4 — FocusScreen (Active Session)

```
Create an active focus session screen for MindShift app.

[Paste Section 0 design system here]

This screen shows during an active focus session. It should feel immersive, calm, and distraction-free. Hide the bottom nav.

LAYOUT (centered, full-screen, dark background #0F1120):

1. PHASE LABEL (top, centered)
   - Current phase text: "Struggle" (muted) or "Release" (teal) or "Flow ✨" (teal, brighter)
   - 13px, font-medium

2. ARC TIMER (centered, dominant element)
   - Large SVG circle (280px diameter)
   - Thick progress arc (stroke-width 8px):
     - Struggle phase: #7B72FF (primary)
     - Release phase: #4ECDC4 (teal)
     - Flow phase: #4ECDC4 (teal, brighter)
   - Background track: rgba(255,255,255,0.06)
   - Center content:
     - Time digits: "14:32" (30px, bold, #E8E8F0)
     - In flow mode: digits fade to 20% opacity
   - Subtle pulsing glow around the arc (8px, matching phase color, 10% opacity)

3. TASK TITLE (below timer, centered)
   - "Review project proposal" (15px, muted)
   - In flow mode: fades to 30% opacity
   - max-width 280px, text-center

4. MOCHI COMPANION (right side of timer or below)
   - Small speech bubble: "You're in the zone! Keep going 🌊" (13px)
   - Mochi mascot (32px) peeking from corner
   - Bubble appears/disappears with fade animation

5. CONTROLS (bottom area, above safe area)
   - Row of 3 circular buttons (48px each):
     a) 🔊 Audio toggle (outline, muted icon)
     b) ⏹ End session (outlined, primary border, "End" label below)
     c) 💭 Park a thought (outlined, muted)
   - Spacing: gap-8 between buttons

6. PARK THOUGHT POPUP (when 💭 tapped)
   - Bottom sheet or centered card
   - "💭 Park a thought" title
   - Textarea: placeholder "Quick note..." (bg #252840, 3 lines)
   - Buttons: "Save" (teal) + "Cancel" (muted)

Make the active session feel meditative. Minimal UI, lots of breathing room, the timer should be the focal point. No unnecessary elements.
```

---

## Section 5 — ProgressScreen (Dashboard)

```
Create a Progress/Dashboard screen for MindShift app.

[Paste Section 0 design system here]

LAYOUT:

1. HEADER (pt-10 pb-4)
   - "Your Progress 🌱" (24px bold)
   - "Every step counts, no matter how small." (13px muted)

2. AVATAR + XP CARD
   - Card bg #1E2136
   - Left: circular avatar (64px, gradient border primary→teal)
   - Right:
     - "Level 7 — Steadfast" (17px bold)
     - "2,340 XP total" (13px muted)
     - Progress bar: bg #252840, fill gradient primary→teal, height 8px, rounded-full
     - "1,340 / 2,000 XP to Level 8" (11px muted)

3. WEEKLY CONSISTENCY
   - "THIS WEEK" label (11px uppercase, muted) + "Great week 💪" (13px, teal)
   - Bar chart: 7 vertical bars (one per day, Mon-Sun)
     - Height proportional to focus minutes
     - Active day: gradient fill (primary→teal)
     - Empty day: #252840
     - Today: subtle glow ring
     - Day labels below: "M T W T F S S" (11px muted)
   - Summary: "5 of 7 days active · 185m total focus" (13px muted)

4. STATS GRID (3 equal columns)
   Each stat card (bg #1E2136, p-3, rounded-xl):
   - Large number (20px bold, primary color)
   - Label (11px muted)
   Stats:
   - "12" / "🏆 Achievements"
   - "47" / "✅ Tasks Done"
   - "23" / "📅 Active Days"

5. ENERGY TRENDS
   - "ENERGY AFTER SESSIONS" label (11px uppercase, #4ECDC4)
   - Row of last 10 session emojis: 😌 🙂 😄 🙂 😄 😄 ⚡ 😄 🙂 😄
   - Trend indicator: "↑ Trending up" (teal) or "→ Steady" (muted) or "↓ Dipping" (gold)
   - Sparkline chart below emojis (tiny, teal line, no axes, just shape)

6. AI INSIGHTS
   - "✨ WEEKLY INSIGHT" label (11px uppercase, #F59E0B)
   - 3 insight cards (gap-2):
     - 🧠 "Your peak focus is between 2-4pm"
     - 💡 "Try 15-minute sessions on low-energy days"
     - 🎯 "You complete 73% of tasks you start"
   - Each card: bg #252840, px-4 py-3, 13px text

7. ACHIEVEMENTS GRID (3 columns)
   - "12 of 24 unlocked" header
   - Each: emoji (36px) + name (11px) + unlock date or "🔒"
   - Locked: opacity 40%, grayscale
   - Unlocked: full color, subtle primary glow
   - Show 6 example achievements (mix locked/unlocked)

8. BOTTOM NAV

Feel inspiring but not performative. Numbers should motivate, not pressure.
```

---

## Section 6 — SettingsScreen

```
Create a Settings screen for MindShift app.

[Paste Section 0 design system here]

LAYOUT (scrollable sections):

1. HEADER (pt-10 pb-6)
   - "Settings" (24px bold)
   - "yusif@mindshift.app" (13px muted)

2. PLAN CARD
   - 🌱 "MindShift Free" (15px semibold)
   - Muted divider below

3. APP MODE (3 selectable cards, vertical stack)
   - Label: "YOUR MODE" (11px uppercase muted)
   - 🎯 "One thing at a time" / "Focus on NOW pool only" — chip style
   - 🌱 "Build daily habits" / "NOW + NEXT pools visible" — chip style
   - 🗂️ "Manage everything" / "All pools + 5 NOW tasks" — chip style
   - Selected: primary border + alpha bg

4. FOCUS TIMER
   - Label: "TIMER STYLE" (11px uppercase muted)
   - 3 horizontal chips: ⏱ Countdown | ⬆️ Count-up | 🎲 Surprise
   - Helper: "Count-up shows time earned — less pressure." (11px muted)

5. ENERGY LEVEL
   - Label: "ENERGY RIGHT NOW" (11px uppercase muted)
   - 5 emoji buttons in a row (48px each): 😴 😌 🙂 😄 ⚡
   - Labels below each (11px): Drained / Low / Okay / Good / Wired
   - Selected: scale + ring

6. YOUR PHASE (2x2 grid of cards)
   - Label: "YOUR CURRENT PHASE" (11px uppercase muted)
   - 🚀 Launch: "Push forward — up to 5 NOW tasks"
   - 🌱 Maintain: "Steady pace — 3 NOW tasks"
   - 🛋️ Recover: "Gentle — max 2 NOW tasks"
   - 🧪 Sandbox: "Experiment freely"
   - Selected: primary colors

7. REST MODE
   - Toggle row: 🛋️ "Pause focus pressure for 24h"
   - Helper: "Hides reminders and suggestions." (11px muted)

8. ACCESSIBILITY
   - Toggle row: "Reduced stimulation" with description
   - Helper: "Fewer animations, calmer colors"

9. YOUR DATA (card)
   - "You own your data." (13px)
   - Button: "📦 Export my data (JSON)" (teal outlined)
   - Divider
   - "Delete account" text button (gold/amber text, not red!)
   - When tapped: expand confirmation card with email input + "Yes, delete" (gold) + "Cancel"

10. SIGN OUT
    - "Sign out" button (amber text #E8976B, not red)

11. FOOTER
    - "Privacy Policy · Terms · Cookies" (11px muted, linked)
    - "MindShift v1.0 — Built with 💜 for ADHD minds" (11px muted)

12. BOTTOM NAV (Settings active)
```

---

## Section 7 — OnboardingFlow

```
Create a 4-step onboarding flow for MindShift app.

[Paste Section 0 design system here]

Full-screen flow, no bottom nav. Each step is a full screen with animated transition.

SHARED ELEMENTS (every step):
- Progress bar at top: 4 segments, filled = primary gradient, empty = #252840
- "Step 1 of 4" text (11px, primary) + "25% complete" (11px muted)
- Back button (< arrow, top left) on steps 2-4
- Skip all button (top right, muted text) on step 1 only

STEP 1 — INTENT
- "What brings you here today?" (24px bold)
- "This shapes your whole experience. You can always change it." (13px muted)
- 3 large cards (gap-4, full width):
  a) 🎯 "One thing at a time"
     "I need to close one important task right now."
     Border accent: teal on hover/select
  b) 🌱 "Build daily habits"
     "I want consistent routines that don't overwhelm me."
     Border accent: primary on hover/select
  c) 🗂️ "See the full picture"
     "I want visibility and control over all my projects."
     Border accent: gold on hover/select
- Each card: bg #1E2136, p-5, rounded-2xl, border transitions on select

STEP 2 — ENERGY
- "How's your brain right now?" (24px bold)
- "No wrong answer — this helps us match your pace today." (13px muted)
- Large central area with 5 emoji buttons (56px each) in an arc or row:
  😴 Drained | 😌 Low | 🙂 Okay | 😄 Good | ⚡ Wired
- Selected emoji: scale 1.2 + ring glow + label appears below
- "Continue →" button at bottom (gradient, full width)

STEP 3 — TIMER
- "How do you want to see your timer?" (24px bold)
- "Pick your default style — change anytime in Settings." (13px muted)
- 3 cards:
  a) ⏱️ "Countdown" / "See remaining time — classic focus timer"
  b) ⬆️ "Count-up" / "See time earned — less pressure, more flow"
  c) 🎲 "Surprise me" / "Just an arc ring — no numbers, just presence"
- Each card: icon left, text right, selectable
- "Continue →" button

STEP 4 — FOCUS STYLE
- "One last question 🧠" (24px bold)
- "Do you ever feel like tasks disappear from your mind if they're off-screen?" (15px, #E8E8F0)
- 2 cards:
  a) 🎯 "Yes — show me one thing at a time"
     "Focused mode: zero noise, just the current task."
  b) 🗺️ "No — I like seeing everything"
     "Full view: all your pools and progress at once."
- "Let's go →" button (gradient, full width, with ✨ sparkle)

TRANSITIONS:
- Steps slide left when going forward, right when going back
- Elements within each step stagger in (50ms between items)
- Button at bottom fades in last

Make it feel welcoming, low-pressure, and warm. The user should feel like the app already understands them.
```

---

## Section 8 — AddTaskModal

```
Create an Add Task modal/bottom-sheet for MindShift app.

[Paste Section 0 design system here]

MODAL: slides up from bottom, backdrop blur, rounded-t-3xl

LAYOUT:

1. HANDLE BAR (centered, 40px wide, 4px height, #252840, rounded-full)

2. HEADER
   - "Add a task" (20px bold) + X close button (top right, muted)

3. TITLE INPUT (full width)
   - Placeholder: "What's on your mind?" (muted)
   - bg #252840, border 1px solid rgba(255,255,255,0.06)
   - p-4, rounded-xl, text 15px
   - Focus state: border becomes primary

4. DIFFICULTY SELECTOR
   - Label: "How hard is this?" (13px muted)
   - 3 horizontal buttons (equal width):
     - 🟢 Easy (teal accent when selected)
     - 🟡 Medium (primary accent when selected)
     - 🟠 Hard (gold accent when selected)
   - Each shows: filled dots (1/2/3) + label
   - Selected: colored border + alpha bg

5. TIME ESTIMATE
   - Label: "Estimated time" (13px muted)
   - Row of pills: 5m | 15m | 25m | 45m | 60m | Custom
   - Selected: primary bg, white text
   - Custom: expands to number input with "min" suffix

6. DUE DATE (optional, toggleable)
   - "📅 Add due date" toggle button
   - When open: native date picker + time picker side by side
   - When date set: show pill "Due: Mar 20" (dismissible)

7. POOL INDICATOR
   - If NOW pool has room: "→ Adding to NOW" (primary text)
   - If NOW pool full: "💙 NOW is full — this will land in NEXT, ready when you are." (13px, muted)

8. SUBMIT BUTTON (full width, bottom)
   - If NOW has room: "Add to Now →" (gradient bg)
   - If NOW full: "Add to Next →" (gradient bg)
   - Disabled state: opacity 50%, no gradient
   - Loading state: "Adding…" with subtle spinner

Make the modal feel quick and lightweight. Minimal fields, maximum clarity. User should be able to add a task in 3 seconds.
```

---

## Что делать с результатом

Когда получишь код от v0:

1. **Не трогай** логику, store, Supabase — я подключу
2. **Сохрани** каждый экран как отдельный `.tsx` файл
3. **Скинь мне** файлы — я:
   - Заменю mock-данные на Zustand store
   - Подключу framer-motion (v0 может сгенерить CSS animations — я заменю)
   - Добавлю accessibility (aria-labels, focus rings, semantic HTML)
   - Подключу роутинг и навигацию
   - Протестирую через tsc + e2e
