#!/usr/bin/env bash
# PreCompact hook — dump a ~10-line state snapshot to memory/context-survival.md
# so the post-compact instance knows where work stood.
# DEFENSIVE: missing files / no git => graceful no-op, always exit 0.
set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || SCRIPT_DIR="."
REPO="$(cd "$SCRIPT_DIR/../.." 2>/dev/null && pwd)" || REPO="$(pwd)"

OUT="$REPO/memory/context-survival.md"
mkdir -p "$REPO/memory" 2>/dev/null || true

# One-time header
if [ ! -f "$OUT" ]; then
  printf '# Context Survival Log\n\n> Auto-appended by the PreCompact hook. Newest snapshot = LAST block.\n> Post-compact instance: read the last block, then marketing-backlog + newest wip.\n' >> "$OUT" 2>/dev/null || true
fi

NOW="$(date '+%Y-%m-%d %H:%M:%S' 2>/dev/null)"
[ -z "$NOW" ] && NOW='(no date)'

GIT_LAST="$(git -C "$REPO" log -1 --oneline 2>/dev/null)"
[ -z "$GIT_LAST" ] && GIT_LAST='(no git / no commits)'

GIT_STATUS="$(git -C "$REPO" status --porcelain 2>/dev/null | head -5)"
[ -z "$GIT_STATUS" ] && GIT_STATUS='(clean tree)'

WIP="$(ls -t "$REPO"/memory/wip-*.md 2>/dev/null | head -1)"
if [ -n "$WIP" ]; then WIP="$(basename "$WIP")"; else WIP='(no wip file)'; fi

{
  echo ''
  echo "## SNAPSHOT $NOW"
  echo "- last commit: $GIT_LAST"
  echo "- newest wip:  $WIP"
  echo "- dirty files (top 5):"
  printf '%s\n' "$GIT_STATUS" | sed 's/^/    /'
  echo "- after compact: read memory/marketing-backlog.md + newest memory/wip-*.md before acting"
} >> "$OUT" 2>/dev/null || true

exit 0
