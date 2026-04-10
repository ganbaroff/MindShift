# ECOSYSTEM MEGA-SPRINT — 2026-04-10

## Цель
Вся экосистема работает как одно целое:
MindShift фокусируется → кристаллы летят в VOLAURA → персонаж растёт → Life Simulator оживает

## Фазы

### Фаза 0 — Разведка (агенты читают всё)
✅ DONE — 4 агента прочитали Constitution, VOLAURA API, MindShift bridge, ZEUS/Life Sim

**Находки:**
- Все 3 API эндпоинта уже построены в VOLAURA (ecosystem-contract.md был устаревшим)
- MindShift: 6 bridge функций полностью вшиты (sendFocusSession, sendVitals, sendTaskDone, sendStreakUpdate, sendPsychotype, fetchCharacterState)
- ZEUS: нет подписки на character_events — это был реальный gap
- Life Simulator (Godot): cloud_save_manager.gd есть, но CLOUD_ENABLED=false, HTTP client = 0%

### Фаза 1 — API layer
✅ ALREADY BUILT в VOLAURA:
- POST /api/character/events → character.py router
- GET /api/character/state → character.py router
- GET /api/character/crystals → character.py router
- POST /api/auth/from_external → auth_bridge.py

### Фаза 2 — Crystal economy
✅ ALREADY WIRED:
- MindShift focus session → sendFocusSession → volaura-bridge-proxy → VOLAURA character_events (xp_earned)
- Crystal chip показывается в NatureBuffer (sessionMinutes × 5, расчёт локальный)
- Crystal balance живёт в VOLAURA, MindShift читает через fetchCharacterState на ProgressPage

### Фаза 3 — ZEUS event bus
✅ DONE (2026-04-10):
- claw3d-fork/server/character-events-relay.js — новый микросервис
  - Подписывается на VOLAURA Supabase Realtime → character_events (Phoenix WebSocket)
  - Экспортирует WebSocket на порту 18790 для Life Simulator клиентов
  - Auto-reconnect, optional HMAC auth, health endpoint
  - npm run character-relay

### Фаза 3b — Life Simulator bridge
✅ DONE (2026-04-10, Sprint E3):
- life-simulator-2026/scripts/managers/api_client.gd — VolauraAPIClient
  - GET /api/character/state → применяет AURA skills к character stats (8 competency map)
  - GET /api/character/crystals → добавляет в character.money (cap 9999)
  - game_loop_controller.gd: start_new_game() вызывает load_character_state()
  - game_loop_controller.gd: _on_event_completed() вызывает load_crystals()

### Фаза 4 — Continuous swarm
✅ DONE (overnight): execute_proposal.py построен, 3 proposals processed

## Финальная картина экосистемы
```
MindShift focus session (25 мин)
    ↓ sendFocusSession()
volaura-bridge-proxy (Supabase edge fn)
    ↓ POST /api/auth/from_external
VOLAURA Railway API
    ↓ INSERT INTO character_events (xp_earned, xp=125, focus_minutes=25)
Supabase Realtime (character_events table)
    ↓ Phoenix WebSocket subscription
character-events-relay (ws://localhost:18790)
    ↓ broadcast
Life Simulator client
    ↓ VolauraAPIClient.load_crystals()
character.money += crystals  ← виден в игре!
```

## Статус всех фаз
- [x] Фаза 0 — Разведка
- [x] Фаза 1 — API layer (уже было)
- [x] Фаза 2 — Crystal economy (уже было)
- [x] Фаза 3 — ZEUS event bus (character-events-relay)
- [x] Фаза 3b — Life Simulator bridge (api_client.gd)
- [x] Фаза 4 — execute_proposal.py

## Что ещё PENDING (не blocking)
- Life Simulator: настроить VOLAURA_API_URL / VOLAURA_ANON_KEY в ProjectSettings
- ZEUS relay: деплой на Railway (сейчас только local)
- Godot: WebSocket клиент для real-time событий (пока только HTTP polling)
- BrandedBy: не начат
