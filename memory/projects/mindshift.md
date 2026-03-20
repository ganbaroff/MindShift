# MindShift — Project Status
Updated: 2026-03-20

## What it is
ADHD-aware productivity PWA. Mobile-first. Neuroscience-backed focus sessions, shame-free task management, AI companion (Mochi).

## Current state: Production-ready v1.0
- Code: complete, builds clean (`tsc -b && vite build`)
- Tests: 132+ e2e passing (Playwright), 82 unit (vitest)
- Deploy: live on Vercel, auto-deploy from `main`
- Branch: `main` @ latest (Sprint BC complete)

## What works
- Auth: magic link + Google OAuth (needs Supabase Dashboard config)
- Focus sessions: 3 timer modes (countdown/countup/surprise), 3 phases (struggle/release/flow)
- Tasks: NOW/NEXT/SOMEDAY pools, drag-to-reorder, search, recurring, voice input, notes
- Audio: 5 presets (brown/pink/nature/lofi/gamma), phase-adaptive gain
- Rituals: breathwork, shutdown (9pm+), weekly planning, monthly reflection
- Recovery: 72h+ (RecoveryProtocol), 30-72h (ContextRestore)
- Social: Focus Rooms (Supabase Realtime presence, anonymous)
- AI: Mochi companion (Gemini 2.5 Flash), task decomposition, recovery messages, weekly insights
- Gamification: XP (variable ratio), achievements (18 types), streaks (invisible until 2+)
- i18n: EN + RU foundation
- PWA: offline, installable, push-ready (client side)
- Accessibility: WCAG AA (focus rings, aria, reduced motion, no red)

## What doesn't work yet
- Stripe/payments: store has subscriptionTier, no Stripe integration
- Server-side push: SW handles push, but no VAPID keys + cron
- Google OAuth: code ready, needs Supabase Dashboard → Google provider config
- Edge functions: written, need `supabase functions list` verification
- Android/iOS native: Capacitor config ready, builds not generated
- Google Play: account verification pending

## Next steps (pre-launch)
1. Google Play account verification
2. Android AAB build (Capacitor)
3. Feature graphic 1024x500 + screenshots
4. In-App Review API after 3rd successful session
5. Humanizer copy audit pass (Sprint BD)

## Next steps (post-launch, 30 days)
1. Home screen widget (Android)
2. Picture-in-Picture for focus timer
3. 2-3 more languages (ES, DE)
4. Server-side push (VAPID + Supabase cron)
5. Stripe integration

## AI toolchain
- `.claude/rules/` — 4 rule files (guardrails, typescript, security, testing)
- `.claude/skills/humanizer/` — AI text decontamination
- `.claude/agents/` — 3 agents (code-reviewer, build-error-resolver, e2e-runner)
- `.claude/commands/` — 5 commands (/verify, /build-fix, /tdd, /e2e, /code-review)
- `.claude/contexts/` — 2 modes (dev, review)
- `.claude/hooks.json` — auto-typecheck, console.log detection, git safety
- `CLAUDE.md` — 337-line working memory (sprint history, stack, architecture, gaps)
- `memory/` — glossary, architecture, design rules, people, projects
