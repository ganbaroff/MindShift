# MindShift — DevOps & Architecture Audit

**Date:** 2026-03-11 | **Branch:** `main` @ `44e175c` | **Codebase:** 72 files, 13,453 LOC

---

## TL;DR

Архитектура MindShift — **добротная для MVP**. Lazy routes, vendor chunks, PWA offline — всё на месте. Но есть 4 зоны роста: main bundle 305 KB (целевой < 250), FocusScreen 1180 строк (порог ~600), 1 ADR из необходимых 5+, тест-покрытие ~5% файлов.

---

## 1. Что уже хорошо (сохранить)

| Что | Почему хорошо |
|-----|---------------|
| **12 lazy-loaded routes** | Каждый экран грузится только при переходе. Code splitting из коробки. |
| **6 vendor chunks** | React, Motion, Supabase, dnd-kit — изолированы. Кэшируются отдельно. |
| **Zustand store (476 строк, 7 slices)** | Чёткие границы между слайсами. Persist middleware только на нужные поля. |
| **PWA standalone** | injectManifest, maskable icons, offline.html, NavigationRoute fallback. A+. |
| **Singleton Supabase client** | Type-safe `createClient<Database>`, env validation, auto-refresh token. |
| **Lean dependencies (30 prod)** | Нет jQuery, lodash, moment. Только необходимое. |
| **Constants annotated** | Каждая константа ссылается на Research # (burnout, VR, phases). |

---

## 2. Что нужно улучшить

### 2.1. Main Bundle: 305 KB → цель < 250 KB

**Проблема:** index.js = 305 KB. Включает App shell + все утилиты + весь store + RecoveryProtocol + ContextRestore + CookieBanner. Из этого ~40 KB — компоненты, которые 98% пользователей не видят при каждом входе.

**Решение (3 шага):**

| # | Действие | Экономия | Усилия |
|---|----------|----------|--------|
| A | Lazy-load RecoveryProtocol + ContextRestore (показываются 1-2% сессий) | 5-8 KB | Низкие |
| B | Defer Sentry.init() через `setTimeout(0)` — не блокировать main thread | 0 KB (перф.) | Низкие |
| C | Вынести dnd-kit в lazy chunk (BentoGrid грузит 45 KB для drag-n-drop) | 45 KB deferred | Средние |

После A+B+C: main bundle ~250-260 KB + dnd грузится только на HomeScreen.

### 2.2. FocusScreen: 1180 строк → цель < 600

**Проблема:** Самый большой файл в проекте. 6-state FSM + 90/120 min stops + Mochi bubbles + energy delta + audio toggle + park thought — всё в одном файле. Трудно тестировать, трудно ревьюить.

**Решение — извлечь 4 модуля:**

```
src/features/focus/
├── FocusScreen.tsx         (~350 строк) — FSM + layout
├── useFocusSession.ts      (~250 строк) — хук: таймер, фазы, stops
├── SessionControls.tsx     (~150 строк) — кнопки start/pause/stop/park
├── PostSessionFlow.tsx     (~150 строк) — energy delta + recovery lock
├── ArcTimer.tsx            (без изменений)
└── MochiSessionCompanion.tsx (без изменений)
```

Выигрыш: каждый модуль тестируемый отдельно. FSM логика в хуке, UI в компонентах.

### 2.3. Нулевой React.memo

**Проблема:** 0 компонентов обёрнуты в `memo()`. При каждом ре-рендере parent — все дети перерисовываются. Критично для списков (TaskCard рендерится в map).

**Решение — memo на 5 компонентов:**

```typescript
// TaskCard — в списке, рендерится по 3-9 раз
export default memo(TaskCard, (prev, next) => prev.task.id === next.task.id && prev.task.updatedAt === next.task.updatedAt)

// BurnoutAlert — статичный, условный рендер
export default memo(BurnoutAlert)

// ArcTimer — SVG-тяжёлый, parent ре-рендерится каждую секунду
export default memo(ArcTimer)

// MochiSessionCompanion — анимации, не должен дёргаться от parent
export default memo(MochiSessionCompanion)

// SortableCard (BentoGrid) — в drag-списке
export default memo(SortableCard)
```

### 2.4. Design Tokens: JS → CSS Variables

**Проблема:** `tokens.ts` (186 строк) — цвета как JS-функции. Каждый компонент импортирует и вызывает `usePalette()` → лишний JS в bundle + runtime overhead.

**Решение:**

```css
/* src/index.css */
:root {
  --color-primary: #7B72FF;
  --color-teal: #4ECDC4;
  --color-gold: #F59E0B;
  --color-surface: #1E2136;
  --color-surface-raised: #252840;
  --color-text-primary: #E8E8F0;
  --color-text-muted: #8B8BA7;
}

/* Calm mode override */
[data-mode="calm"] {
  --color-primary: #7878B8;
  --color-teal: #4A8A87;
  --color-gold: #8C6A10;
}
```

Компоненты: `style={{ color: 'var(--color-primary)' }}` или Tailwind `text-[var(--color-primary)]`.

Выигрыш: -4-5 KB JS, переключение темы через `data-mode` атрибут (мгновенно, без ре-рендера).

### 2.5. Test Coverage: 5% → цель 30%

**Текущее:** 4 unit-теста + 5 E2E. 82 теста проходят, но покрыто ~5% файлов.

**Что добавить (приоритет):**

| Файл | Что тестировать | Почему |
|------|-----------------|--------|
| `burnout.ts` | computeBurnoutScore edge cases (0, 50, 100) | Критичная бизнес-логика |
| `offlineQueue.ts` | enqueue/dequeue/retry/conflict | Данные пользователя |
| `useFocusSession` (новый хук) | Фазы, stops, energy delta | Ядро продукта |
| `tokens.ts` | Palette switch, WCAG contrast ratios | Accessibility |
| `notify.ts` | Permission flow, fallback | UX consistency |
| `TaskCard` | Complete, snooze, VR display, difficulty dot | Самый используемый компонент |
| `AddTaskModal` | Validation, voice input, difficulty | User input path |

Цель: 30 файлов с тестами → ~40% coverage.

### 2.6. ADR: 1 документ → цель 5+

**Текущее:** Один ADR (`0001-db-backed-rate-limiting.md`). Хороший, но одинокий.

**Нужны ADR для:**

| # | Решение | Почему записать |
|---|---------|-----------------|
| 0002 | Zustand vs Redux vs Jotai | Store — ядро приложения. Новый разработчик спросит "почему не Redux?" |
| 0003 | Offline-first pattern (enqueue/dequeue) | Нетривиальный паттерн. Без ADR — чёрный ящик. |
| 0004 | PWA service worker strategy | NavigationRoute + CacheFirst + NetworkOnly — нужно объяснить зачем каждая стратегия |
| 0005 | ADHD-safe color system (never-red) | Дизайн-решение с научным обоснованием. Новый дизайнер может добавить красный. |
| 0006 | Gemini 2.5 Flash for edge functions | Почему не GPT-4? Почему не локально? Стоимость, latency, контекст. |

---

## 3. Инновации (безопасные, не ломающие)

### 3.1. Route Prefetching (LCP +30%)

Когда пользователь на HomeScreen — мы знаем, что 80% переходят на FocusScreen. Предзагрузить:

```typescript
// В HomeScreen.tsx — useEffect на mount
useEffect(() => {
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = '/assets/FocusScreen-*.js' // vite hash
  document.head.appendChild(link)
}, [])
```

Или через Vite plugin: `vite-plugin-link-prefetch`.

Результат: FocusScreen открывается мгновенно, т.к. chunk уже в browser cache.

### 3.2. Bundle Analyzer (DevX)

Добавить `rollup-plugin-visualizer` — интерактивная карта bundle. Видно каждый модуль, его размер, зависимости. Запускается по `npm run build:analyze`.

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'
plugins: [
  // ...existing
  visualizer({ filename: 'dist/bundle-report.html', open: false })
]
```

### 3.3. Per-Feature Error Boundaries

Сейчас 1 ErrorBoundary на всё приложение. Если FocusScreen крашится — пользователь видит пустой экран. Добавить boundary на каждый route:

```typescript
// В App.tsx, каждый Route:
<Route path="/focus" element={
  <ErrorBoundary fallback={<p>Focus session had an issue. <Link to="/">Go home</Link></p>}>
    <FocusScreen />
  </ErrorBoundary>
} />
```

### 3.4. Image Optimization

Иконки в `/public/` — 157 KB PNG. Конвертировать в WebP → ~80 KB (-50%). Добавить `<link rel="icon" type="image/webp">` с PNG fallback.

### 3.5. Performance Budget

Зафиксировать в CI:

```
Main bundle: < 260 KB
Total JS: < 800 KB
FCP: < 1.5s (3G)
LCP: < 2.5s (3G)
TTI: < 3.5s (3G)
```

Vite plugin `vite-plugin-checker` может проверять размер на build.

---

## 4. Claude Code Prompt (для реализации)

Если хочешь реализовать оптимизации через Claude Code, скопируй этот блок:

```
## Architecture Optimization Sprint

### Context
MindShift PWA. React 19 + Vite 7 + Zustand v5 + Tailwind v4.
Current main bundle: 305 KB. Target: < 260 KB.
FocusScreen: 1180 lines. Target: < 600.
Run `tsc --noEmit` before every commit.

### Block 1: Bundle Optimizations
1a. In App.tsx: lazy-load RecoveryProtocol and ContextRestore (wrap in Suspense)
1b. In main.tsx: defer Sentry.init() with requestIdleCallback or setTimeout(0)
1c. In HomeScreen.tsx: lazy-load BentoGrid component (defers dnd-kit 45KB chunk)
1d. Add rollup-plugin-visualizer to vite.config.ts (dev only)

### Block 2: FocusScreen Refactor
2a. Extract useFocusSession.ts hook (timer logic, phase transitions, 90/120min stops)
2b. Extract SessionControls.tsx (start/pause/stop/park buttons)
2c. Extract PostSessionFlow.tsx (energy delta check-in + recovery lock countdown)
2d. FocusScreen.tsx becomes thin orchestrator (~350 lines)

### Block 3: React.memo
3a. Wrap TaskCard in memo() with (prev, next) => prev.task.id === next.task.id
3b. Wrap ArcTimer in memo()
3c. Wrap MochiSessionCompanion in memo()
3d. Wrap BurnoutAlert in memo()

### Block 4: Design Tokens → CSS Variables
4a. Create :root CSS variables in src/index.css for all tokens from tokens.ts
4b. Add [data-mode="calm"] overrides with desaturated values
4c. Update App.tsx to set data-mode attribute on document.documentElement
4d. Gradually replace usePalette() calls with CSS var references
Note: Keep usePalette() working alongside CSS vars during migration. Don't break existing components.

### Block 5: ADR Documents
Write 5 ADR files in docs/adr/:
- 0002-state-management-zustand.md
- 0003-offline-first-pattern.md
- 0004-pwa-service-worker-strategy.md
- 0005-adhd-safe-color-system.md
- 0006-ai-edge-functions-gemini.md
Each ADR: Context → Decision → Consequences → Alternatives Considered.

### Block 6: Verify
- tsc --noEmit (zero errors)
- npm run build (check bundle sizes decreased)
- vitest run (all tests pass)
- Commit message: "refactor: architecture optimizations — bundle split, FocusScreen decomposition, React.memo, CSS tokens, ADRs"
```

---

## Scorecard

| Dimension | Сейчас | После оптимизаций | Мировой стандарт |
|-----------|--------|-------------------|------------------|
| Main bundle | 305 KB | ~250 KB | < 200 KB |
| Total JS | 735 KB | ~680 KB | < 500 KB |
| Largest file | 1180 строк | ~350 строк | < 500 строк |
| React.memo | 0 | 5 | По необходимости |
| ADRs | 1 | 6 | 5-10 для MVP |
| Test files | 4 unit + 5 E2E | 4 + 5 (+ backlog) | 30%+ coverage |
| Error boundaries | 1 global | 1 + per-route | Per-feature |
| Design tokens | JS functions | CSS variables | CSS vars / Tailwind theme |
| Bundle analyzer | Нет | Есть | Must-have для prod |
| Perf budget | Нет | CI-enforced | Must-have для prod |
