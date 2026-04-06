# WIP: Mochi ↔ ZEUS Bridge — живой мозг для MindShift
# READ THIS FIRST if context compressed

## Цель
Mochi перестаёт быть статичным Gemini-промптом.
Mochi отвечает через ZEUS Gateway → получает память, характер, эволюцию.
Пользователь чувствует живой разум за приложением.

## Текущее состояние Mochi
- Edge function: `supabase/functions/mochi-respond/index.ts`
- LLM: Gemini 2.5 Flash, 8s timeout, 0.9 temp, 150 tokens
- Input: trigger + psychotype + behavior profile + seasonal mode + ADHD signals
- Output: { message, mascotState }
- Rate limit: 10/day free
- Memory: НИКАКОЙ. Каждый вызов с нуля. Не помнит прошлые сессии.

## Что даст ZEUS
- User memory: `memory/users/{userId}.md` — ZEUS уже хранит профили
- Session debriefs: последние 3 дебрифа в каждый промпт
- LLM hierarchy: Cerebras (2000 tok/s) → Gemma4 → NVIDIA → Anthropic
- Drift detection: если Mochi противоречит прошлым ответам — флаг
- Характер: не generic AI, а конкретная личность с историей

## Архитектура (варианты)

### Вариант A: Edge function → ZEUS HTTP
```
MindShift client → mochi-respond edge fn → POST ZEUS /event → ZEUS отвечает → edge fn возвращает
```
Плюсы: минимальные изменения, edge fn остаётся прокси
Минусы: двойная latency (client→Supabase→ZEUS→LLM→ZEUS→Supabase→client), 8s timeout может не хватить

### Вариант B: Client → ZEUS напрямую через WebSocket
```
MindShift client → ws://ZEUS → ответ
```
Плюсы: быстро, реальный стриминг, полная мощь ZEUS
Минусы: нужен WS клиент в React, bypass Supabase auth, rate limiting на клиенте

### Вариант C: Гибрид — ZEUS REST endpoint
```
MindShift client → POST ZEUS /mochi → ZEUS использует память + LLM → ответ
```
Плюсы: простой HTTP, ZEUS делает всё (память, LLM, drift), edge fn не нужен
Минусы: нужен новый endpoint в zeus-gateway-adapter.js, CORS, auth

## Подводные камни
1. **Latency** — ZEUS на Railway (US), Supabase edge fn тоже. Цепочка может быть >8s
2. **Auth** — как ZEUS узнаёт кто этот пользователь? Сейчас edge fn получает JWT от Supabase. ZEUS не знает Supabase users
3. **Rate limiting** — сейчас в edge fn (Supabase KV). Если идём через ZEUS — нужен свой rate limiter
4. **Offline** — MindShift работает offline. ZEUS нет. Fallback на hardcoded messages обязателен
5. **GATEWAY_SECRET** — нельзя отправлять в клиентский JS. Нужен прокси или public endpoint
6. **CORS** — Railway ZEUS сейчас не настроен для MindShift domain
7. **Gemini quota** — edge fn использует Supabase Gemini key. ZEUS использует Cerebras. Разные провайдеры = разные лимиты

## Результат анализа

### CORS: ZEUS уже открыт (`Access-Control-Allow-Origin: *`)
### HTTP: raw http.createServer, не Express
### Auth: /event требует GATEWAY_SECRET в Authorization header
### /agents — полностью публичный, без auth (⚠️ security gap)
### /webhook — публичный для unknown sources (нет HMAC если source не github/sentry/railway)

### Mochi сейчас:
- Supabase edge fn → Gemini 2.5 Flash
- Inputs: trigger + context (psychotype, energy, streaks, ADHD signals)
- Auth: Supabase JWT
- Rate: 10/day free, 30/day chat mode (DB-backed)
- Memory: НИКАКОЙ — каждый вызов с чистого листа
- Fallback: hardcoded i18n messages показываются сразу, AI заменяет если успеет за 8s

### ZEUS chat.send:
- User memory: `memory/users/{userId}.md` (max 4KB, 800 chars injected)
- Memory updates async after each response (Cerebras llama3.1-8b)
- Drift detection: сравнивает с прошлыми ответами
- LLM: Cerebras 2000 tok/s (vs Gemini 8s timeout)

## Решение: Вариант C — новый ZEUS endpoint `/mochi`

Почему:
- Не нужен WS клиент в React (Вариант B слишком сложный)
- Не нужна двойная цепочка через Supabase (Вариант A — двойная latency)
- CORS уже `*` — MindShift может дёргать напрямую
- ZEUS уже имеет user memory — просто добавить endpoint

### Проблема auth
GATEWAY_SECRET нельзя класть в клиентский JS.
Решения:
a) Новый public endpoint `/mochi` без GATEWAY_SECRET, с rate limit по IP
b) Оставить edge fn как прокси (Supabase JWT auth → edge fn → ZEUS /mochi с GATEWAY_SECRET)
c) Добавить lightweight token (не secret, а per-user session token)

Вариант (b) — самый безопасный. Edge fn остаётся auth boundary.
Latency: client → Supabase edge → ZEUS HTTP → Cerebras → ZEUS → edge → client
Проблема: может не уложиться в 8s. Но Cerebras = 2000 tok/s, response 150 tokens = ~75ms LLM time.
Реальная latency: network hops. Supabase edge → Railway = ~50-100ms per hop. Итого: ~300-500ms.
Это БЫСТРЕЕ чем текущий Gemini (который сам по себе 2-4s).

### ПЛАН РЕАЛИЗАЦИИ
1. Добавить `POST /mochi` endpoint в zeus-gateway-adapter.js
   - Auth: GATEWAY_SECRET (только edge fn будет вызывать)
   - Input: { userId, trigger, context, locale, userMessage? }
   - ZEUS делает: load user memory → build Mochi prompt → Cerebras → update user memory → respond
   - Output: { message, mascotState }
2. Обновить mochi-respond edge fn — заменить Gemini на fetch к ZEUS /mochi
3. Клиент не меняется — всё идёт через supabase.functions.invoke('mochi-respond')
4. Fallback: если ZEUS недоступен → текущий Gemini путь → hardcoded messages
