# UX Copy Audit — План имплементации

**Дата:** 2026-03-12
**Контекст:** Реализация фиксов из `docs/ux-copy-audit-2026-03-12.md`
**Ветка:** `main` @ `4fe6a19` (Sprint 9 uncommitted)
**Правило:** `tsc --noEmit` перед каждым коммитом

---

## Assumptions (Допущения)

### Технические допущения

1. **Нет тестов на конкретные строки.** 82 теста в Vitest проверяют логику (store, burnout, offline queue), но НЕ сравнивают UI-строки. Это значит — можно менять копирайт без риска сломать тесты. **Проверить:** `grep -r "Check your inbox" src/__tests__` — если пусто, допущение верно.

2. **Энерджи-лейблы НЕ хранятся в БД как текст.** В Supabase `energy_logs` хранится числовой `energy_level` (1–5), а не строковая метка. Значит можно менять лейблы в UI без миграций. **Проверить:** посмотреть `007_health_profile.sql` — тип поля `energy_level`.

3. **Mochi messages не приходят с сервера.** `MochiSessionCompanion.tsx` содержит массивы сообщений inline (milestone_60 и др.). Нет edge function для Mochi. Это чисто клиентские строки. **Проверить:** `grep -r "mochi" supabase/functions`.

4. **Тосты через sonner — без i18n.** Все `toast()` / `toast.success()` / `toast.error()` принимают plain strings. Нет i18n обёртки. Значит меняем строки напрямую. Будущая локализация — отдельный спринт.

5. **Никакой аналитики не трекает конкретные строки.** Vercel Analytics + web-vitals трекают page views и performance, не click copy. Смена текста на кнопках не сломает аналитику. **Проверить:** `grep -r "analytics" src/` на предмет event names с текстом кнопок.

6. **aria-labels нужно обновлять синхронно с видимым текстом.** В нескольких местах (EnergyCheckin, TasksScreen) aria-labels содержат строки, которые мы меняем. Пропустить aria-label = WCAG регрессия.

### Продуктовые допущения

7. **Yusif — единственный пользователь.** Нет A/B тестов, нет когорт. Можно менять всё разом без feature flags.

8. **"No rush" остаётся фирменной фразой.** Аудит одобрил её. Мы НЕ трогаем "No rush" ни в одном месте.

9. **Эмодзи-стратегия сохраняется.** Мы меняем конкретные эмодзи (⚠️→⏸️, 💪→🌿), но НЕ убираем эмодзи как класс.

10. **Копирайт остаётся на английском.** Русский — только для коммуникации в чате. Все строки в коде — English only.

11. **Финальные формулировки из аудита — не догма.** Если при имплементации строка не влезает в layout или ломает ритм, допустима адаптация при сохранении spirit изменения.

---

## Стратегия: 4 волны

Разбивка по принципу "минимальный blast radius" — каждая волна затрагивает изолированную группу файлов, может быть отдельным коммитом.

---

## Волна 1 — Системные константы (P0)

**Цель:** Устранить рассинхрон лейблов энергии и таймера по всему приложению.
**Файлы:** 5 файлов, ~20 строк изменений.
**Риск:** Низкий. Чисто текстовые замены, без логики.

### 1.1 — Стандартизация энерджи-лейблов

**Каноничный набор:** `Drained · Low · Okay · Good · Wired`

| Файл | Строка | Было | Стало |
|------|--------|------|-------|
| `src/features/home/EnergyCheckin.tsx` | L8-12 | Low battery / Low / OK / Good / Charged | Drained / Low / Okay / Good / Wired |
| `src/features/home/EnergyCheckin.tsx` | L37-41 | aria-labels: Exhausted / Low / Neutral / Good / High energy | Drained / Low / Okay / Good / Wired |
| `src/features/home/HomeScreen.tsx` | L315-319 | Exhausted / Low / Neutral / Good / High | Drained / Low / Okay / Good / Wired |
| `src/features/focus/PostSessionFlow.tsx` | L28-32 | Drained / Calm / Good / Great / Wired | Drained / Low / Okay / Good / Wired |
| `src/features/settings/SettingsScreen.tsx` | L397-401 | Low / Calm / Good / High / Peak (+эмодзи) | 😴 Drained / 😌 Low / 🙂 Okay / 😄 Good / ⚡ Wired |

**Действие:** Создать shared константу `ENERGY_LABELS` в `src/shared/lib/constants.ts` и импортировать во всех 5 файлах. Это предотвращает будущий рассинхрон.

```ts
// src/shared/lib/constants.ts (добавить)
export const ENERGY_LABELS = ['Drained', 'Low', 'Okay', 'Good', 'Wired'] as const
export const ENERGY_EMOJI  = ['😴', '😌', '🙂', '😄', '⚡'] as const
```

### 1.2 — Стандартизация таймер-лейблов

**Каноничный набор:** `Countdown · Count-up · Surprise`

| Файл | Строка | Было | Стало |
|------|--------|------|-------|
| `src/features/onboarding/OnboardingFlow.tsx` | L330 | `'Count down'` | `'Countdown'` |
| `src/features/onboarding/OnboardingFlow.tsx` | L336 | `'Count up'` | `'Count-up'` |
| `src/features/settings/SettingsScreen.tsx` | L364-366 | Countdown / Count-up / Surprise | — (уже верно) |

**Действие:** Только OnboardingFlow нуждается в правке.

### Верификация волны 1
- `tsc --noEmit`
- `grep -rn "Exhausted\|Low battery\|Charged\|Neutral\|Calm\|Great\|Peak\|Count down\b" src/` — должен быть пустой (кроме комментариев)

---

## Волна 2 — Тон и эмодзи (P0 + P1)

**Цель:** Убрать шейм-триггеры (⚠️, 💪), поправить тон на критических экранах.
**Файлы:** 6 файлов, ~15 строк.
**Риск:** Низкий. Строковые замены, 1 эмодзи-замена.

### 2.1 — Interrupt-confirm (FocusScreen.tsx)

| Строка | Было | Стало | Причина |
|--------|------|-------|---------|
| L81 | `⚠️` (div emoji) | `⏸️` | ⚠️ = danger association, ⏸️ = pause = neutral |
| L98 | `Keep going 💪` | `Keep going 🌿` | 💪 = agressive motivation → shame trigger |

### 2.2 — Post-session (PostSessionFlow.tsx)

| Строка | Было | Стало | Причина |
|--------|------|-------|---------|
| L106 | `'Skip rest'` | `'I'm ready'` | "Skip" implies skipping something you should do |
| L143 | `'90 minutes! Amazing 🌊'` | `'90 minutes of deep focus 🌊'` | Exclamation + "Amazing" overly exuberant |
| L182 | `'I'm in hyperfocus — continue →'` | `'I know — keep going →'` | Removing self-diagnosis requirement |

### 2.3 — Hard-stop bypass (FocusScreen.tsx)

| Строка | Было | Стало | Причина |
|--------|------|-------|---------|
| L224 | `I'm in hyperfocus — keep going` | `I know — let me keep going` | Consistent with 2.2 |

### 2.4 — Auth screen (AuthScreen.tsx)

| Строка | Было | Стало | Причина |
|--------|------|-------|---------|
| L254 | `Check your inbox 📬` | `Magic link on its way ✨` | Warmer, matches "magic link" language |

### 2.5 — Rest mode toast (SettingsScreen.tsx)

| Строка | Было | Стало | Причина |
|--------|------|-------|---------|
| L510 | `'Back in action 💪'` | `'Rest mode off — welcome back 🌿'` | 💪 tone-deaf if still recovering |

### 2.6 — ICS export toast (AddTaskModal.tsx)

| Строка | Было | Стало | Причина |
|--------|------|-------|---------|
| L54 | `'📅 Opening in your calendar app...'` | `'📅 Calendar event downloaded'` | Accurate — it's a download, not an open |

### Верификация волны 2
- `tsc --noEmit`
- Визуальная проверка: открыть Focus → нажать Stop → проверить ⏸️ + 🌿
- Визуальная проверка: завершить 90-мин сессию → проверить текст RecoveryLock

---

## Волна 3 — Клэрити и жаргон (P1)

**Цель:** Убрать внутренний жаргон (micro-win, micro-focus, Generate), уточнить неясные формулировки.
**Файлы:** 8 файлов, ~12 строк.
**Риск:** Низкий. Чисто текстовые замены.

### 3.1 — Внутренний жаргон → пользовательский язык

| Файл | Строка | Было | Стало |
|------|--------|------|-------|
| `RecoveryProtocol.tsx` | L273 | `'Or pick a micro-win to start:'` | `'Or pick something easy to start with:'` |
| `BurnoutAlert.tsx` | L35 | `'Try a 5-min micro-focus →'` | `'Try a 5-minute session →'` |
| `ProgressScreen.tsx` | L337 | `'Generate'` | `'Get insights'` |
| `ProgressScreen.tsx` | L361 | `'Tap "Generate" to get...'` | `'Tap "Get insights" to see...'` |

### 3.2 — Уточнение неясных формулировок

| Файл | Строка | Было | Стало |
|------|--------|------|-------|
| `AddTaskModal.tsx` | toast | `'Nothing captured — try again in a quiet spot.'` | `'Nothing captured — try again, or type it instead.'` |
| `AddTaskModal.tsx` | toast | `'AI returned an unexpected response...'` | `'Something went wrong — add the task and try again later.'` |
| `AddTaskModal.tsx` | toast | `'Recorded your note — edit the details below.'` | `'Got it — check the details below.'` |
| `InstallBanner.tsx` | L68 | `'Works offline · No browser bar · Feels native'` | `'Works offline · No browser bar · Full screen'` |
| `TasksScreen.tsx` | L265 | `'...it's designed for exactly this.'` | `'Tap Focus to work on this task without distractions.'` |

### 3.3 — Auth screen cleanup

| Файл | Строка | Было | Стало |
|------|--------|------|-------|
| `AuthScreen.tsx` | L388-392 | Redundant "By continuing..." footer | `'Your data stays private. Always.'` |

### Верификация волны 3
- `tsc --noEmit`
- `grep -rn "micro-win\|micro-focus\|Feels native\|Generate" src/` — "Generate" и "micro-" не должны появляться в UI-строках

---

## Волна 4 — Полировка (P2)

**Цель:** Консистентность мелочей: прогресс-бар, counter labels, secondary buttons.
**Файлы:** 8 файлов, ~15 строк.
**Риск:** Минимальный. Все изменения — отображение, без логики.

### 4.1 — Progress screen: убрать скрытый streak-шейминг

| Файл | Строка | Было | Стало |
|------|--------|------|-------|
| `ProgressScreen.tsx` | L297 | `'{activeDays}/7'` | `'{activeDays}'` |
| `ProgressScreen.tsx` | L286 | `'{activeDays} of 7 days active'` | `'{activeDays} days focused this week'` |
| `ProgressScreen.tsx` | L295 | `'{unlocked.length}/{ACHIEVEMENT_DEFINITIONS.length}'` | `'{unlocked.length} unlocked'` |

### 4.2 — Мелкие формулировки

| Файл | Строка | Было | Стало |
|------|--------|------|-------|
| `AuthScreen.tsx` | L113 | `'Welcome — let's get you in'` | `'Welcome. Let's get started.'` |
| `TasksScreen.tsx` | L198 | `'Queued tasks will appear here...'` | `'Your upcoming tasks will live here. No rush.'` |
| `RecoveryProtocol.tsx` | L318 | `'Skip — just show me my tasks'` | `'Skip — show my tasks'` |
| `MochiSessionCompanion.tsx` | L62 | `'60 minutes. Remember this feeling. 🌟'` | `'One hour. This was real. 🌟'` |

### 4.3 — Seasonal mode copy

| Файл | Строка | Было | Стало |
|------|--------|------|-------|
| `SettingsScreen.tsx` | L556 | `'Explore freely — no limits'` | `'Open mode — no pool constraints'` |

### 4.4 — Delete account button

| Файл | Строка | Было | Стало |
|------|--------|------|-------|
| `SettingsScreen.tsx` | L677 | `'Permanently delete'` | `'Yes, delete my account'` |

### 4.5 — Cookie banner precision

| Файл | Строка | Было | Стало |
|------|--------|------|-------|
| `CookieBanner.tsx` | L71 | `'No cookies, no tracking.'` | `'No tracking cookies.'` |

### Верификация волны 4
- `tsc --noEmit`
- Визуальная проверка: Progress screen → убедиться что "/ 7" больше нет
- Визуальная проверка: Settings → Delete flow → проверить текст кнопки

---

## Отложенные (не в этом спринте)

| ID | Что | Почему отложено |
|----|-----|-----------------|
| 2.1 | Убрать "Step X of Y" из onboarding | Требует layout-рефактор ProgressBar компонента |
| 6.4 | "Park" naming collision (task vs focus bookmark) | Глобальный rename, не копирайт-фикс |
| 10.3 | Убрать ceiling из XP bar | Зависит от продуктового решения (Yusif) — ceiling может быть мотиватором |
| 3.1 | QuickSetupCard heading | Зависит от layout — "Quick setup — 10 seconds" может не влезть |
| 11.5 | Settings header subtitle | Cosmetic, email служит как ID confirmation |

---

## Чеклист перед коммитом

```
[ ] tsc --noEmit — чисто
[ ] grep по старым строкам — пусто
[ ] Визуальная проверка Auth → Focus → PostSession → Progress → Settings
[ ] aria-labels обновлены синхронно с видимым текстом
[ ] Коммит: "refactor(copy): standardize UX copy per neuroinclusive audit"
```

---

## Итого

| Волна | Файлов | Строк | Время | Зависимости |
|-------|--------|-------|-------|-------------|
| 1 — Константы | 5 (+constants.ts) | ~25 | 15 мин | Нет |
| 2 — Тон/эмодзи | 6 | ~15 | 10 мин | Нет |
| 3 — Клэрити | 8 | ~12 | 10 мин | Нет |
| 4 — Полировка | 8 | ~15 | 10 мин | Нет |
| **Итого** | **~15 уникальных файлов** | **~67 строк** | **~45 мин** | — |

Все волны независимы друг от друга. Можно делать в любом порядке, можно коммитить поволново или одним коммитом.
