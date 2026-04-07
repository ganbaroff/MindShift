# CEO Plan Execution — Session 88 continued
# Breadcrumb — READ THIS if context compresses

## P0 Blockers from CEO Prompt v3.0 — STATUS

### 1. E2E path: signup → assessment → AURA → badge → share
STATUS: NOT DONE — this is VOLAURA work (apps/api + apps/web)
THIS SESSION: not in scope (MindShift worktree), but character_events is

### 2. character_events POST on assessment complete
STATUS: NOT DONE — the THALAMUS
WHAT: When MindShift session ends → POST to character_events
WHERE: useFocusSession.ts (session save) → add character_events write
ALSO: crystal earning (1 min = 5 crystals) → character_events

### 3. Energy Picker (Full/Mid/Low before test)
STATUS: EXISTS IN MINDSHIFT (EnergyPicker component)
NOT IN VOLAURA — needs building there

### 4. Pre-Assessment Layer
STATUS: NOT DONE — VOLAURA work

### 5. Life Simulator P0 crashes
STATUS: claw3d-fork — separate work

### 6-8: Later

## What I do NOW (MindShift scope):
1. character_events POST from MindShift sessions → Supabase
2. crystal_earned event when session completes
3. Connect swarm agents to Gemini API properly (key saved)
4. Wire web_search.py + llm_router.py into autonomous_run.py

## Gemini key: saved in .env + GitHub Secrets for both repos
