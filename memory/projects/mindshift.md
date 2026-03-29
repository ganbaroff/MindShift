# MindShift — Project Status
Updated: 2026-03-29

## What it is
ADHD-aware productivity PWA. Mobile-first. Neuroscience-backed focus sessions, shame-free task management, AI companion (Mochi). Part of the VOLAURA ecosystem (bridge shipped Sprint CF).

## Current state: Feature-complete pre-launch v1.1
- Code: complete, builds clean (`tsc -b && vite build`)
- Tests: 192/192 E2E passing (Playwright), `tsc -b` clean
- Deploy: live on Vercel, auto-deploy from `main`
- Branch: `main` @ latest (Sprint CF + fixes complete)

## What works
- Auth: magic link + Google OAuth (needs Supabase Dashboard config)
- **Today view** (`/today`): Smart Daily View — adapts to time of day + energy, reduces decision fatigue, is default route
- Focus sessions: 3 timer modes (countdown/countup/surprise), 3 phases (struggle/release/flow)
- Tasks: NOW/NEXT/SOMEDAY pools, drag-to-reorder, search, recurring, voice input, notes
- Audio: 5 presets (brown/pink/nature/lofi/gamma), phase-adaptive gain
- Rituals: breathwork, shutdown (9pm+), weekly planning, monthly reflection
- Recovery: 72h+ (RecoveryProtocol), 30-72h (ContextRestore)
- Social: Focus Rooms (Supabase Realtime presence, anonymous)
- **MochiChat**: Interactive AI chat bottom-sheet, session-only history, crisis detection, max 20 msg
- **First-Focus Tutorial**: 4-step guided overlay for new users (Sprint CD)
- **Google Calendar sync**: OAuth + gcal-store-token/gcal-sync edge functions
- **Telegram integration**: telegram-webhook edge function + link code in store
- **VOLAURA bridge**: Fires character events (session_complete, task_done, streak) to VOLAURA API
- **Server-side push**: scheduled-push edge function + migrations (requires pg_cron activation)
- AI: Mochi companion (Gemini 2.5 Flash), task decomposition, recovery messages, weekly insights
- Gamification: XP (variable ratio), achievements (18 types), streaks (invisible until 2+)
- i18n: EN + RU + AZ + TR + DE + ES (6 locales, Mochi messages fully translated)
- PWA: offline, installable, push-ready (server-side needs CEO activation)
- Accessibility: WCAG AA (focus rings, aria, reduced motion, no red)

## What doesn't work yet
- Stripe/payments: store has subscriptionTier, no Stripe integration
- Server-side push: code shipped (Sprint CE), needs CEO: pg_cron activation + VAPID keys
- Google OAuth: code ready, needs Supabase Dashboard → Google provider config
- Google Calendar: code ready, needs user to connect in Settings
- Android AAB build: Capacitor config ready, builds not generated

## Technical debt (non-blocking)
- `SettingsPage.tsx` at 868 lines (2× guardrail) — decompose into sections
- `useFocusSession.ts` at 627 lines (1.5× guardrail) — extract useSessionTimer + useSessionPhase
- `useAudioEngine.ts` at 522 lines (over guardrail) — acceptable for audio complexity
- Several page files 465-497 lines (slightly over) — monitor

## Next steps (CEO actions required)
1. Supabase Dashboard → Authentication → Providers → Google (enable + set Client ID/Secret)
2. Supabase Dashboard → Extensions → enable `pg_cron`
3. `supabase db push` for migrations 010 + 011 (push subscriptions + cron)
4. Set VAPID keys in edge function env vars
5. Google Play: Feature graphic 1024x500 + 8 phone screenshots

## Next steps (technical)
1. Decompose SettingsPage.tsx (868 → ~400 lines)
2. Decompose useFocusSession.ts (627 → ~350 lines)
3. Stripe integration (Sprint CG — when ready)

## VOLAURA Ecosystem
- Bridge: `src/shared/hooks/useVOLAURABridge.ts` — fires events on session/task/streak
- Env vars: `VITE_VOLAURA_API_URL` + `VITE_VOLAURA_ANON_KEY`
- In-App Review: triggers after 3rd successful session (not in low energy mode)

## AI toolchain
- `.claude/rules/` — 4 rule files (guardrails, typescript, security, testing)
- `.claude/skills/humanizer/` — AI text decontamination
- `.claude/agents/` — 3 agents (code-reviewer, build-error-resolver, e2e-runner)
- `.claude/commands/` — 5 commands (/verify, /build-fix, /tdd, /e2e, /code-review)
- `.claude/contexts/` — 2 modes (dev, review)
- `.claude/hooks.json` — auto-typecheck, console.log detection, git safety
- `CLAUDE.md` — full working memory (sprint history, stack, architecture, gaps)
- `memory/` — glossary, architecture, design rules, people, projects, mistakes, patterns
- `docs/` — SHIPPED.md, DECISIONS.md, EXECUTION-PLAN.md, ADRs
