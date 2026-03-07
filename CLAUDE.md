# MindFocus — Claude Code Intelligence File

## What is MindFocus

**MindFocus** is an ADHD-friendly AI productivity assistant built as a React PWA.
Core loop: **Brain Dump → AI Parse → Daily Focus → Evening Review.**
The app reduces cognitive overhead, shame-loops, and decision fatigue for neurodivergent users.

**Stack:** React 18, Vite, Supabase (auth + Postgres + Realtime), Anthropic Claude API
**Deployment:** Vercel + PWA (installable, partial offline)
**Languages:** EN / RU / AZ
**Monetisation:** Freemium — Free tier + Pro ($8/mo, waitlist)
**Entry point:** `src/mindflow.jsx` (App orchestrator, ~500 lines)

---

## Architecture

```
src/
├── mindflow.jsx              ← App root: state, routing, orchestration only
├── skeleton/                 ← Human-owned structural shell (ADR required to change)
│   ├── ErrorBoundary.jsx
│   ├── BottomNav.jsx
│   └── design-system/
│       ├── tokens.js         ← C object: all colors, spacing, radii
│       └── global.css.js     ← Injected <style> tag, references tokens
├── shared/                   ← Cross-feature utilities, pure and side-effect-free
│   ├── lib/                  ← Pure functions: date, id, streak, freemium, persona,
│   │                            export, greeting, notifications, logger, thought-types
│   ├── services/             ← Stateful I/O: supabase.js, claude.js
│   ├── ui/                   ← Shared React components: icons, primitives, ThoughtCard, ProBanner
│   └── i18n/                 ← translations.js (T object, LANGS array)
└── features/                 ← Vertical slices — bolt execution area
    ├── dump/                 ← Brain dump: VoiceBtn, DumpScreen, dump.api.js
    ├── today/                ← Daily focus: TodayScreen
    ├── evening/              ← Evening review: EveningScreen
    ├── settings/             ← Settings + panels: SettingsScreen, ExportPanel, NotifPanel, NotionPanel
    ├── auth/                 ← Auth: AuthScreen (magic link OTP)
    └── onboarding/           ← LangPickScreen, WelcomeScreen

docs/
└── bolts/                    ← Bolt execution logs (one .md per bolt)
    └── adr/                  ← Architecture Decision Records

.claude/
├── skills/                   ← 31 skill files — see "Skills — когда использовать" below
│   ├── [9 custom MindFocus skills]
│   └── [22 external marketplace skills]
└── worktrees/                ← Active Claude worktrees
```

---

## Core Principles

### 1. Vertical Slices (`features/*`)
Every new screen, flow, or AI feature lives in its own `features/<name>/` directory.
Each slice owns: `index.jsx`, optionally `<name>.api.js`, `spec.md`, `README.md`.
Features may import from `shared/` and `skeleton/design-system/tokens.js`.
**Features never import from each other.**

### 2. Skeleton = Human-Owned Shell
`skeleton/` contains the structural boundaries of the app shell:
`ErrorBoundary`, `BottomNav`, global CSS, design tokens.
**Rule:** Never modify `skeleton/` without an ADR and a dedicated bolt.
The skeleton is the contract between humans and AI; bolts work _inside_ features.

### 3. Shared = Truly Cross-Cutting
`shared/lib/` — pure functions, no React, no side effects.
`shared/services/` — I/O-stateful (Supabase, Claude API). One file per service.
`shared/ui/` — reusable React components used by ≥ 2 features.
**Rule:** Do not put feature-specific logic in `shared/`. If it's only used in one feature, it belongs in `features/<name>/`.

### 4. Bolt-Based Workflow
All non-trivial changes are executed as **bolts**:
1. **Spec** — define goal, acceptance criteria, constraints
2. **Read skills** — pick relevant `.claude/skills/*.md` before writing code
3. **Code** — implement in `features/` or `shared/`, never `skeleton/` without ADR
4. **Build** — `npm run build` must pass, 0 errors
5. **Bolt log** — write `docs/bolts/YYYY-MM-DD-bolt-N-name.md`
6. **ADR** — if an architectural decision was made, write `docs/bolts/adr/`

### 5. INVARIANT 7 — No Silent Failures
Every async operation must use `logError(context, error, meta?)` from `shared/lib/logger.js`.
Context format: `"FeatureName.handlerName"` (dot-path string).
Never swallow errors silently.

---

## Before any bolt

1. Прочитай CLAUDE.md (этот файл)
2. Выбери релевантные скиллы из таблицы ниже
3. Прочитай выбранные скиллы
4. Предложи план в bullet-points → жди подтверждения перед кодом
5. Делай только запрошенные изменения — никаких unrequested refactors
6. Все user-visible строки: RU + EN (i18n ready)
7. После кода: пройди `obra-verification-before-completion`
8. Финальный commit: обнови bolt-log + ADR если нужно

**Skills are constraints, not suggestions.** If a skill says "never do X", that's a hard rule for this codebase.

---

## Skills — когда использовать

### 🧠 ADHD / Продукт (наши, кастомные)

| Скилл | Использовать при |
|---|---|
| `adhd-aware-planning` | Любой экран планирования, dump, today, напоминания, ритуалы, монетизация |
| `neurodivergent-ux` | Любой UI компонент, анимации, цвета, тексты интерфейса |

### 🏗️ Архитектура / Код

| Скилл | Использовать при |
|---|---|
| `project-architecture` | Новые фичи, структура папок, ADR |
| `frontend-architecture-react-vite` | Компоненты, хуки, роутинг, vertical slices |
| `design-system-and-tokens` | Цвета, spacing, типографика, анимации |
| `ai-client-and-prompts` | Вызовы Claude API, промпты, defensive parsing |

### 🗄️ База данных

| Скилл | Использовать при |
|---|---|
| `supabase-data-layer` | Запросы к БД, миграции, RLS (наш кастомный) |
| `terminalskills-skills-supabase` | Расширенные Supabase операции, pgvector |
| `openclaw-skills-supabase` | SQL queries, storage, similarity search |

### 🎨 UI / Дизайн / Анимации

| Скилл | Использовать при |
|---|---|
| `alexsnchz-skills-wcag-design` | Новый компонент — обязательный WCAG 2.2 AA аудит |
| `medy-gribkov-arcana-accessibility-wcag` | Pre-launch аудит, CI accessibility gate |
| `secondsky-claude-skills-motion` | Framer Motion: drag, scroll, spring, exit анимации |
| `julianromli-ai-skills-frontend-ui-animator` | Hover, micro-interactions, page transitions |

### 🧪 Тестирование

| Скилл | Использовать при |
|---|---|
| `testing-and-self-review` | Финальный чек перед commit (наш кастомный) |
| `obra-test-driven-development` | Написание любой логики — сначала тест |
| `majesticlabs-dev-majestic-marketplace-react-testing` | Unit тесты React компонентов |
| `terminalskills-skills-testing-library` | Accessible queries, user events |
| `kalibellion-qaskills-vitest` | Vitest конфиг, coverage |
| `pramoddutta-qaskills-playwright-e2e` | E2E user flows, CI пайплайн |
| `artofrawr-claude-control-code-review` | Code review перед каждым PR |

### 🌐 PWA / i18n

| Скилл | Использовать при |
|---|---|
| `agents-inc-skills-web-pwa-offline-first` | Offline sync, service workers, IndexedDB |
| `travisjneuman-.claude-pwa-development` | PWA manifest, install prompts |
| `agent-skills-hub-agent-skills-hub-i18n-localization` | Добавление нового языка, RTL |
| `daymade-claude-code-skills-i18n-expert` | Автоматизация i18n, JSON locale |

### 🔒 Безопасность / DevOps

| Скилл | Использовать при |
|---|---|
| `codelably-harmony-claude-code-security-review` | Auth, secrets, API endpoints, payment |
| `devops-and-deploy` | Сборка, Vercel, PWA, CI (наш кастомный) |

### 🔧 Debugging / Workflow

| Скилл | Использовать при |
|---|---|
| `obra-systematic-debugging` | Сложный баг, непонятное поведение |
| `obra-root-cause-tracing` | Рекуррентная проблема, найти корень |
| `obra-verification-before-completion` | Перед любым финальным commit |

---

## Freemium Rules

| Feature | Free | Pro ($8/mo) |
|---------|------|-------------|
| AI dumps/month | 30 | Unlimited |
| Thoughts stored | 50 | Unlimited |
| Export | — | CSV / JSON |
| Personas | 1 | Multiple |

Gate UI with `<ProBanner>` component. Never block navigation — only block the specific action.
Check limits via `isProUser(user, subscription)` from `shared/lib/freemium.js`.

---

## Commands

```bash
npm run dev      # Start dev server (Vite, port 5173)
npm run build    # Production build — must pass before any commit
npm run preview  # Preview production build
```

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `src/skeleton/design-system/tokens.js` | All design tokens (C object) |
| `src/shared/lib/persona.js` | `updatePersona()` — pure persona data logic |
| `src/shared/services/claude.js` | All AI calls — `parseDump`, `generateEveningReview`, `aiFocusSuggest`, `buildPersonaContext` |
| `src/shared/services/supabase.js` | All DB calls — `sbPushThought`, `sbPullThoughts`, `sbSavePersona`, etc. |
| `src/shared/lib/logger.js` | `logError(context, error, meta?)` — INVARIANT 7 |
| `src/shared/lib/freemium.js` | `FREE_LIMITS`, `getDumpCount`, `isProUser` |
| `src/shared/i18n/translations.js` | `T` (translations), `LANGS` (language list) |

---

## Active Skills

### UI/UX Pro Max — Design Intelligence
> `.claude/skills/ui-ux-pro-max/SKILL.md`

Design styles for MindFocus: **Glassmorphism · Dark Mode · Minimalism · Bento Grid**

Key rules: touch targets ≥ 44×44px, contrast ≥ 4.5:1, body text ≥ 16px mobile, `prefers-reduced-motion` respected, skeleton screens on all async ops.

### Nano Banana 2 — AI Image Generation
> `.claude/skills/nano-banana-2/SKILL.md`

Use for: UI mockups, icons, social assets, onboarding illustrations.

```bash
nano-banana "your prompt" [--model pro] [-s 512|1K|2K|4K] [-a 16:9|9:16|1:1] [-o filename]
```

---

## Полный каталог скиллов

```
.claude/skills/
│
├── ── КАСТОМНЫЕ MINDFOCUS (9) ──────────────────────────────────
│   adhd-aware-planning.md
│   ai-client-and-prompts.md
│   design-system-and-tokens.md
│   devops-and-deploy.md
│   frontend-architecture-react-vite.md
│   neurodivergent-ux.md
│   project-architecture.md
│   supabase-data-layer.md
│   testing-and-self-review.md
│
├── ── UI/UX PRO MAX + NANO BANANA (2 директории) ───────────────
│   ui-ux-pro-max/
│   nano-banana-2/
│
├── ── ВНЕШНИЕ МАРКЕТПЛЕЙС (20) ─────────────────────────────────
│
│   🎨 Дизайн / Доступность / Анимации
│   alexsnchz-skills-wcag-design.md
│   medy-gribkov-arcana-accessibility-wcag.md
│   secondsky-claude-skills-motion.md
│   julianromli-ai-skills-frontend-ui-animator.md
│
│   🧪 Тестирование
│   majesticlabs-dev-majestic-marketplace-react-testing.md
│   terminalskills-skills-testing-library.md
│   kalibellion-qaskills-vitest.md
│   pramoddutta-qaskills-playwright-e2e.md
│   obra-test-driven-development.md
│   artofrawr-claude-control-code-review.md
│
│   🗄️ Supabase
│   terminalskills-skills-supabase.md
│   openclaw-skills-supabase.md
│
│   🌐 PWA / i18n
│   agents-inc-skills-web-pwa-offline-first.md
│   travisjneuman-.claude-pwa-development.md
│   agent-skills-hub-agent-skills-hub-i18n-localization.md
│   daymade-claude-code-skills-i18n-expert.md
│
│   🔒 Безопасность
│   codelably-harmony-claude-code-security-review.md
│
│   🔧 Workflow / Debugging
│   obra-systematic-debugging.md
│   obra-root-cause-tracing.md
│   obra-verification-before-completion.md
```

**Итого:** 9 кастомных + 2 директории + 20 внешних = **31 файл/директория**
