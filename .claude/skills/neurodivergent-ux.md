# Skill: neurodivergent-ux

> Read this file before designing or implementing any new screen, modal, notification,
> or interaction pattern. These guidelines apply to every pixel of MindFocus.

---

## Design Philosophy

MindFocus is not a productivity app that tolerates neurodivergent users.
It is built **from the ground up** for how neurodivergent brains actually work.

The app's visual language should feel like:
- A calm, dark workspace that doesn't demand attention
- A supportive friend who doesn't judge, just helps
- A system that disappears when not needed

---

## Progressive Disclosure

Show the minimum information needed to take the next action. Everything else is hidden
until explicitly requested.

### Levels of disclosure

| Level | What's visible | Trigger to expand |
|-------|---------------|-------------------|
| 0 — Resting | 3 top tasks, "Add thought" button | — |
| 1 — Active | All today tasks, priority badges | User scrolls |
| 2 — Detail | Full thought text, tags, due date | User taps a card |
| 3 — Edit | Full edit form | User taps "Edit" |

**Rule:** Never start a screen at level 2 or 3. Always start at the lowest useful level.

### Collapsed by default

- Long thought text: truncate at 2 lines, tap to expand
- Tags: show max 2 tags, `+3 more` chip if there are more
- Settings sections: collapsed accordion (expand on tap)
- Historical data (streaks, stats): hidden behind a "See history" link

---

## Visual Noise Reduction

Every visual element competes for attention. In a neurodivergent brain, non-essential
elements cause real cognitive load.

### Rules

- **Maximum 2 accent colors per screen** (use `C.accent` + one priority color)
- **Animations only on state changes** — never idle animations (no pulsing buttons at rest)
- **No decorative icons** without a functional purpose
- **No background patterns or textures** — flat dark surface only
- **White space is not wasted space** — use generous padding
- **One primary CTA per screen** — all other actions are secondary

### Priority badge contrast

Use the `P_COLOR` map for priority — do not invent new colors:

```jsx
<span style={{
  background: `${P_COLOR[thought.priority]}22`,
  color: P_COLOR[thought.priority],
  border: `1px solid ${P_COLOR[thought.priority]}44`,
}}>
  {thought.priority}
</span>
```

Only show priority badge when priority ≠ `"none"`. "None" tasks should have no badge —
badge absence communicates low urgency.

---

## Focus Mode Patterns

Users must be able to enter a distraction-free state for each major action.

### Brain dump (DumpScreen)

- Full-screen textarea, no side chrome
- Only the send button visible
- BottomNav hidden (or faded to 20% opacity) while typing
- No character counter, no "You've written X words" metrics

### Task review (TodayScreen)

- Cards one at a time (swipeable) as a future enhancement
- Current state: scrollable list, but keep the list short (≤ 5 items)
- Archive action is the primary swipe/button — make it satisfying (micro-animation)

### Evening review (EveningScreen)

- Single-question flow — one question at a time, animated entrance
- No back button during the flow (prevent second-guessing)
- Completion screen: warm, affirming, no metrics

---

## Concrete Action Labels

Every button label must describe the **outcome** not the **mechanism**:

```
❌ "Submit"          →  ✅ "Send to AI"
❌ "Confirm"         →  ✅ "Yes, archive it"
❌ "Save"            →  ✅ "Save preferences"
❌ "OK"              →  ✅ "Got it"
❌ "Cancel"          →  ✅ "Never mind" or "Keep editing"
❌ "Continue"        →  ✅ "Start using MindFocus →"
❌ "Delete"          →  ✅ "Remove this task"
❌ "Export"          →  ✅ "Copy as Markdown"
```

Labels should be 2–4 words. Use sentence case, not ALL CAPS. Avoid exclamation marks
(they read as pressure).

---

## Soft Nudges vs. Hard Interruptions

| Pattern | When to use | Example |
|---------|-------------|---------|
| Inline banner (dismissible) | Non-urgent suggestions | "Ready for your evening review?" |
| Toast notification (auto-dismiss) | Confirmations, successes | "Task archived ✓" |
| Modal dialog | Irreversible actions only | "Remove all tasks from today?" |
| Full-screen gate | Freemium limit reached | ProBanner (only after action blocked) |
| Push notification | User-scheduled only | Morning briefing, evening check-in |

**Never** use a modal for informational content — use an inline banner instead.
**Never** auto-play audio, haptics, or animations without user action.

---

## Colour Psychology for Neurodivergent UX

| Colour | Psychological meaning | Use for |
|--------|----------------------|---------|
| `C.accent` (purple) | Calm, creative, trustworthy | Primary CTAs, active states |
| `C.low` (green) | Safe, done, success | Completion, low priority |
| `C.med` (yellow) | Attention, warmth | Medium priority, gentle warnings |
| `C.high` (red-orange) | Urgent, danger | Critical priority, errors only |
| `C.textDim` (grey) | Neutral, background | Metadata, no-priority items |

Use red-orange (`C.high`) **sparingly** — it triggers threat-detection in many users.
Reserve it for truly critical tasks and hard errors.

---

## Accessibility Checklist

- [ ] All interactive elements have `aria-label` (icon-only buttons especially)
- [ ] `aria-current="page"` on active BottomNav tab
- [ ] `aria-invalid` on form fields with validation errors
- [ ] `role="dialog"` + `aria-modal="true"` on all sheets and modals
- [ ] Focus trapped inside modals (Tab cycles within, Escape dismisses)
- [ ] `prefers-reduced-motion` respected — all animations disabled via global CSS
- [ ] `prefers-contrast: high` respected — thicker focus outlines applied
- [ ] Screen reader: every icon rendered alone has a sibling `<span className="sr-only">`
      (or use `aria-label` on the button wrapper)
- [ ] Color is never the **only** indicator of state (use icon OR text alongside color)

---

## Language & Tone Guide

| Situation | Tone | Example |
|-----------|------|---------|
| Task completion | Warm acknowledgment | "Done. One less thing." |
| Long gap since last use | Welcoming back | "Good to see you. Your tasks are here." |
| Freemium gate | Honest, no pressure | "This is a Pro feature. Want to unlock it?" |
| Error | Matter-of-fact | "Couldn't save. Check your connection and try again." |
| AI processing | Calm progress | "Thinking…" (not "Loading your thoughts!") |
| Empty state | Inviting | "Your mind is clear. Add something when you're ready." |
| Streak milestone | Low-key | "7 days. Nice." (not "🎉 AMAZING STREAK!!!") |

Always use second person ("you", "your") not third person or passive voice.
Match the language of the current locale (EN/RU/AZ) exactly — never mix.
