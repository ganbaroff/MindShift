# MindShift — План вывода на уровень Premium UX

> Каждый пункт привязан к принципу с картинки.
> Формат: **что есть сейчас → что должно быть → конкретные шаги**.

---

## 1. Site Architecture (как Vercel principal architects)

**Сейчас:** 6 экранов в flat routing (`/`, `/tasks`, `/focus`, `/calendar`, `/progress`, `/settings`). BottomNav показывает 4 вкладки. `/audio` и `/progress` — orphaned (не в навигации). Нет иерархии: все экраны на одном уровне.

**Должно быть:** Чёткая information architecture — каждый экран имеет одну задачу, навигация предсказуема, нет тупиков.

**Шаги:**

### 1.1 Переструктурировать навигацию
```
BottomNav (4 вкладки):
  🏠 Home    → HomeScreen (BentoGrid + NowPool + QuickSetup)
  ✅ Tasks   → TasksScreen (NOW / NEXT / SOMEDAY / Done recently)
  🎯 Focus   → FocusScreen (таймер, сессии)
  👤 Me      → ProfileScreen (объединяет Progress + Settings)
```
- Убрать `/calendar` из навигации → DueDateScreen становится суб-экраном TasksScreen (фильтр "By date")
- Объединить `/progress` и `/settings` в `/me` — один экран с двумя табами: "Progress" и "Settings"
- Удалить orphaned `/audio` route

### 1.2 Добавить навигационный контекст
- Каждый экран имеет `<header>` с названием + кнопкой назад где нужно
- Модалки (AddTask, DueDateDetail) используют единый `<BottomSheet>` компонент
- Глубокие экраны (post-session flow, onboarding) скрывают BottomNav

---

## 2. Design System (как Apple design directors)

**Сейчас:** CSS-токены в `:root` + `tokens.ts` (67 строк). Цвета, motion — хорошие. Но: типографика ad-hoc (`text-[10px]`, `text-[11px]`), spacing непоследовательный, компоненты не стандартизированы.

**Должно быть:** 8-point grid, 7-step type scale enforced, компоненты с единым API.

**Шаги:**

### 2.1 Type scale — убрать все кастомные размеры
```css
/* 7-step scale (уже в tokens, но не enforced) */
--text-xs:  0.6875rem;   /* 11px — captions */
--text-sm:  0.8125rem;   /* 13px — secondary */
--text-base: 0.9375rem;  /* 15px — body */
--text-lg:  1.0625rem;   /* 17px — subheading */
--text-xl:  1.25rem;     /* 20px — heading */
--text-2xl: 1.5rem;      /* 24px — screen title */
--text-3xl: 1.875rem;    /* 30px — hero */
```
- Grep все `text-[Npx]` и заменить на ближайший шаг из scale
- Добавить ESLint rule (или комментарий в tokens.ts) запрещающий кастомные размеры

### 2.2 Spacing scale — 4px base, enforced
```
4 → p-1 (micro gap)
8 → p-2 (inline padding)
12 → p-3 (card inner)
16 → p-4 (section gap)
24 → p-6 (between sections)
32 → p-8 (screen padding top)
```
- Audit: заменить все `p-[7px]`, `gap-[10px]` на ближайшее значение из scale

### 2.3 Component library — заполнить пробелы
Уже есть: `Button`, `Card`, `Input`
Нужно создать:
- `Toggle` — сейчас inline в SettingsScreen, вытащить в shared/ui
- `Badge` — difficulty badge, carry-over badge, taskType badge → один компонент с вариантами
- `BottomSheet` — единый для DueDateDetail, carry-over menu, park-thought
- `ChipGroup` — уже используется, но не в shared/ui
- `Toast` — обёртка над sonner с брендированным стилем
- `EmptyState` — повторяется на 4+ экранах, вытащить

### 2.4 Semantic heading hierarchy
- HomeScreen: `<h1>Good morning</h1>`
- Секции: `<h2>Now</h2>`, `<h2>Up next</h2>`
- Внутри карточек: `<h3>`
- Сейчас всё `<div>` + `<span>` — сломано для screen readers

---

## 3. Conversion Copy (как Ogilvy copywriters)

**Сейчас:** Copy audit (Sprint Copy) уже почистил тон. Но: пустые состояния скучные, CTA generic, onboarding не "продаёт" ценность каждого шага.

**Должно быть:** Каждый текст решает задачу — мотивирует, объясняет, направляет.

**Шаги:**

### 3.1 Empty states — из "ничего нет" в "начни здесь"
```
NOW pool empty:
  Было: "Nothing here yet"
  Стало: "Your brain is clear. Add one thing to start."

NEXT pool empty:
  Было: "Your upcoming tasks will live here"
  Стало: "Nothing queued. You're fully in the moment."

Done recently empty:
  Было: (section hidden)
  Стало: "Complete a task and it'll show up here. Small wins count."

Focus — no task selected:
  Было: "Pick a task to focus on"
  Стало: "Choose one thing. Just one. That's enough."
```

### 3.2 Onboarding — каждый шаг объясняет "зачем"
```
AppMode step:
  Было: "Pick a style to personalise your widget layout"
  Стало: "How do you work best? This shapes everything you'll see."

Energy step:
  Было: "How's your energy right now?"
  Стало: "No wrong answer — this helps us match your pace today."

Timer step:
  Было: "Pick your timer style"
  Стало: "Some people watch the clock. Others don't. Both work."
```

### 3.3 Micro-copy для каждого действия
- Каждая кнопка → ясный результат ("Add to Now →" не "Submit")
- Каждый toast → подтверждение + что дальше ("Task parked. It'll be in NEXT when you're ready.")
- Каждый destructive action → чёткое предупреждение ("This deletes your account and all data. Can't undo.")

---

## 4. Component Logic for Complex Interactions

**Сейчас:** BentoGrid drag-and-drop работает (dnd-kit). TaskCard имеет swipe-complete с undo. Но: нет gesture hints, нет haptic feedback patterns, carry-over badge не интерактивный.

**Должно быть:** Каждый интерактивный элемент имеет discoverable affordance + feedback.

**Шаги:**

### 4.1 Gesture discovery
- BentoGrid: первый раз показать CoachMark "Hold & drag to rearrange"
- TaskCard: первый swipe → subtle animation hint
- ArcTimer: tap hint уже есть (Sprint 9), расширить для long-press → pause

### 4.2 Carry-over badge → action menu (Sprint B Fix 7)
```tsx
<CarryOverBadge onClick={() => setShowMenu(true)} />
// Popover: Park it | Move to Someday | Still on it
```

### 4.3 DueDateScreen → interactive bottom sheet (Sprint B Fix 4)
```tsx
<TaskRow onClick={() => openSheet(task)}>
// Sheet: title, current date, date picker, "Go to task →"
```

### 4.4 Pull-to-refresh на HomeScreen
- Сейчас: нет обновления кроме перезагрузки
- Нужно: pull gesture → re-fetch Supabase data + recalculate burnout score

---

## 5. Figma → Pixel-Perfect UI

**Сейчас:** Нет Figma-файла. UI строился в коде. Результат: inconsistent spacing, разные card styles, alignment drift.

**Должно быть:** Design source of truth (Figma) → code implementation 1:1.

**Шаги:**

### 5.1 Создать Figma файл из текущего UI
- Screenshot каждого экрана (Home, Tasks, Focus, Settings, Onboarding)
- Rebuild в Figma используя токены из `tokens.ts`
- Зафиксировать: card corner radius, shadow, padding, gap между секциями

### 5.2 Figma → Code pipeline
- Использовать Figma variables (соответствуют CSS tokens)
- При каждом UI изменении: сначала Figma → потом код
- Figma Dev Mode для handoff спецификаций

### 5.3 Visual QA checklist
- [ ] Все карточки: одинаковый `border-radius: 16px`, padding `16px`
- [ ] Все секции: gap `24px` между ними
- [ ] Все кнопки: min-height `44px` (Apple HIG)
- [ ] Все текстовые пары: title `text-lg font-semibold` + subtitle `text-sm text-muted`

---

## 6. Responsive Layouts

**Сейчас:** `max-w-[480px] mx-auto` — жёстко мобильный. На планшете/десктопе — узкая колонка по центру с пустыми краями.

**Должно быть:** Mobile-first, но адаптивный: планшет показывает больше, десктоп — полноценный dashboard.

**Шаги:**

### 6.1 Breakpoint strategy
```
< 640px  (mobile)   — текущий layout, 1 колонка
640-1024 (tablet)   — 2 колонки: NOW + NEXT side by side
> 1024   (desktop)  — 3 колонки: sidebar nav + main + progress panel
```

### 6.2 Реализация
- Убрать `max-w-[480px]` из AppShell
- Заменить на responsive container: `max-w-lg md:max-w-2xl lg:max-w-5xl`
- BentoGrid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- TasksScreen: на планшете NOW и NEXT показываются в 2 колонках
- На десктопе: BottomNav → Sidebar nav (left rail)

### 6.3 PWA manifest
- Проверить `display: standalone` в manifest
- Добавить `display_override: ["window-controls-overlay"]` для десктоп PWA
- iPad split-view support

---

## 7. Multi-Step Forms with Validation

**Сейчас:** OnboardingFlow — 5 шагов, без back-navigation. AddTaskModal — single form, no validation beyond required title.

**Должно быть:** Forms feel polished: validation, progress indication, ability to go back.

**Шаги:**

### 7.1 OnboardingFlow
- Добавить progress bar наверху (step 1/5, 2/5...)
- Добавить кнопку "Back" на каждом шаге (кроме первого)
- Добавить "Skip all" для пользователей кто хочет сразу начать
- Анимация перехода между шагами: slide left/right

### 7.2 AddTaskModal validation
```ts
const validate = () => {
  if (!title.trim()) return 'Task needs a name'
  if (title.length > 100) return 'Keep it short — under 100 characters'
  if (dueDate && new Date(dueDate) < today) return 'Due date is in the past'
  return null
}
```
- Показывать ошибку inline под полем (красный → мягкий amber, ADHD-safe)
- Disable submit пока есть ошибки
- Shake animation на кнопке при попытке submit с ошибкой

### 7.3 Settings — группировка и confirmation
- Destructive actions (GDPR delete, clear all tasks) → двухшаговое подтверждение
- Группировка секций: "Your profile" / "Focus preferences" / "Data & privacy"

---

## 8. Dynamic Dashboards

**Сейчас:** ProgressScreen показывает: total tasks, focus minutes, energy emoji strip, weekly insight. Всё в одну колонку, статичное.

**Должно быть:** Живой dashboard с real-time данными, трендами, actionable insights.

**Шаги:**

### 8.1 Dashboard widgets
```
📊 Focus Streak    — "5 days in a row" (motivational counter)
📈 Energy Trend    — sparkline chart last 14 days
⏱  Average Session — "Your sweet spot is 23 minutes"
🎯 Completion Rate — "You finish 73% of what you start"
🔥 Burnout Radar   — gauge visualization (current score)
💡 AI Insight      — refreshable weekly recommendation
```

### 8.2 Реализация
- Каждый widget — отдельный компонент в `features/progress/widgets/`
- Использовать recharts (уже доступен) для sparklines
- Data из Supabase `focus_sessions` + store pools
- Fallback для каждого widget: "Not enough data yet — complete 3 sessions to unlock"

### 8.3 ProgressScreen layout
- Mobile: вертикальная стопка виджетов
- Tablet: 2-column grid
- Каждый виджет — `<Card>` с заголовком + содержимым + optional action

---

## 9. Production-Ready Code

**Сейчас:** `tsc` проходит, lazy loading есть, error boundaries есть, Sentry подключён. Но: нет CI testing pipeline (только e2e в GitHub Actions), нет bundle analysis, нет lighthouse audit.

**Должно быть:** Каждый push проверяется автоматически.

**Шаги:**

### 9.1 CI pipeline
```yaml
# .github/workflows/ci.yml
on: push
jobs:
  quality:
    steps:
      - tsc --noEmit
      - vitest run
      - npx playwright test (chromium + mobile)
      - npx lighthouse-ci (performance budget: 90+)
```

### 9.2 Bundle budget
- Текущий: ~450KB gzipped (lazy chunks отдельно)
- Target: main bundle < 200KB, largest lazy chunk < 80KB
- Tool: `npx vite-bundle-analyzer` в CI → fail if over budget

### 9.3 Error tracking
- Verify Sentry captures unhandled errors
- Add Sentry user context (userId, appMode, seasonalMode)
- Performance monitoring: track slow renders (> 100ms)

### 9.4 Accessibility CI
- `axe-core` integration в Playwright tests
- Every new component: must pass WCAG AA
- Heading hierarchy check (no skipped levels)

---

## Порядок реализации

### Phase 1 — Foundation (Sprint B + C)
1. Sprint B prompt (10 оставшихся UX-дыр) — уже написан
2. Component library gaps (Toggle, Badge, BottomSheet, EmptyState)
3. Typography + spacing enforcement
4. Heading hierarchy fix

### Phase 2 — Architecture (Sprint D)
5. Navigation restructure (4 tabs, /me merge)
6. Responsive breakpoints (tablet)
7. OnboardingFlow: progress bar + back navigation

### Phase 3 — Polish (Sprint E)
8. Conversion copy overhaul (empty states, onboarding, CTAs)
9. Dashboard widgets (ProgressScreen → real dashboard)
10. Gesture discovery (CoachMarks, swipe hints)

### Phase 4 — Production (Sprint F)
11. CI pipeline (tsc + vitest + playwright + lighthouse)
12. Bundle budget enforcement
13. Figma source of truth
14. Visual QA pass

---

## Что можно сделать прямо сейчас через другую платформу (v0 / Lovable)

Если ты хочешь собрать UI на v0 и скинуть мне код:

**Лучше всего подходит для:**
- Отдельные экраны/компоненты которые не зависят от Zustand store
- Новый ProgressScreen/Dashboard layout
- Новый OnboardingFlow UI (без логики)
- Design system showcase page (все компоненты в одном месте)

**Не подходит для:**
- Компоненты с Zustand/Supabase привязкой (TaskCard, FocusScreen, BentoGrid)
- Anything с useAudioEngine, burnout scoring, VR XP logic

**Процесс:**
1. Ты даёшь v0 промпт → получаешь React/Tailwind код
2. Скидываешь мне `.tsx` файлы
3. Я адаптирую: подключаю store, заменяю hardcoded data на реальные, добавляю motion system, accessibility
