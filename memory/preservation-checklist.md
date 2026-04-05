# Preservation Checklist — What Must Not Be Lost

**Created:** 2026-04-06
**Purpose:** Track what's saved permanently vs what exists only in chat context

---

## ✅ SAVED (will survive session end)

| What | Where | Status |
|------|-------|--------|
| Research analysis (17 docs) | memory/research-audit.md | ✅ Summaries + findings |
| Research index | docs/research/INDEX.md | ✅ Table of all 17 |
| Mega-plan (42 items) | memory/mega-plan-april-2026.md | ✅ Full plan |
| Ecosystem contracts | memory/ecosystem-contract.md | ✅ API specs |
| Heartbeat protocol | memory/ecosystem-heartbeat-protocol.md | ✅ Sync rules |
| Crystal shop ethics | .claude/rules/crystal-shop-ethics.md | ✅ 8 rules |
| Guardrails | .claude/rules/guardrails.md | ✅ 11 rules |
| CEO tasks | memory/ceo-tasks.md | ✅ 5 overdue |
| Tone rules | memory/tone-rule.md | ✅ Stories > tables |
| Blind spots | memory/blind-spots-cto.md | ✅ Updated |
| Farhad document | Downloads/VOLAURA-for-Farhad-v2.md | ✅ v2 storytelling |
| LinkedIn post text | memory/content-queue (in VOLAURA) | ✅ Hook B |
| LinkedIn carousel PDF | public/linkedin-carousel.pdf | ✅ 5 slides |
| Feature graphic | public/feature-graphic.png | ✅ 2048x1000 |
| VOLAURA CTO prompt | Downloads/volaura-cto-prompt.md | ✅ Full prompt |
| Claw3D handoff | memory/handoff-claw3d.md | ✅ 5 steps |
| Mega handoff | memory/mega-handoff-next-session.md | ✅ Full CTO transfer |

## ❌ NOT SAVED — WILL BE LOST

| What | Risk | Action Needed |
|------|------|---------------|
| **17 original research texts** (~140K words) | HIGH — only summaries exist, not full text | CEO must save originals as files in docs/research/ |
| **6 persona conversations** (Marat/Aigul/Dima/Olga/Artem/Nargiz) | MEDIUM — findings captured in research-audit.md but raw dialogue lost | Create persona-findings.md with key quotes |
| **5 expert panel analysis** (Leila/Denis/Maria/Alex/Kamila) | MEDIUM — findings mentioned but not fully documented | Create expert-panel-findings.md |
| **VidVow analysis** (4-expert panel on absorption) | LOW — decision documented in ecosystem-sync.md | Sufficient |
| **LinkedIn post alternatives** (Hook A/B/C) | LOW — Hook B chosen and saved | Sufficient |
| **Agent upgrade instructions** for VOLAURA CTO | LOW — included in volaura-cto-prompt.md | Sufficient |

## 🔴 CEO ACTION REQUIRED

### Save original research texts
Yusif, ты скидывал 17 исследований в чат как текст. Я сохранил только анализ.
Оригиналы нужно сохранить в `docs/research/` как отдельные файлы:

```
docs/research/01-gen-z-engagement.md
docs/research/02-clinical-ux-audit.md
docs/research/03-burnout-prevention.md
docs/research/04-onboarding-design.md
docs/research/05-market-landscape.md
docs/research/06-sensory-ux.md
docs/research/07-pwa-architecture.md
docs/research/08-age-based-ux.md
docs/research/09-volunteer-frameworks.md
docs/research/10-overjustification.md
docs/research/11-coordinator-experience.md
docs/research/12-multi-model-routing.md
docs/research/13-persistent-memory.md
docs/research/14-agile-ai-teams.md
docs/research/15-volaura-architecture.md
docs/research/16-neurocognitive-mindfocus.md
docs/research/17-ai-assisted-development.md
```

Источник: Gemini Deep Research, ChatGPT, Perplexity — откуда генерировались.
Если файлы потеряны — можно регенерировать с теми же промптами.

## OTHER THINGS I MIGHT HAVE FORGOTTEN

### Checked and confirmed saved:
- [x] CLAUDE.md sprint history — updated through BATCH-Y
- [x] TASK-PROTOCOL.md backlog — all items closed/opened correctly
- [x] All code changes committed and pushed (last: 3d229eb)
- [x] VOLAURA ecosystem files synced (contract, heartbeat, mindshift-state)
- [x] Claw3D fork cloned at Downloads/claw3d-fork

### Things that live only in this chat context:
- Specific agent dialogue (Marat's rant about "30 дюймов", Aigul's tears about "Kiçik addımlar", etc.)
- Naргиз's clinical analysis of RecoveryProtocol (EXEMPLARY rating)
- Artem's pen-test report details
- Dima's "GOAT scale" ratings
- Panel discussions about Groves, crystal sinks, data firewall
- My internal reasoning for architectural decisions

### Potential gaps in VOLAURA project:
- [ ] Did VOLAURA CTO actually commit the Claw3D changes? (he reported 0 commits)
- [ ] Is content-queue/2026-04-08-tuesday-carousel.md still valid? (date may have passed)
- [ ] Are ecosystem-contract copies in sync between both projects?
- [ ] Did CEO publish the LinkedIn post? (was marked "сделано" but need to verify)
