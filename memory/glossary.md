# MindShift Glossary — Full Decoder Ring

## Component Nicknames & Shorthand
| Term | Full Name / Meaning |
|------|---------------------|
| arc | ArcTimer — SVG focus progress ring |
| bento | BentoGrid — dnd-kit home screen widget grid |
| bottom nav | BottomNav — 4-tab navigation bar (z-30) |
| cookie | CookieBanner — GDPR consent banner (z-50) |
| install banner | InstallBanner — PWA install nudge (z-40) |
| recovery | RecoveryProtocol — 72h+ absence overlay |
| context restore | ContextRestore — 30-72h absence overlay |
| AppShell | Main layout wrapper with safe-area padding |
| fab | Floating Action Button — add task, bottom-right |
| mochi | Mascot mascot component on HomeScreen |
| coach mark | CoachMark — progressive disclosure tooltip |
| energy widget | EnergyWidget (BentoGrid) |
| now widget | NowPoolWidget (BentoGrid) |
| quick focus | QuickFocusWidget — "just 5 minutes" CTA |
| audio widget | AudioWidget (BentoGrid compact) |
| progress widget | ProgressWidget (BentoGrid compact) |

## State & Store Terms
| Term | Meaning |
|------|---------|
| slice | A Zustand store section (User/Task/Session/Audio/Progress/Preferences/Grid) |
| partialize | Filter fn: which state keys survive localStorage.persist |
| nowPool | Array<Task> — max 3 active tasks |
| nextPool | Array<Task> — max 6 queued tasks |
| somedayPool | Array<Task> — collapsed archive |
| energyLevel | 1–5 scale set in onboarding/energy-check (not persisted) |
| psychotype | Derived: achiever/explorer/connector/planner |
| cognitiveMode | focused (1 task) or overview (full view) |
| appMode | minimal/habit/system — onboarding choice |
| completedTotal | Cumulative task counter — NOW persisted (was bug: not persisted before 2026-03-09) |
| xpTotal | Total XP — persisted |
| seenHints | Set<string> — which CoachMarks have been shown |
| lastSessionAt | ISO timestamp of last session — used for recovery detection |
| recoveryShown | Bool — recovery overlay shown this session (reset on sign out) |

## Task Terminology
| Term | Meaning |
|------|---------|
| park | Snooze a task: moves NOW→NEXT, snoozeCount++ |
| carry-over | Task >24h old — shows warm amber badge, no shame |
| archive | Move to SOMEDAY, status='archived' |
| overdue | Tasks in now/next that have been waiting (used in RecoveryProtocol) |
| difficulty | 1=Easy (teal), 2=Medium (indigo), 3=Hard (gold) — never red |
| estimatedMinutes | User-set duration estimate |
| pool | 'now' | 'next' | 'someday' |
| decompose | AI breaks task into 2–4 subtasks via edge function |

## Focus Session Terms
| Term | Meaning |
|------|---------|
| struggle phase | 0–7 min: large timer, indigo arc, pulsing glow |
| release phase | 7–15 min: timer shrinks, teal arc, resistance fading |
| flow phase | 15+ min: digits vanish, ambient teal arc, disableToggle=true |
| recovery lock | Mandatory 10-min rest after session |
| nature buffer | 2-min ambient audio between session end and lock |
| quick start | ?quick=1 URL param → 5-min auto-start |
| bookmark | "Park the thought" — capture idea during interrupt |
| interrupt flow | FocusScreen state machine: session→interrupt-confirm→bookmark-capture |
| arc size | ARC_SIZE = (RADIUS+STROKE+2)×2 = 204px |
| disableToggle | In flow phase: tap on ArcTimer does nothing (no time anxiety) |

## Audio Terms
| Term | Meaning |
|------|---------|
| brown | Brown noise — AudioWorklet (seam-free leaky integrator) |
| pink | Pink noise — buffer-based + LPF 285Hz |
| lofi | Lo-fi ambient — buffer-based |
| nature | Nature sounds — buffer-based |
| gamma | Binaural gamma (40Hz) — full-width card |
| sound anchor | Cmaj9 chord — audio cue for focus entry |
| crossfade | Constant power fade: sine/cos curves, 1.5s duration |
| log gain | Logarithmic: slider 0–1 → gain 0.001–0.10 |
| dBA estimate | Shown when volume >80% slider (~65 dBA) |
| AudioWorklet | Thread-safe brown noise processor (no gaps) |
| HPF | High-pass filter 60Hz — sub-bass protection on all noise |
| PINK_LPF | Pink noise LPF @ 285Hz — Research #3: HF fatigue elimination |

## Design Terms
| Term | Meaning |
|------|---------|
| calm palette | Desaturated colors in focused/calm mode via usePalette() |
| Research #8 | Palette rule: teal/indigo/gold only. Red banned (anxiety trigger) |
| touch target | Min 44×44px — WCAG 2.1 AA, iOS HIG requirement |
| safe area | env(safe-area-inset-bottom) — iPhone notch/home bar |
| pb-20 | Was AppShell main padding — insufficient on notched iPhones. Fixed 2026-03-09 |
| z-stack | BottomNav z-30 < InstallBanner z-40 < CookieBanner/RecoveryProtocol z-50 |
| BentoGrid | Home screen drag-and-drop widget grid (dnd-kit TouchSensor 150ms delay) |
| reduced motion | prefers-reduced-motion via useMotion() → shouldAnimate bool |
| VR | Variable Ratio XP schedule (slot machine dopamine) |

## Tech Terms
| Term | Meaning |
|------|---------|
| rollup stub | `node_modules/@rollup/rollup-linux-x64-gnu/index.js` — lazy-throwing stub (Windows→Linux issue) |
| platform issue | node_modules installed on Windows; Linux binaries absent. Fix: `npm install` on Linux |
| idb-keyval | IndexedDB helper used for offline persistence tier |
| offline queue | enqueue()/dequeue() pattern for offline Supabase writes |
| tsc clean | `npx tsc --noEmit` — runs without rollup, always works |
| magic link | Supabase passwordless email auth |
| consent pending | localStorage key stored before magic link redirect (GDPR consent flow) |
| edge fn | Supabase Edge Function (Deno) |
| psychotype detection | Enabled after PSYCHOTYPE_DETECTION_DAYS=7 |

## Achievements (keys)
| Key | Name | Trigger |
|-----|------|---------|
| first_seed | First Seed 🌱 | Complete first task |
| five_min_hero | 5-Minute Hero ⚡ | Start a ?quick=1 session |
| flow_rider | Flow Rider 🌊 | Complete 52-min session |
| task_sniper | Task Sniper 🎯 | Complete 10 tasks total |
| micro_master | Micro Master ✨ | Complete 50 micro-tasks |
| gentle_start | Gentle Start 💙 | Complete task at energy 1–2 |
| night_owl | Night Owl 🦉 | Complete task after 9pm |
| morning_mind | Morning Mind 🌅 | Complete task before 9am |
