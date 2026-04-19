# HANDOFF REV2 — Design-Atlas → Terminal-Atlas

**Author:** Design-Atlas
**For:** Terminal-Atlas (Claude Code CLI)
**CEO:** Yusif Ganbarov
**Date:** 2026-04-19
**Repo:** MindShift (release/mindshift-v1.0)
**Context envelope:** authority delegated by CEO; no per-decision approval needed while within Constitution + Manifesto.

---

## HOW TO USE THIS PACKET

Three independent tracks. Ship in any order, separate PRs, no cross-blocking.

- **T1 — LAUNCH HYGIENE** (closes Play Store readiness — 1-2 h) — **ALREADY SHIPPED as PR #14, merge SHA a4b7be6 on release/mindshift-v1.0. Skip.**
- **T2 — EGAP-1 FOUNDATION** (data-face context — 1-2 h)
- **T3 — CROSS-FACE MOMENT** (MindShift → Atlas → VOLAURA live trigger — 3-4 h)

Target branch: `release/mindshift-v1.0`.

---

## T1 — LAUNCH HYGIENE: em-dash placeholder for empty Burnout stat

**STATUS: ALREADY SHIPPED.** Terminal-Atlas executed this before this packet arrived. PR #14 merged squash into `release/mindshift-v1.0` with merge SHA `a4b7be6048564614190250142d65a7bc2556f643`. Scope delivered:

- `src/features/progress/StatsGrid.tsx` — renders em-dash (U+2014) via `formatBurnoutCell` helper when `burnoutScore` is not a finite number.
- `src/shared/lib/burnout.ts` — new pure function `formatBurnoutCell(score: unknown): { value, a11yKey, isEmpty }` + `EMPTY_BURNOUT_GLYPH` constant.
- 6 locales got `progress.burnoutScoreEmptyA11y`: en, ru, az, de, es, tr (extended beyond the 3 specified in the original spec to avoid untranslated fallbacks).
- 15 new unit tests on `formatBurnoutCell` + i18n coverage.
- E2E updated: 3-col invariant, never-NaN invariant, finite-integer-or-em-dash path.

No further action on T1.

---

## T2 — EGAP-1 FOUNDATION: data-face context

### Context

The Atlas Ecosystem Design Manifesto (`VOLAURA/docs/design/DESIGN-MANIFESTO.md`, v2026-04-16) defines Law 7: **One Body, N Faces.** Every face (MindShift, VOLAURA, Life Sim, BrandedBy, ZEUS, future faces) inherits skeleton tokens from a shared design system but expresses itself via one Tier-3 accent token — and every accent-aware component must re-theme when the user switches faces.

Current gap (EGAP-1, `MANIFESTO-GAP-ANALYSIS.md`): no `data-face` attribute anywhere in MindShift. Grep-verified: zero matches for `data-face|dataFace|FaceContext` in `mindshift/src`. Without this, MindShift's accent (`#7B72FF`) is hardwired — blocks every future ecosystem-level UI including the T3 cross-face moment scaling pattern.

MindShift ships v1.0 as a single-face app, but we set the foundation now so face #2 (VOLAURA is the natural first peer, Life Sim after Godot init-crash fix) plugs in without a redesign.

### Implementation

**Step 1: Attribute on `<html>`**

File: `src/app/App.tsx`.

You already have the `data-mode` pattern (~line 107-112, `reducedStimulation ? 'calm' : 'normal'`). Mirror it exactly for `data-face`:

```ts
useEffect(() => {
  document.documentElement.setAttribute('data-face', 'mindshift')
}, [])
```

Hardcoded literal `'mindshift'` for v1.0. When face #2 ships, becomes reactive. Not solving that today.

**Step 2: Tier-3 accent token per face**

File: `src/index.css`.

Inside the existing `:root` block, after `--color-primary: #7B72FF;`, add:

```css
/* -- Tier-3 face accent (EGAP-1 foundation) ------------------ */
/* One token. Changes when data-face changes. Everything else
   inherited. See DESIGN-MANIFESTO.md Law 7 Inheritance Contract. */
--color-face-accent: var(--color-primary);
```

Then per-face scopes (outside `:root`):

```css
[data-face="mindshift"] {
  --color-face-accent: #7B72FF;
}

/* Stubs — future-proof. Inert until each face ships. */
[data-face="volaura"]  { --color-face-accent: #6C63FF; }
[data-face="lifesim"]  { --color-face-accent: #F59E0B; }
```

Values lifted from `VOLAURA/docs/design/BRAND-IDENTITY.md §3`.

**Step 3: Thread the accent through BottomNav only**

File: `src/app/BottomNav.tsx`.

Currently line ~59: `background: \`${palette.primary}1E\`` — hardcoded to hook's primary. Change to the new token:

```ts
background: 'color-mix(in oklab, var(--color-face-accent) 12%, transparent)',
boxShadow: palette.glowAlpha > 0
  ? '0 0 12px color-mix(in oklab, var(--color-face-accent) 15%, transparent)'
  : 'none',
```

`color-mix` support: Chrome 111+, Safari 16.4+, Firefox 113+. MindShift is modern-Android PWA — fine.

**Scope discipline:** T2 is foundation-only. One attribute, one token, one consumer (BottomNav). Do not refactor other components to use `--color-face-accent` in this PR. Law 7 says we build the contract; we don't rebuild the UI yet.

### Tests

- Playwright/e2e: assert `<html data-face="mindshift">` on `/today` route.
- Visual: BottomNav active pill identical pre/post (color-mix of same hex = same color).

### PR

- Title: `feat(design): data-face context + Tier-3 accent token (EGAP-1 foundation)`
- Base: `release/mindshift-v1.0`
- Body: Link to Manifesto EGAP-1 line + "Enables future face additions without UI rewrite."

---

## T3 — CROSS-FACE MOMENT: focus session → Atlas → AURA toast

### Context

Manifesto Principle 4: **Cross-Face Moments Are First-Class.** EGAP-5 gap: "Zero cross-face moments exist in the UI."

v0Laura vision frame (corrected per Terminal session 121 context pack): Atlas is the nervous system. MindShift face does not "send to VOLAURA face" — MindShift face triggers Atlas; Atlas writes `character_events`; VOLAURA face reads from Atlas's bus. Atlas is never the subject of user-visible copy; Atlas is always the connective tissue.

Backend pipe is live. `src/shared/lib/volaura-bridge.ts::sendCrystalEarned` is already called from `src/features/focus/useFocusSession.ts` after every successful focus session. What's missing: feedback loop to the user that their focus changed something elsewhere in the ecosystem.

This is the single highest-impact ecosystem moment we can ship without touching VOLAURA UI. It proves MindShift is not a standalone Pomodoro app — without saying "Atlas" once.

### Implementation

**Step 1: Wire a toast in `useFocusSession`**

File: `src/features/focus/useFocusSession.ts`.

Find the call site of `sendCrystalEarned`. After the Promise resolves — if `true` AND `crystals > 0` — fire a sonner toast:

```ts
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

// ... inside the session-end handler, after sendCrystalEarned resolves:
const ok = await sendCrystalEarned(token, crystals, 'focus_session')
if (ok && crystals > 0) {
  toast.success(t('focus.crystalsEarnedHeadline', { count: crystals }), {
    description: t('focus.crystalsEarnedDesc'),
    action: {
      label: t('focus.crystalsEarnedCta'),
      onClick: () => {
        window.open('https://volaura.app/aura', '_blank', 'noopener')
      },
    },
    duration: 5000,
  })
}
```

Toast chrome already styled globally in `App.tsx` — no design work on the container.

**Step 2: Copy (Atlas-invisible per v0Laura vision)**

Atlas is NOT the subject. Copy talks about the user's character gaining energy. VOLAURA is named as destination (user brand-recognizable). Atlas is felt, not named.

Add to locale files:

- **en:**
  - `focus.crystalsEarnedHeadline`: `"+{{count}} crystals charged your AURA"`
  - `focus.crystalsEarnedDesc`: `"Your focus session strengthened your character in VOLAURA."`
  - `focus.crystalsEarnedCta`: `"See your character"`
- **az:**
  - `focus.crystalsEarnedHeadline`: `"+{{count}} kristal AURA-nı yüklədi"`
  - `focus.crystalsEarnedDesc`: `"Fokus sessiyan VOLAURA-dakı xarakterini gücləndirdi."`
  - `focus.crystalsEarnedCta`: `"Xarakterinə bax"`
- **ru:**
  - `focus.crystalsEarnedHeadline`: `"+{{count}} кристаллов зарядили твою AURA"`
  - `focus.crystalsEarnedDesc`: `"Фокус-сессия усилила твоего персонажа в VOLAURA."`
  - `focus.crystalsEarnedCta`: `"Увидеть персонажа"`
- Other locales: en-fallback. Don't block on translation.

**Step 3: Dual-accent toast (Manifesto Principle 4)**

Cross-face moments must show source + destination accent. Single-use override:

```ts
style: {
  background: 'linear-gradient(90deg, rgba(123,114,255,0.15), rgba(108,99,255,0.15))',
  borderLeft: '3px solid var(--color-face-accent)',  // current face (mindshift)
  borderRight: '3px solid #6C63FF',                   // destination (volaura)
}
```

Borders are small but intentional — only cross-face moment in v1.0, earning its Principle 4 keep.

**Step 4: Guards**

- `isVolauraConfigured()` check already inside `sendCrystalEarned` — if false, no event, no toast.
- Guest users (`userId.startsWith('guest_')`) — no token, `sendCrystalEarned` is no-op. Good.
- Offline: `sendCrystalEarned` returns `false` on fetch fail → no toast. Correct (don't lie about a crystal not yet synced).
- Only on `source === 'focus_session'`. Do NOT fire on `task_bonus` or `streak_bonus` — lowest surprise, highest earned moment for v1.0.

### Tests

- Unit: mock `sendCrystalEarned` → assert toast fires on (`true`, `crystals>0`), silent on (`false`, _) or (_, `0`).
- Integration (if rig available): complete a fake session, assert toast DOM.

### PR

- Title: `feat(focus): surface AURA crystal charge as toast (EGAP-5 first cross-face moment)`
- Base: `release/mindshift-v1.0`
- Body: Link to Manifesto Principle 4 + EGAP-5 + "First live cross-face moment. Atlas-invisible per v0Laura vision (Atlas felt, not named in copy)."

---

## OUT OF SCOPE FOR THIS PACKET

Documented here so they don't get drift-added. Create `memory/handoffs/backlog-phase1.md` with these if not already present:

- Emoji tier badges (🥇🥈🥉💎) in `VolauraAuraBadges.tsx` → inline SVG (Manifesto Law 6 craft).
- Full Phase-3 polish (typography scale tokens, skeleton-over-spinner sweep).
- Agent character UI (EGAP-3) — 13 swarm perspectives visual presence.
- Tab bar face-switch animation (EGAP-4) — waits for face #2 render.
- Additional cross-face moments (task_done → skill credit toast, streak → buff toast).
- MindShift → Life Sim cross-face moment → blocked until Godot VolauraAPIClient init-crash fix lands.

---

## REPORTING BACK

As each track ships:

- Reply through CEO-courier: `T<n> merged — PR <url> — SHA <sha>`.
- Don't batch. Incremental is fine.

After all three merged:

- One line: `REV2 complete. Ready for recapture packet.`
- Design-Atlas then delivers recapture packet (8 screenshots + feature-graphic touch-up, already drafted).

— Design-Atlas
