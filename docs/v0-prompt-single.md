# v0 Prompt — MindShift Full App (Single Prompt)

> Скопируй всё ниже и вставь в v0.dev одним промптом.

---

Build a complete multi-page mobile PWA called **MindShift** — an ADHD-friendly productivity app. React + Tailwind. Use `useState` for local state and mock data for now (no backend).

Create a tabbed app with bottom navigation and these pages: Home, Tasks, Focus, Progress, Settings, and an Onboarding flow.

---

## DESIGN SYSTEM (apply everywhere)

**CRITICAL: NEVER use red anywhere. Not for errors, warnings, or destructive actions. Use gold (#F59E0B) for warnings. This is an ADHD-safe app.**

Dark theme only. Background: `#0F1120`. Font: Inter (Google Fonts).

Colors:
- Primary: `#7B72FF` (indigo — CTAs, accents, selected states)
- Teal: `#4ECDC4` (success, easy tasks, positive states)
- Gold: `#F59E0B` (warnings, hard tasks, carry-over badges)
- Purple: `#A78BFA` (hard task accent)
- Card bg: `#1E2136`
- Raised bg: `#252840`
- Text: `#E8E8F0`
- Text muted: `#8B8BA7`
- Border: `rgba(255,255,255,0.06)`
- Primary 15%: `rgba(123,114,255,0.15)`
- Glass: `rgba(23,26,43,0.95)` + `backdrop-blur-xl`

Typography: 11px captions, 13px secondary, 15px body, 17px subheadings (semibold), 20px titles (bold), 24px screen titles (bold), 30px hero numbers.

Spacing: 4px grid. Cards `p-4`. Screen `px-5`. Sections `gap-6`. Cards `rounded-2xl`. Buttons `rounded-xl`. Pills `rounded-full`.

All buttons: min-height 44px. Primary buttons: `linear-gradient(135deg, #7B72FF, #8B7FF7)`, white text, `shadow-[0_8px_32px_rgba(123,114,255,0.3)]`.

Chips selected: `bg-[rgba(123,114,255,0.15)] border-[1.5px] border-[#7B72FF] text-[#7B72FF]`.
Chips unselected: `bg-[#252840] border border-[rgba(255,255,255,0.06)] text-[#8B8BA7]`.

Use framer-motion: cards fade-in + slide-up, staggered 50ms. Page transitions: slide horizontal. Buttons: `whileTap={{ scale: 0.97 }}`.

---

## BOTTOM NAV (every page except Onboarding and active Focus session)

Fixed bottom. Glass background `rgba(23,26,43,0.95)` + `backdrop-blur-xl`. Border-top `1px solid rgba(123,114,255,0.15)`. Safe-area padding bottom.

5 tabs: 🏠 Home | ✅ Tasks | ⏱ Focus | 📊 Progress | ⚙️ Settings

Active tab: primary color + subtle `bg-[rgba(123,114,255,0.12)]` pill behind icon. Inactive: `#8B8BA7`. Icons: 20px. Labels: 11px.

---

## ADD TASK FAB (on Home and Tasks pages)

Fixed `bottom-24`, centered. Pill shape: Plus icon + "Add task" text, gradient bg, white text, prominent shadow. Opens the Add Task modal.

---

## PAGE 1: HOME

Top to bottom:

**Header** — `pt-10`. Left: "Good evening 🌙" (24px bold) + subtitle "One task at a time. What matters most?" (13px muted). Right: circular mascot "Mochi" (48px, teal-blue gradient blob with 2 dot eyes and a smile).

**Welcome Card** (dismissible) — glowing border `rgba(123,114,255,0.25)`. "👋 Welcome to MindShift". 3 selectable mode cards inside:
- 🎯 "One thing at a time" / "Just need to focus on one task right now"
- 🌱 "Build daily habits" / "Consistency without overwhelm"
- 🗂️ "Manage everything" / "Full visibility over my projects"
Selected: primary border + alpha bg. "Skip for now" at bottom.

**Energy Check-in** — "How's your energy right now?" + 5 emoji buttons (48px): 😴 Drained | 😌 Low | 🙂 Okay | 😄 Good | ⚡ Wired. Labels below (11px muted).

**NOW Pool** — Header: "NOW" (11px uppercase tracking-widest, primary) + "2/3". Show 2 TaskCards.

**Up Next Preview** — Card: "📋 Up next · 3 tasks queued". First 2 task titles (one-line each, muted). "See all →" link (primary).

**Bento Grid** (2 cols, gap-3) — 4 widget cards:
- "✅ 47 done · ⏱ 12.5h · ⚡ 2,340 XP"
- Energy: big emoji + "Tap to update"
- "🔥 5 day streak"
- Burnout gauge: arc 0-100, score "34" (teal = healthy)

---

## TASK CARD COMPONENT (reuse on Home and Tasks)

Card bg `#1E2136`. Left border 3px solid: teal (easy), `#7B72FF` (medium), `#F59E0B` (hard).

Row 1: 3 difficulty dots + "Easy" badge (11px, teal pill) + "~15m" (muted). Optional: "💡" idea badge or "🔔" reminder badge. Optional: amber "carry-over" pill for tasks >24h old.

Row 2: Task title (15px semibold, max 2 lines).

Row 3: "✓ Done" button (teal outlined, 36px) + "Park it →" button (dark bg, muted).

Show variety: one easy task, one medium, one hard with carry-over badge.

---

## PAGE 2: TASKS

**Header** — "Your Tasks" (24px bold) + "5 tasks in play" (13px muted).

**NOW section** — "NOW" label (primary) + "2/3" counter. 2 TaskCards.

**Energy hint** (when energy low) — teal-tinted card: "🌱 Low energy day? Start with an easy one — momentum builds from small wins."

**NEXT section** — "NEXT" (muted) + "3/6". 3 TaskCards.

**SOMEDAY** (collapsible, collapsed) — "SOMEDAY" + chevron + "2 tasks" badge.

**Done recently** (collapsible, collapsed) — "✓ Done recently" (teal) + count badge. Each row: ✓ icon + strikethrough title + difficulty badge + "today"/"2d ago".

---

## PAGE 3: FOCUS (setup state)

**Header** — "Focus Session ⏱️" (24px bold) + "Energy: Good 😄" (teal).

**Bookmark** (optional card) — "📌 PICK UP WHERE YOU LEFT OFF" + task title. "Continue →" + "Dismiss".

**Task picker** — "TASK (OPTIONAL)". Options: "🧠 Open focus — no specific task" (default selected) + 3 tasks from pools with NOW/NEXT badges.

**Duration** — "DURATION (smart: 25m ⭐)". Pill row: 5 | 15 | **25⭐** | 45 | 60 | ✎. Selected = gradient.

**Start button** — Full width: "Start Focus →", 52px, gradient, big shadow.

## FOCUS (active session state — separate view, no bottom nav)

Immersive full-screen. Dark bg `#0F1120`.

Center: large SVG circle timer (280px). Thick arc (8px stroke), bg track `rgba(255,255,255,0.06)`. Progress color: `#7B72FF` (struggle) → `#4ECDC4` (release/flow). Center: "14:32" (30px bold). Subtle pulsing glow.

Phase label above timer: "Release" (teal, 13px).

Task title below: "Review project proposal" (15px muted, centered).

Mochi bubble (small, bottom-right): "You're in the zone! 🌊" (13px).

Controls (bottom): 3 circular buttons (48px) — 🔊 Audio | ⏹ End | 💭 Park thought. Gap-8.

---

## PAGE 4: PROGRESS

**Header** — "Your Progress 🌱" (24px bold) + "Every step counts, no matter how small." (muted).

**XP Card** — Avatar (64px, gradient border) + "Level 7 — Steadfast" + "2,340 XP" + progress bar (gradient fill) + "1,340/2,000 XP to Level 8".

**Weekly bars** — "THIS WEEK" + "Great week 💪". 7 vertical bars (Mon-Sun), gradient fill (primary→teal), height = minutes. "5 of 7 days · 185m focus".

**Stats grid** (3 cols) — "12 🏆" Achievements | "47 ✅" Tasks Done | "23 📅" Active Days.

**Energy trends** — "ENERGY AFTER SESSIONS" (teal). Row of 10 emojis: 😌🙂😄🙂😄😄⚡😄🙂😄. "↑ Trending up" (teal).

**AI Insights** — "✨ WEEKLY INSIGHT" (gold). 3 cards: "🧠 Peak focus: 2-4pm" / "💡 Try 15-min sessions on low days" / "🎯 You finish 73% of tasks".

**Achievements** (3-col grid) — 6 items: emoji + name. Unlocked: full color. Locked: grayscale, opacity 40%.

---

## PAGE 5: SETTINGS

**Header** — "Settings" (24px bold) + email (muted).

Sections (each in cards):

1. 🌱 "MindShift Free"
2. **App Mode** — 3 chips: 🎯 Minimal / 🌱 Habit / 🗂️ System. Descriptions below each.
3. **Timer** — 3 chips: ⏱ Countdown / ⬆️ Count-up / 🎲 Surprise. Helper text.
4. **Energy** — 5 emoji buttons (48px): 😴😌🙂😄⚡ with labels.
5. **Phase** — 2×2 grid: 🚀 Launch ("up to 5 NOW") / 🌱 Maintain ("3 NOW") / 🛋️ Recover ("max 2 NOW") / 🧪 Sandbox ("no limits").
6. **Rest Mode** — Toggle: "🛋️ Pause for 24h".
7. **Accessibility** — Toggle: "Reduced stimulation".
8. **Your Data** — "📦 Export (JSON)" teal button + "Delete account" gold text (NOT red).
9. **Sign out** — amber text `#E8976B`.
10. Footer: "Privacy · Terms · Cookies" + "MindShift v1.0 — Built with 💜 for ADHD minds".

---

## ONBOARDING FLOW (4 steps, full screen, no bottom nav)

Shared: progress bar (4 segments, filled = primary gradient) + "Step N of 4" + back button (steps 2-4).

**Step 1 — Intent:** "What brings you here today?" 3 large cards: 🎯 One thing / 🌱 Daily habits / 🗂️ Full picture. Each with description. Slide transition.

**Step 2 — Energy:** "How's your brain right now?" 5 big emoji buttons (56px): 😴😌🙂😄⚡. Selected: scale 1.2 + glow ring. "Continue →".

**Step 3 — Timer:** "How do you want to see your timer?" 3 cards: ⏱ Countdown / ⬆️ Count-up / 🎲 Surprise. Each with description. "Continue →".

**Step 4 — Style:** "One last question 🧠" + "Do tasks disappear from your mind when off-screen?" 2 cards: 🎯 "Yes — one at a time" / 🗺️ "No — show everything". "Let's go ✨" gradient button.

---

## ADD TASK MODAL (bottom sheet, triggered by FAB)

Slides up from bottom. Handle bar + "Add a task" header + X close.

Fields:
1. Title input: placeholder "What's on your mind?", bg `#252840`, focus = primary border.
2. Difficulty: 3 buttons — Easy (teal) / Medium (primary) / Hard (gold). Dots + label.
3. Time: pills 5m|15m|25m|45m|60m|Custom.
4. Due date: "📅 Add due date" toggle → date + time pickers.
5. Pool indicator: "→ Adding to NOW" or "💙 NOW is full — landing in NEXT".
6. Submit: "Add to Now →" or "Add to Next →" gradient button.

---

Make every screen feel calm, spacious, and non-overwhelming. Generous whitespace. No visual clutter. The app should feel like a gentle companion, not a demanding manager. Every color choice, every word, every spacing decision should reduce cognitive load for someone with ADHD.
