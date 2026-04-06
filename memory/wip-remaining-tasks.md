# WIP: Remaining tasks from 2026-04-06 session
# READ THIS FIRST if context compressed

## Done already
- [x] ecosystem-map.md created + committed + pushed (VOLAURA a5b1165)
- [x] architecture_state.md updated to v8 (VOLAURA a5b1165)
- [x] autonomous_run.py — Ecosystem Auditor + ecosystem-map loading (VOLAURA a5b1165)
- [x] claw3d-fork/CLAUDE.md created + pushed (claw3d f8ca41c)
- [x] Prompt for other chat written: claw3d-fork/memory/prompt-for-volaura-chat.md
- [x] Memory files saved (feedback_document_not_chat, feedback_breadcrumb_pattern, handoff-2026-04-06)

## TODO now (user said "всё")
1. **Rewrite MindShift CLAUDE.md around Constitution** ✅ DONE
   - Added: Ecosystem Context (5 products table), Foundation Laws compliance table,
     Crystal Economy reference, Working Protocol (CEO rules + breadcrumb pattern + cross-product)
   - Sprint history kept but moved below the Constitution frame
   - File: C:/Users/user/Downloads/mindshift/.claude/worktrees/bold-jones/CLAUDE.md

2. **Update current_gaps.md** ✅ DONE (VOLAURA f159509)
   - Added 4 ecosystem gaps: E-1 code-index, E-2 Law 2, E-3 Constitution branch, E-4 Ollama
   - Closed 2 gaps: ecosystem-map.md, architecture_state ZEUS

3. **GitHub Action for code-index auto-rebuild** ✅ DONE (VOLAURA f159509)
   - Found: session-end.yml ALREADY rebuilds code-index on push to main
   - Fix: added `docs/**` to path triggers (was missing → code-index didn't rebuild when only docs changed)
   - No new workflow needed — existing one now covers more cases

## CEO directives active
- Конституция = приоритет над всем
- Документируй в файлы, не в чат
- Breadcrumb паттерн: заметка → работа → чекпоинты → финальная доку
- Не симулируй. Не ври. Спрашивай если не уверен.
