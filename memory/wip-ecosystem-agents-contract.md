---
name: WIP — Ecosystem Agents Contract
description: Breadcrumb для Sprint "Agents as World Inhabitants + Shareholders"
type: project
---

# WIP: Ecosystem Agents Contract — Breadcrumb
**Создан:** 2026-04-10
**HEAD MindShift:** 33597bd (посмотреть git log если сомнения)
**Статус:** ДОКУМЕНТАЦИЯ ГОТОВА — жду approve Yusif → начинаю Sprint 1 SQL

---

## Что прочитано и понято

### ZEUS (zeus-gateway-adapter.js)
- Node.js, Railway, port 18789/18790
- 39 агентов, event-driven (GitHub/Sentry/Railway webhooks → HMAC verify → classifyEvent → wakeAgent)
- LLM иерархия: Cerebras Qwen3-235B (primary) → NVIDIA NIM → Anthropic Haiku (fallback)
- USER_MEMORY_DIR: `memory/users/{userId}.md` (4KB per user, auto-rotate)
- debriefSession(): записывает summary после каждого разговора → `memory/debriefs/`
- DOMAIN_AGENTS: security/infra/qa/product/architecture/performance/analytics
- EVENT_DOMAIN_MAP: regex-классификация входящих событий → severity P0/P1/P2

### Python Swarm (agent_hive.py + contracts.py)
- AgentStatus: PROBATIONARY(0.8x) → MEMBER(1.0x) → SENIOR(1.1x) → LEAD(1.2x) → QUARANTINE(0.3x)
- File-based JSON/JSONL — нет Supabase, работает независимо
- FindingContract: typed Pydantic schema — severity/category/files/summary/recommendation/confidence
- Categories: SECURITY, UX, PERFORMANCE, GROWTH, INFRA, PRODUCT, QA, LEGAL, ECOSYSTEM
- Groq provider уже существует: `providers/groq_provider.py`, `providers/groq_gemma.py`, `providers/groq_mixtral.py`

### MindShift Supabase (15 миграций)
- users, tasks, focus_sessions, user_behavior, achievements, energy_logs — ЕСТЬ
- crystal_ledger — НЕТ (только xp_total в users)
- communities, community_memberships — НЕТ
- agent_profiles в Supabase — НЕТ (агенты только в ZEUS файлах)
- shareholder_positions, revenue_snapshot — НЕТ

### AI Twin Concept
- Phase 1: text (Gemini 2.5 Flash) — character_state JSON как мозг
- "AI draft + approve" паттерн — никогда не автономный
- BrandedBy интеграция через тот же паттерн

### ecosystem-contract.md (уже в памяти)
- ONE identity (auth.users), ONE event bus (character_events), ONE crystal economy
- volaura-bridge-proxy: MindShift → VOLAURA канал уже работает
- character_events: xp_earned, buff_applied, stat_changed, vital_logged, crystal_earned

---

## ECOSYSTEM-AGENTS-CONTRACT v1 (финальная версия)

### Новые сущности

**agents** — профиль агента в Supabase
```sql
id uuid PK
slug text UNIQUE          -- 'mochi', 'guardian', 'strategist'
display_name text
tier text CHECK IN ('FREE','PRO','ELITE')
rank text CHECK IN ('PROBATIONARY','MEMBER','SENIOR','LEAD','QUARANTINE')
state text CHECK IN ('idle','listening','working','recovering','offline')
personality jsonb          -- { tone, specialty, catchphrase }
zeus_agent_id text         -- ссылка на агента в ZEUS (для маршрутизации)
community_id uuid?         -- NULL = публичный; NOT NULL = только в том комьюнити
created_at timestamptz
last_active_at timestamptz
```

**agent_state_log** — история состояний (audit)
```sql
id uuid PK
agent_id uuid → agents
state text
reason text
user_id uuid?              -- кто вызвал переход (если применимо)
started_at timestamptz
ended_at timestamptz?
```

**communities** — закрытые и открытые группы
```sql
id uuid PK
slug text UNIQUE           -- 'obsidian-circle'
name text
tier text CHECK IN ('OPEN','ELITE')
entry_cost_crystals int    -- 0 для OPEN, 10000 для ELITE
is_anonymous boolean       -- члены анонимны снаружи
member_count int DEFAULT 0 -- cached counter
constitution text          -- Fight Club правила
created_at timestamptz
```

**community_memberships** — кто где
```sql
id uuid PK
user_id uuid → auth.users
community_id uuid → communities
role text CHECK IN ('MEMBER','MODERATOR','FOUNDER')
alias text?                -- псевдоним если is_anonymous
badge_id text              -- уникальный бейдж
is_shareholder boolean DEFAULT false
joined_at timestamptz
UNIQUE(user_id, community_id)
```

**crystal_ledger** — полный ledger всех кристаллов (append-only)
```sql
id uuid PK
user_id uuid → auth.users
crystal_type text CHECK IN ('FOCUS','SHARE')
  -- FOCUS = заработан (минуты фокуса)
  -- SHARE = донатный (передаётся, инвестируется)
amount int                 -- + приход / - расход
source_event text          -- 'focus_session','donation','dividend','purchase'
reference_id uuid?         -- id сессии/транзакции
balance_after int          -- снапшот FOCUS-баланса после операции
created_at timestamptz
```

**shareholder_positions** — позиция акционера
```sql
id uuid PK
user_id uuid → auth.users
community_id uuid → communities
share_units int            -- SHARE-кристаллы вложено
entry_value_at int         -- курс на момент входа
dividend_earned int DEFAULT 0
dividend_claimed int DEFAULT 0
updated_at timestamptz
UNIQUE(user_id, community_id)
```

**revenue_snapshots** — публичный финансовый отчёт
```sql
id uuid PK
period date               -- первый день месяца
gross_revenue_cents int
operating_cost_cents int
net_income_cents int
dividend_pool_cents int    -- 50% от net_income
distributed_at timestamptz?
-- RLS: SELECT доступен всем (прозрачность)
```

### Новые event types
```
agent_activated         zeus    { agent_id, tier, state }
agent_leveled_up        zeus    { agent_id, old_rank, new_rank }
agent_caught_bug        zeus    { agent_id, product, severity }
agent_helped_user       zeus    { agent_id, user_id, resolution_ms }
community_created       volaura { community_id, tier, entry_cost }
community_joined        volaura { user_id, community_id, crystal_spent }
crystal_earned          ms/vl   { user_id, type:'FOCUS', amount, source }
crystal_donated         volaura { from_user_id, to_user_id, amount }
dividend_accrued        volaura { user_id, community_id, amount }
dividend_claimed        volaura { user_id, community_id, amount }
revenue_snapshot_published vl   { period, net_income, dividend_pool }
```

---

## План спринтов

### Sprint AG-1 (Контракт + БД) — только SQL, без UI
**Файлы:**
- `mindshift/supabase/migrations/016_agents_contract.sql`
  - agents, agent_state_log
- `mindshift/supabase/migrations/017_communities.sql`
  - communities, community_memberships
- `mindshift/supabase/migrations/018_crystal_ledger.sql`
  - crystal_ledger (FOCUS+SHARE), shareholder_positions
- `mindshift/supabase/migrations/019_revenue_snapshots.sql`
  - revenue_snapshots (public SELECT, admin INSERT)
- `C:/Projects/VOLAURA/memory/context/ecosystem-agents-contract-v1.md`
  - зафиксировать контракт для обоих проектов

**Критерии готово:** `tsc -b` ✅, миграции применены, RLS настроен

### Sprint AG-2 (v1 закрытой коммуны + базовые агенты)
**Файлы:**
- `mindshift/supabase/functions/community-join/index.ts` — edge function: проверка кристаллов → списание → создание membership → event в character_events
- `mindshift/src/features/community/CommunityJoinFlow.tsx` — минимальный UI входа
- `mindshift/src/features/community/CommunityDashboard.tsx` — внутренняя панель (только для членов)
- ZEUS: seed данных агентов в Supabase через миграцию (5 агентов: mochi/guardian/strategist/coach/scout)

**Критерии готово:** Пользователь может войти в OPEN комьюнити, видит агентов

### Sprint AG-3 (PRO агенты + прозрачная экономика)
**Файлы:**
- `mindshift/supabase/functions/agent-chat/index.ts` — edge function: PRO = Groq, FREE = Gemini
- `mindshift/src/features/economy/EconomyDashboard.tsx` — revenue_snapshots публичная страница
- `mindshift/src/features/economy/ShareholderPanel.tsx` — дивиденды для акционеров
- ZEUS: webhook handler для `agent_helped_user` event

**Критерии готово:** PRO пользователь получает Groq-агента, дашборд показывает снапшот

### Sprint AG-4 (Первый ELITE комьюнити — эксперимент)
**Файлы:**
- Seed: первая ELITE community (10000 SHARE crystals entry)
- `community-join` edge function: проверка SHARE-баланса
- Anonymous badge system: `badge_id` генерация + хранение
- Admin panel: добавление `revenue_snapshot` за первый месяц вручную

**Критерии готово:** 1 тестовый пользователь может войти в ELITE, видит анонимный бейдж

---

## Юридические риски (задокументировано)

| Риск | Уровень | Митигация |
|------|---------|-----------|
| SHARE-кристаллы = security token (SEC/ESMA) | ВЫСОКИЙ | Называть "internal utility credits", не "shares". Нет вывода в фиат на v1. |
| Revenue sharing = dividend (регулируется) | СРЕДНИЙ | "Ecosystem credit redistribution", не "dividend". Только внутри платформы. |
| Fight Club anonymity — злоупотребления | СРЕДНИЙ | Жёсткий audit_log (user_id всегда знаем), только alias публичный |
| $10k entry — финансовые регуляторы | НИЗКИЙ на v1 | v1 в кристаллах, не в фиате. Юрист нужен перед фиат-конверсией. |

---

## Статус
- [ ] Sprint AG-1: SQL миграции — ГОТОВ НАЧАТЬ после approve Yusif
- [ ] Sprint AG-2: Коммуны v1
- [ ] Sprint AG-3: PRO агенты + экономика
- [ ] Sprint AG-4: ELITE эксперимент

**Следующий шаг:** Yusif говорит "go" → начинаю AG-1 SQL
