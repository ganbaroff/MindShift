# Obsidian ↔ Claude Code: MindFlow Workflow

## Структура Obsidian Vault

Синхронизируй Obsidian Vault с папкой репозитория MindFlow.
Тогда всё что пишешь в Obsidian — сразу доступно Claude Code.

```
MindFlow/                   ← git repo root = obsidian vault root
├── CLAUDE.md               ← редактируй в Obsidian, Claude читает
├── journal.txt             ← лог сессий (обновляй после каждой)
├── docs/                   ← заметки = документация
│   ├── architecture.md
│   ├── supabase-rules.md
│   ├── ai-prompts.md
│   ├── payments-az.md      ← M10 + AzeriCard (когда будешь готов)
│   ├── features-backlog.md ← список фич
│   └── decisions.md        ← почему приняты такие решения
├── .claude/
│   ├── skills/             ← скиллы Claude Code
│   │   ├── mindflow-ui/SKILL.md
│   │   ├── mindflow-supabase/SKILL.md
│   │   └── mindflow-ai/SKILL.md
│   └── agents/             ← кастомные агенты
│       ├── ui-reviewer.md
│       └── feature-builder.md
└── src/                    ← React код
```

## Obsidian Plugins (рекомендуемые)

1. **Git** — auto-commit заметок, синхронизация с GitHub
2. **Dataview** — запросы по заметкам как по базе данных
3. **Templater** — шаблоны для скиллов и документации
4. **Commander** — кнопки быстрых действий

## Шаблон для нового SKILL.md

Создай в Obsidian шаблон (Templater):

```markdown
---
name: <% tp.file.title.toLowerCase() %>
description: "<% tp.file.title %> skill. Use when..."
---

# <% tp.file.title %>

## When to use

## Rules

## Examples
```

## Workflow: Добавить новую фичу

```
1. В Obsidian → docs/features-backlog.md
   Опиши фичу: что, зачем, acceptance criteria

2. В Claude Code:
   "Прочитай docs/features-backlog.md и реализуй [фича]"
   Claude видит контекст прямо из твоих заметок

3. После реализации → обнови journal.txt
   Append: дата, что сделано, что осталось

4. /clear в Claude Code перед следующей задачей
```

## Workflow: Обновить дизайн-систему

```
1. В Obsidian → .claude/skills/mindflow-ui/SKILL.md
   Обнови правила, добавь новые компоненты

2. Claude Code автоматически увидит изменения
   (скилл загружается при каждом старте)
```

## MCP подключение Obsidian (опционально)

Если хочешь чтобы Claude читал заметки через MCP:

```json
// .claude/settings.json
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["-y", "mcp-obsidian", "/path/to/your/vault"]
    }
  }
}
```

Тогда можно: "Claude, прочитай мою заметку о M10 интеграции"

## journal.txt формат

```
=== 2026-03-07 ===
SESSION: v4 redesign + Supabase integration
DONE:
  - Replaced mock AI with real Gemini 2.0 Flash
  - Added Supabase persistence (thoughts table)
  - Applied UI/UX Pro Max checklist
FILES CHANGED: mindflow-v4.jsx, supabase-setup.sql
NEXT:
  - TypeScript migration
  - Split into /features architecture
  - PWA setup
KEYS USED: Supabase publishable, Gemini API

=== 2026-03-08 ===
...
```
