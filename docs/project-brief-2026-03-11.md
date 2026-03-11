# MindShift — Project Brief
**Date:** 2026-03-11 | **Version:** Sprint 8 | **Commit:** `4fe6a19`

---

## 1. ПРОДУКТ

**Что это:**
PWA-приложение для управления задачами и фокус-сессиями, спроектированное под нейрохимию ADHD-мозга. Не очередной таск-менеджер с таймером Pomodoro — инструмент, который учитывает дофаминовый дефицит, RSD (Rejection Sensitive Dysphoria), shame spiral и непоследовательность как норму, а не баг.

**Для кого:**
Взрослые с ADHD (диагностированным или самоидентифицированным), которые пробовали Todoist / Notion / Focus Bear и бросали через 2 недели, потому что эти приложения наказывают за непоследовательность.

**Core-проблема:**
Shame loop — пропустил день → сломал streak → стыд → избегание → бросил приложение. MindShift разрывает этот цикл на каждом уровне дизайна.

**Главный differentiator (три вещи вместе, которых нет ни у кого):**
1. Нейронаучные фокус-фазы Struggle → Release → Flow (0-7m / 7-15m / 15m+) вместо плоского Pomodoro
2. Variable Ratio XP — детерминистический допаминовый мост (8% jackpot 2×, 17% bonus 1.5×, 75% base 1×) по аналогии с механикой slot machines, но этично — для компенсации reward deficiency при ADHD
3. Полное отсутствие наказания: ноль стриков, ноль красного цвета, RecoveryProtocol вместо "вы пропустили 5 дней"

**Бизнес-модель:**
Freemium. $8/mo Pro (planned). ProBanner UI существует в коде. Stripe не подключён — следующий этап.

---

## 2. АРХИТЕКТУРА

**Стек:**
React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + Zustand v5 + Supabase (PostgreSQL + Auth + Edge Functions) + dnd-kit + Motion (Framer) + Sentry + Workbox PWA

**Hosting:** Vercel (live, verified) + Supabase cloud (live, verified)

**CI/CD:** GitHub Actions → lint → build → vitest → Playwright E2E → deploy

### Структура приложения (12 экранов, все lazy-loaded)

| Экран | Строк | Что делает |
|-------|-------|-----------|
| OnboardingFlow | 489 | 4 экрана: intent → energy → cognitive mode → timer preference |
| HomeScreen | 326 | BentoGrid (7 виджетов, drag-sortable), Mochi маскот, BurnoutNudge |
| FocusScreen | ~350 | Thin orchestrator, делегирует в useFocusSession + SessionControls + PostSessionFlow |
| TasksScreen | 270 | 3 пула (NOW ≤3, NEXT ≤6, SOMEDAY), subtask grouping, Traffic Light difficulty |
| CalendarScreen | 459 | Месячная сетка + list view, reminder picker, ICS export, ADHD-safe labels |
| ProgressScreen | — | 7-day consistency bars, AI weekly insight, BurnoutAlert |
| AudioScreen | — | 4 пресета (brown/pink/rain/white noise), Web Audio API + AudioWorklet |
| SettingsScreen | 704 | Energy, timer style, seasonal mode, health profile, flexible pause, GDPR |
| Auth | — | Supabase magic link |
| Legal × 3 | — | Privacy / Terms / Cookie policy |

### Zustand Store (7 slices, 476 строк)

| Slice | Ключевой стейт |
|-------|----------------|
| UserSlice | userId, cognitiveMode, appMode, energyLevel, psychotype, xpTotal, timerStyle, seasonalMode, burnoutScore, flexiblePauseUntil |
| TaskSlice | nowPool[], nextPool[], somedayPool[] |
| SessionSlice | activeSession, sessionPhase, timerSeconds |
| AudioSlice | activePreset, audioVolume, focusAnchor |
| ProgressSlice | achievements[], weeklyStats, completedTotal |
| PreferencesSlice | reducedStimulation, subscriptionTier, trialEndsAt |
| GridSlice | gridWidgets[] (bento layout) |

Persist: 21 поле в localStorage через Zustand persist middleware. Burnout score и session state — не персистятся (вычисляемые / транзиентные).

### Bundle (после Sprint 8 оптимизации)

| Chunk | Размер | Статус |
|-------|--------|--------|
| index (main) | 292 KB | Eager — app shell + store |
| vendor-supabase | 168 KB | Eager |
| vendor-motion | 120 KB | Eager |
| vendor-dnd | 45 KB | **Lazy** — грузится только на HomeScreen |
| vendor-react | 40 KB | Eager |
| FocusScreen | 29 KB | **Lazy** — по маршруту |
| SettingsScreen | 18 KB | **Lazy** — по маршруту |
| RecoveryProtocol | — | **Lazy** — только при 72h+ отсутствии |
| ContextRestore | — | **Lazy** — только при 30-72h отсутствии |

Sentry: deferred через `requestIdleCallback`, email stripped в beforeSend, no session replay (privacy-first).

### AI-слой (6 Supabase Edge Functions, Deno + Gemini 2.5 Flash)

| Function | Что делает | Rate limit |
|----------|-----------|------------|
| `decompose-task` | Разбивает задачу на подшаги, parentTaskId проставляется корректно | 20/hour |
| `recovery-message` | AI welcome-back после 72h+, принимает seasonalMode контекст | 5/day |
| `weekly-insight` | 3 инсайта из данных сессий (1 факт + 1 праздник + 1 предложение) | 3/day |
| `classify-voice-input` | Web Speech API → transcript → Gemini → task/idea/reminder routing | 20/hour |
| `gdpr-export` | Полный JSON экспорт данных (GDPR Article 20) | 3/day |
| `gdpr-delete` | Каскадное удаление + Auth cleanup (GDPR Article 17) | 1/day |

Rate limiting: PostgreSQL-backed atomic counter через SECURITY DEFINER function (ADR-0001).

### Supabase DB (6 таблиц)

`users` · `tasks` · `focus_sessions` · `user_behavior` · `achievements` · `energy_logs`

Все таблицы — Row Level Security, policy `using (auth.uid() = user_id)`.

### PWA

- Standalone mode (без browser chrome)
- Service Worker: NavigationRoute NetworkFirst + CacheFirst для ассетов + NetworkOnly для API
- Offline fallback: `/offline.html`
- Maskable icons для Android 12+
- Sentry + Vercel Analytics + Web Vitals

### ADR (6 задокументированных решений)

0001 PostgreSQL-backed rate limiting · 0002 Zustand vs Redux · 0003 Offline-first pattern · 0004 PWA service worker strategy · 0005 ADHD-safe color system (no red) · 0006 Gemini via Supabase Edge Functions

---

## 3. ЧТО РЕАЛИЗОВАНО

### Надёжно работает (код проверен + 82 unit-теста + 5 E2E suites)

**ADHD Core UX:**
- Фокус-сессии с 6-state FSM (setup → session → interrupt → bookmark → recovery-lock → nature-buffer)
- ArcTimer с 3 режимами: countdown / count-up / surprise (hide digits)
- Фазы Struggle (0-7m) → Release (7-15m) → Flow (15m+) — arc shrinks, digits vanish
- 90-min soft stop (toast), 120-min hard stop (half-sheet, bypassable once)
- Recovery Lock (10-min mandatory rest), Nature Buffer

**Shame-free система:**
- RecoveryProtocol (72h+): full-screen, AI message, micro-win chips, task archival
- ContextRestore (30-72h): half-screen, восстановление рабочей памяти
- Ноль стриков. Cumulative progress вместо streak counter
- Carry-over badge (тёплый amber, не красный)
- Archive-not-delete парадигма

**Burnout Prevention (Sprint 7):**
- `computeBurnoutScore()`: 4-сигнальная формула (snooze 30% + completion 30% + sessions 25% + energy 15%)
- BurnoutAlert: amber card (41-65) / purple card (66+) на ProgressScreen
- BurnoutNudgeCard: 3 gates, 48h cooldown, только in-app (не push)
- MochiSessionCompanion: phase bubbles + accountability prompts каждые 20+ мин
- Seasonal modes (launch/maintain/recover/sandbox) — влияют на pool limits и AI tone

**Task Management:**
- 3 пула NOW (max 3) / NEXT (max 6) / SOMEDAY
- Traffic Light difficulty: easy(teal) / medium(gold) / hard(purple) — никогда red
- Subtask grouping с parent-child thread line
- AI task decomposition с корректным parentTaskId
- Voice input: Web Speech API → Gemini → auto-routes task/idea/reminder

**Health & Onboarding:**
- Timer preference в онбординге (countdown / countup / surprise)
- Health profile в Settings: sleep quality, medication timing, chronotype
- Low Battery contextual prompt (что случилось?)
- Flexible Pause (запланированный перерыв без стыда)

**Calendar:**
- Месячная сетка + list view
- Reminder picker (15m / 30m / 1h / 1 day before)
- ICS export для каждой задачи
- ADHD-safe: "Ready to reschedule?" вместо "OVERDUE"

**Architecture (Sprint 8):**
- FocusScreen декомпозирован (1180 → ~350 строк)
- React.memo: TaskCard (custom comparator), ArcTimer, MochiSessionCompanion, BurnoutAlert
- CSS design tokens: `:root` vars + `[data-mode="calm"]` overrides
- Per-route ErrorBoundary с `<RouteError />` fallback
- Bundle splitting: все lazy routes + 6 vendor chunks

**GDPR:**
- Export: полный JSON (Article 20)
- Delete: каскад + Auth cleanup (Article 17), требует email confirmation

**Testing:**
- 82 unit-тестов (Vitest) — все проходят
- 774 строк E2E (Playwright): auth, focus, onboarding, settings, tasks — все core flows

### Частично / сырое

| Фича | Проблема |
|------|----------|
| `energy_after` | UI prompt есть (Sprint 7), но значение не пишется в Supabase — FocusSessionInsert не включает поле |
| Reminders | Работают через setTimeout + localStorage. Теряются при закрытии вкладки. Нет server-side scheduling |
| Stripe / Payments | subscriptionTier + ProBanner UI есть, payment provider не подключён |
| Supabase edge functions | Код написан, rate-limiting настроен. Задеплоены ли в production — не подтверждено |

---

## 4. PRODUCTION СТАТУС

| Компонент | Код | Production | Примечание |
|-----------|-----|------------|------------|
| Vercel hosting | ✅ | ✅ live | Проверено Юсифом, открывается |
| Supabase DB + Auth | ✅ | ✅ live | Проверено, auth работает |
| Edge Functions | ✅ | ❓ | Нужно: `supabase functions list` |
| Data persistence | ✅ | ❓ | Не тестировалось — создать задачу → закрыть → открыть → есть? |
| Env vars (Vercel) | ✅ | ✅ assumed | App работает → vars должны быть |
| Sentry | ✅ | ❓ | Проверить sentry.io → Issues |
| Analytics | ✅ | ❓ | Проверить Vercel → Analytics tab |
| Stripe | ❌ | ❌ | Следующий этап |
| Реальные пользователи | — | 1 (Юсиф) | Auth проблемы решены, готов к beta |

---

## 5. ОЦЕНКА ГОТОВНОСТИ

| Ось | Оценка | Обоснование |
|-----|--------|-------------|
| Идея | 92% | Research-backed, реальный differentiator, глубокое понимание ADHD |
| Core механика | 88% | Фокус-сессии, фазы, VR XP, burnout radar, calendar, voice AI — всё работает. Gap: energy_after + server-side reminders |
| UX | 78% | Shame-free дизайн отличный, calm palette, zero red. Не проверялось на реальных устройствах у других пользователей |
| Интеграции | 45% | Supabase full-stack, Sentry, Vercel, 6 edge functions. Нет Stripe, нет HealthKit, нет FCM push |
| Рыночная готовность | 50% | Для closed beta (10-50 человек) — готов сейчас. Для публичного запуска нужны: платежи, server-side reminders, App Store strategy |

### Три главных риска

1. **Нет проверки на реальных пользователях.** 8 спринтов фич, но ни один ADHD-пользователь кроме основателя не тестировал. Продукт может быть идеально спроектирован по research и не работать в реальной жизни. Это риск номер один.

2. **Browser-only reminders.** setTimeout + localStorage = уведомления теряются при закрытии вкладки. Для ADHD критично — нужен service worker push или Supabase scheduled functions.

3. **Нет монетизации.** До Stripe = проект с расходами, но без revenue. Social layer (главный retention driver) требует ещё больше инфраструктуры. Порядок: beta → retention data → Stripe → social.

---

## 6. СЛЕДУЮЩИЕ ШАГИ (приоритет)

1. **Тест persistence** (5 мин): создать задачу → закрыть браузер → открыть → есть? Это валидирует весь Supabase sync
2. **Задеплоить edge functions**: `supabase functions deploy` — без этого AI-фичи мертвы в production
3. **Первые 3-5 бета-пользователей**: реальный ADHD-пользователь найдёт проблемы за 10 минут
4. **Server-side reminders**: Supabase cron или pg_cron для scheduling
5. **Stripe integration**: Stripe Checkout → webhook → Supabase Edge Function → UPDATE profiles SET plan = 'pro'

---

*Документ сгенерирован на основе прямого анализа исходного кода проекта (72 TypeScript/TSX файла, 13,453 строк) + Sprint History (Sprint 5-8).*
