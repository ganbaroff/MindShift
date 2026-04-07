# WIP: Telegram live execution — proposals that actually run

## Problem
CEO taps ✅ → status changes in JSON → "CTO получит решение при следующей сессии"
Nothing actually happens. Бутафория.

## What should happen
CEO taps ✅ → GitHub Actions workflow triggers → coordinator runs task → code committed → CEO notified

## Implementation
1. Add `execute` callback to proposals (not just act/dismiss/defer)
2. On execute: call GitHub API workflow_dispatch with proposal content
3. swarm-daily.yml already accepts coordinator mode + --task param
4. After workflow completes: Telegram notification with results

## Files to change
- telegram_webhook.py: add execute button + GitHub dispatch call
- swarm-daily.yml: already supports coordinator mode (done in previous session)
