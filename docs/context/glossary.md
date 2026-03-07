# Glossary

Terms used across MindFlow documentation, code, and AI agent prompts.

| Term | Definition |
|---|---|
| **Brain dump** | Raw, unstructured text the user types to externalise all thoughts at once |
| **Thought** | A single parsed item from a brain dump (one row in the `thoughts` table) |
| **Dump** | The act of submitting a brain dump; also the screen where it happens |
| **Bolt** | A single AI-executed micro-iteration: one feature scope, 1–2 days, spec → code → test → log |
| **Sprint** | A collection of bolts over ~1 week; also used as a planning/retro unit |
| **Skeleton** | The `src/skeleton/` layer — human-owned architectural boundaries |
| **Slice** | A vertical feature module in `src/features/<name>/` |
| **Persona** | AI-learned model of a user's behaviour patterns (stored in `personas` table) |
| **Streak** | Count of consecutive days the user has dumped or archived at least one thought |
| **Pro** | Paid subscription tier ($8/mo); unlocks unlimited dumps, sync, export |
| **isPro** | Boolean prop passed to components to gate Pro features |
| **ADR** | Architecture Decision Record — formal log of a significant technical decision |
| **RLS** | Row Level Security — Supabase Postgres feature ensuring users only see their own data |
| **TBD** | Trunk-Based Development — committing small changes directly to `main` |
| **Feature flag** | Boolean in `FLAGS` object that hides incomplete features in production |
| **callClaude** | The base function that makes HTTP requests to the Anthropic API |
| **T object** | The translation dictionary: `T.en`, `T.ru`, `T.az` |
| **C object** | The design token object: colours, used everywhere in inline styles |
| **Evening review** | End-of-day ritual screen with AI-generated compassionate summary |
| **Focus suggest** | AI picking top 3 tasks for the day on the Today screen |
