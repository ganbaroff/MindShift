---
name: WIP — Ecosystem Agents Contract
description: Breadcrumb для Sprint AG-1→AG-5 (агенты + коммуны + экономика)
type: project
---

# WIP: Ecosystem Agents Contract — ЗАВЕРШЁН

**HEAD MindShift:** e2e0db9
**Статус:** ВСЕ СПРИНТЫ ДОСТАВЛЕНЫ — production deploy pending

---

## Что сделано

### Sprint AG-1 — SQL + контракт (016-022 миграции) ✅
- agents, agent_state_log, communities, community_memberships
- crystal_ledger (FOCUS+SHARE), shareholder_positions, revenue_snapshots
- seed 5 агентов (mochi/guardian/strategist/coach/scout)
- seed ELITE community, llm_policy column

### Sprint AG-2 — Коммуны v1 ✅
- CommunityScreen.tsx — agents list + discover + membership
- AgentCard, CommunityCard, MembershipCard, AliasJoinModal, AgentChatSheet
- community-join edge function — atomic join with crystal debit
- useCommunity hook — data fetching + join flow

### Sprint AG-3 — PRO агенты + экономика ✅
- agent-chat edge function — LLM router (policy-based: ultra_fast/balanced/max_quality)
- EconomyDashboard.tsx — revenue snapshots + crystal rules
- ShareholderPanel.tsx — dividend positions
- publish-revenue-snapshot edge function

### Sprint AG-4 — ELITE эксперимент ✅
- Migration 020: seed Foundation Club (ELITE, 10000 crystals)
- AliasJoinModal — anonymous badge system
- distribute_dividends RPC function

### Sprint AG-5 — LLM policy routing ✅
- Migration 022: llm_policy column on agents
- _shared/llm.ts — POLICY_CHAINS (ultra_fast/balanced/max_quality)
- resolveChain(policy, userTier) — budget cap для free users
- agent-chat upgraded to use policy-based routing

### I18n + Navigation ✅
- 36 community.* keys + 20 economy.* keys в 5 локалях (en/ru/de/es/az)
- BottomNav: Globe icon → /community (6-й таб)
- E2E: 20/20 passing (workers=1)

---

## Что осталось (production deploy)

- [ ] `supabase db push` — применить миграции 016-022 в prod
- [ ] `supabase functions deploy` — задеплоить все edge functions
- [ ] Установить secrets в Supabase Dashboard:
  - GROQ_API_KEY
  - NVIDIA_API_KEY
  - OPENROUTER_API_KEY
  - CEREBRAS_API_KEY
  - LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY
  - DEEPSEEK_API_KEY
  - ADMIN_EMAIL (для publish-revenue-snapshot)
- [ ] Обновить CLAUDE.md с архитектурой Sprint AG

---

## Следующие приоритеты (после deploy)

1. Проверить community-join в prod (test join OPEN community)
2. Добавить первый revenue_snapshot вручную (admin)
3. Watcher для ZEUS событий: agent_state_log обновления
