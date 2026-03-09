# Bolt 6.5 — ProgressScreen + Avatar Evolution

## Goal
Replace emoji avatars with SVG plant illustrations for visual evolution.
Each of 6 stages has a unique geometric SVG matching MindShift's indigo/teal design.

## Acceptance Criteria
- [x] AC1: 6 SVG avatar stages: Seedling → Sprout → Sapling → Bloom → Tree → Oak
- [x] AC2: SVGs use design tokens (#6C63FF indigo, #4ECDC4 teal, #FFE66D gold)
- [x] AC3: Idle sway animation (respects reduced-motion via useMotion)
- [x] AC4: ProgressScreen uses Avatar component instead of emoji
- [x] AC5: SettingsScreen avatar selector uses SVG avatars
- [x] AC6: Evolution hint shows next stage name

## Changes
- `src/features/progress/Avatar.tsx` — NEW: 6 SVG stages + Avatar component
- `src/features/progress/ProgressScreen.tsx` — Replaced emoji with Avatar, uses stageFromLevel
- `src/features/settings/SettingsScreen.tsx` — Avatar selector uses SVG instead of emoji

## Score: 8/10
## Notes
- SVGs are inline (no external files) for instant rendering
- Bloom and Oak stages include radial gradient glow
- Oak has tri-color gradient (indigo→teal→gold) for max achievement feel
- Avatar container 72×72px with 56px SVG inside (glassmorphic border)
