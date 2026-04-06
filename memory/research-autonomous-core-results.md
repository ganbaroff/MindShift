# Autonomous Core Research Results
# Extracted 2026-04-06 from 18 web searches across 5 categories
# Context: VOLAURA ecosystem (5 products, Supabase + Vercel + Claude Code stack)

---

## Category 1: Agent Orchestration

- **Claude Agent SDK** | https://github.com/anthropics/claude-agent-sdk-typescript | Free (API costs only) | **USE**
  - Why: Official Anthropic SDK. Same tools, agent loop, and context management that power Claude Code. Python + TypeScript. You are already on Claude Code -- this is the native path. Build agents that read files, run commands, search web, edit code autonomously.

- **Ruflo (claude-flow)** | https://github.com/ruvnet/ruflo | Free OSS | **USE**
  - Why: Purpose-built orchestration for Claude multi-agent swarms. Distributed swarm intelligence, RAG integration, native Claude Code integration. npm package `claude-flow`. Directly fits the VOLAURA 44-agent swarm pattern.

- **LangGraph** | https://github.com/langchain-ai/langgraph | Free OSS (LangSmith paid for monitoring) | **LATER**
  - Why: Production-proven (Replit, Uber, LinkedIn, GitLab). Stateful workflows, TypeScript support, 42K+ weekly npm downloads. But adds LangChain dependency layer you don't need since you're already on Claude. Consider only if you outgrow Claude Agent SDK.

- **CrewAI** | https://github.com/crewAIInc/crewAI | Free OSS | **SKIP**
  - Why: Python-only, role-based agent design. Good for prototyping but your stack is TypeScript. No native Claude integration.

- **AutoGen / Semantic Kernel (Microsoft)** | https://github.com/microsoft/semantic-kernel | Free OSS | **SKIP**
  - Why: .NET/Python focused. 27K GitHub stars but Microsoft-centric. Overkill for your stack, adds unnecessary abstraction when Claude Agent SDK does it natively.

- **OpenAI Agents SDK** | https://openai.github.io/openai-agents-python/ | Free OSS | **SKIP**
  - Why: OpenAI-locked. You're on Claude. The Swarm framework was deprecated and replaced by this. No reason to switch ecosystems.

---

## Category 2: Skills & Plugins

- **awesome-claude-code** | https://github.com/hesreallyhim/awesome-claude-code | Free | **USE**
  - Why: Curated list of skills, hooks, slash-commands, agent orchestrators. Source for discovering new automation skills.

- **awesome-agent-skills (VoltAgent)** | https://github.com/VoltAgent/awesome-agent-skills | Free | **ALREADY INSTALLED**
  - Why: Already in your ~/.claude/skills/. 1000+ skills from official dev teams. Supabase, Gemini, Vercel, Stripe, Sentry skills already active.

- **awesome-claude-code-toolkit** | https://github.com/rohitg00/awesome-claude-code-toolkit | Free | **USE**
  - Why: 135 agents, 35 curated skills, 42 commands, 150+ plugins, 19 hooks. Mine it for: auto-fix CI, auto-deploy, auto-review skills.

- **claude-skills (alirezarezvani)** | https://github.com/alirezarezvani/claude-skills | Free | **USE**
  - Why: 220+ skills including engineering, product, compliance, C-level advisory. Pick domain-specific skills for each ecosystem product.

- **MetaSwarm** | https://github.com/dsifry/metaswarm | Free OSS | **LATER**
  - Why: Self-improving multi-agent orchestration. 18 agents, 13 skills, TDD enforcement, quality gates, spec-driven development. Interesting but adds complexity. Evaluate after Claude Agent SDK is working.

- **Auto-Claude** | https://github.com/AndyMik90/Auto-Claude | Free OSS | **LATER**
  - Why: Autonomous multi-session AI coding framework. Handles full SDLC. Worth evaluating for long-running autonomous coding tasks, but Claude Code scheduled tasks already cover most use cases.

---

## Category 3: MCP Servers

- **Supabase MCP** | https://github.com/supabase-community/supabase-mcp | Free | **USE**
  - Why: Direct database access for agents. Query data, manage tables, fetch config. Critical for VOLAURA agents that need to read/write focus_sessions, tasks, user data. Official Supabase community project.

- **Sentry MCP** | https://github.com/getsentry/sentry-mcp | Free | **USE**
  - Why: Official Sentry MCP server. Agents get direct access to issues, errors, stack traces, Seer analysis. Enables autonomous error investigation and fix proposals. You already have Sentry configured in MindShift.

- **Vercel MCP** | https://vercel.com/docs/agent-resources/vercel-mcp | Free | **ALREADY CONNECTED**
  - Why: Already available in your session. Deployment monitoring, build logs, runtime logs. Agents can check deployment status and investigate failures autonomously.

- **GitHub MCP** | Built into Claude Code | Free | **ALREADY AVAILABLE**
  - Why: `gh` CLI already available. PR creation, issue management, code review. No additional MCP needed.

- **Composio** | https://composio.dev | Free tier + paid | **LATER**
  - Why: 1000+ tool integrations with auth handling. Useful if you need agents to interact with Slack, Jira, Google Calendar, etc. But adds a dependency layer. Only adopt when you need integrations beyond Supabase/Vercel/GitHub/Sentry.

---

## Category 4: Memory Systems

- **pgvector (via Supabase)** | https://supabase.com/docs/guides/ai | Free (included in Supabase) | **USE**
  - Why: You already have Supabase. pgvector extension gives you vector search without adding another service. Store agent memory, embeddings, and RAG context in the same database. Zero new infrastructure.

- **Mem0** | https://github.com/mem0ai/mem0 | Free OSS (managed service paid) | **LATER**
  - Why: Purpose-built agent memory layer. Extracts, consolidates, retrieves memories dynamically. 26% accuracy boost in research benchmarks. But adds a new service. Use pgvector first, migrate to Mem0 if memory needs outgrow simple vector search.

- **Claude Code memory/ directory** | Already in repo | Free | **ALREADY IN USE**
  - Why: Your breadcrumb pattern (memory/wip-*.md) is already working. This is your immediate-term memory system. Combine with pgvector for long-term persistence.

- **ChromaDB** | https://github.com/chroma-core/chroma | Free OSS | **SKIP**
  - Why: Good for local prototyping but you already have pgvector via Supabase. Adding ChromaDB means another service to maintain.

- **Pinecone** | https://pinecone.io | Free tier, paid at scale | **SKIP**
  - Why: Managed vector DB. Good product but unnecessary when Supabase pgvector is free and already in your stack.

---

## Category 5: Autonomous CI/CD

- **Claude Code Scheduled Tasks** | Built-in (/loop, /schedule, CronCreate) | Free | **USE**
  - Why: Already available in your Claude Code session. Run agents on cron schedules as background workers. Auto-run tests, auto-check builds, auto-deploy. No new tools needed.

- **GitHub Copilot Coding Agent** | https://docs.github.com/en/copilot/concepts/agents/coding-agent | $10-39/mo | **SKIP**
  - Why: Creates autonomous PRs for issues. Interesting but you're already on Claude Code which does this better with full repo context. No need to pay for a second AI coding agent.

- **GitHub Agentic Workflows** | https://github.github.com/gh-aw/ | Free (GitHub Actions minutes) | **USE**
  - Why: Official GitHub feature. Automate repository tasks with AI agents triggered by GitHub Actions. Wire Claude Code as the agent behind workflows for auto-fix on CI failure.

- **n8n** | https://github.com/n8n-io/n8n | Free OSS (self-hosted) | **LATER**
  - Why: Visual workflow automation with native AI capabilities. 400+ integrations. Self-hostable. Useful for cross-product orchestration (VOLAURA <-> MindShift <-> ZEUS). But adds infrastructure. Evaluate after core agents are working.

- **Elastic CI/CD + Claude** | https://www.elastic.co/search-labs/blog/ci-pipelines-claude-ai-agent | Free pattern | **LATER**
  - Why: Self-correcting monorepo CI pipelines using Claude as the auto-fix agent. Good pattern but implement with GitHub Actions + Claude Code first.

---

## DO THIS WEEK (ordered by impact)

1. **Install Supabase MCP server** in Claude Code settings. Gives all agents direct database access for VOLAURA + MindShift. Zero cost, immediate value. One config change.

2. **Install Sentry MCP server** in Claude Code settings. Agents can autonomously find and fix production errors. You already have Sentry DSN configured. One config change.

3. **Set up Claude Code scheduled task for CI health check.** Use CronCreate to run `tsc -b && npm run build` every few hours. Auto-detect regressions. Already built into Claude Code, just needs a prompt.

4. **Enable pgvector on Supabase** for agent memory. Run `CREATE EXTENSION IF NOT EXISTS vector;` in Supabase SQL editor. Create an `agent_memory` table with embedding column. Your agents can then persist and search context across sessions.

5. **Browse awesome-claude-code-toolkit** (https://github.com/rohitg00/awesome-claude-code-toolkit) and install 3-5 skills for: auto-fix build errors, auto-review PRs, auto-deploy. Cherry-pick what fits the VOLAURA ecosystem, don't install everything.

---

## What NOT to do

- Do NOT add LangChain/LangGraph. You don't need the abstraction layer when Claude Agent SDK exists.
- Do NOT add a separate vector database (ChromaDB, Pinecone, Weaviate). Use pgvector in Supabase.
- Do NOT pay for Devin ($500/mo). Claude Code + scheduled tasks covers autonomous coding.
- Do NOT install CrewAI or AutoGen. They're Python-focused and you're TypeScript.
- Do NOT add n8n or Composio yet. Get the core agents working first with native tools.
