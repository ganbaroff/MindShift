#!/usr/bin/env bash
# SessionStart(compact) hook — print the LAST context-survival snapshot to stdout.
# stdout becomes visible context for the fresh post-compact instance.
# DEFENSIVE: missing file => still print the reminder line, always exit 0.
set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || SCRIPT_DIR="."
REPO="$(cd "$SCRIPT_DIR/../.." 2>/dev/null && pwd)" || REPO="$(pwd)"
OUT="$REPO/memory/context-survival.md"

if [ -f "$OUT" ]; then
  # Keep only the block from the FINAL "## SNAPSHOT" marker to EOF.
  BLOCK="$(awk '/^## SNAPSHOT/{buf=""} {buf=buf $0 "\n"} END{printf "%s", buf}' "$OUT" 2>/dev/null)"
  if [ -n "$BLOCK" ]; then
    echo "=== last context-survival snapshot ==="
    printf '%s\n' "$BLOCK"
  fi
fi

echo 'ПОСЛЕ КОМПАКТА: прочитай memory/marketing-backlog.md + свежий memory/wip-*.md прежде чем действовать'
exit 0
