# Swarm is NOT autonomous — 3 bugs crashing every run

## Bug 1: No module named 'openai'
- WHERE: autonomous_run.py _call_agent() line 397
- WHY: NVIDIA NIM fallback uses openai SDK. Not in pip install.
- FIX: add `openai` to pip install in swarm-daily.yml
- IMPACT: Every agent that tries NVIDIA fails, falls to last resort

## Bug 2: 'list' object has no attribute 'get'
- WHERE: autonomous_run.py _judge_proposal() line 533
- WHY: LLM returns JSON array instead of object. Code does response.get()
- FIX: Handle both list and dict in _judge_proposal parser
- IMPACT: All proposals fail judging

## Bug 3: asyncio.run() cannot be called from a running event loop
- WHERE: autonomous_run.py main() line 893 (suggestion engine)
- WHY: Already in async context, can't nest asyncio.run()
- FIX: Use `await` instead of `asyncio.run()` or `nest_asyncio`
- IMPACT: Suggestion engine crashes (non-blocking but broken)

## Status: swarm runs daily, fails daily. Nobody was watching.
