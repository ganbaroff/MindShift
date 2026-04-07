# Research: Sharing Claude Code Agents Across the VOLAURA Ecosystem

**Date:** 2026-04-07
**Branch:** `claude/bold-jones`
**Question:** How do teams in 2026 distribute `.claude/agents/*.md` across multiple repos (MindShift, VOLAURA, claw3d, BrandedBy, ZEUS)?
**TL;DR:** **Build a private Claude Code Plugin Marketplace** on a GitHub repo (`volaura/claude-plugins`). This is the official mechanism shipped by Anthropic in late 2025, matured in Feb 2026 with enterprise support, and every other pattern is now legacy. Setup: ~2 hours. Maintenance: 0 after setup.

---

## Context

Current state of agents across the 5-product ecosystem:

| Product | Agents | Quality |
|---------|--------|---------|
| MindShift | 10 files in `.claude/agents/` (canonical) | Working, battle-tested |
| VOLAURA | 39 directories + files — mostly dead copy | Stale |
| claw3d, BrandedBy, ZEUS | 0 | Nothing |

Yusif's 10 canonical agents (from MindShift):
`a11y-scanner`, `build-error-resolver`, `bundle-analyzer`, `code-reviewer`, `e2e-runner`, `growth`, `guardrail-auditor`, `infra`, `liveops`, `sec`.

All 10 are standard Claude Code subagent markdown files — frontmatter (`name`, `description`, `tools`, `model`) + body. Example: `C:/Users/user/Downloads/mindshift/.claude/worktrees/bold-jones/.claude/agents/code-reviewer.md`.

**Goal:** Single source of truth. Change once, propagate everywhere. No copy-paste drift.

---

## Pattern Comparison Matrix

| # | Pattern | Setup | Maint | Cross-OS | Versioning | Survives CC updates | Official |
|---|---|---|---|---|---|---|---|
| 1 | **Claude Code Plugin Marketplace** | 2h | 0 | Yes | SHA-pinned | Yes (native) | **Yes** |
| 2 | Git submodule | 30m | High | Yes | Commit-pinned | Yes | No |
| 3 | Git subtree | 30m | Medium | Yes | Merge-based | Yes | No |
| 4 | Symlink to shared folder | 15m | Medium | **No** (Windows hostile) | None | Unknown | No |
| 5 | Third-party marketplace mirror | 1h | Low | Yes | External | Yes | No |
| 6 | MCP server hosting agents | 3d | High | Yes | Server-side | **No** — architecture mismatch | No |
| 7 | NPM package + postinstall | 1d | Medium | Yes | semver | Fragile | No |
| 8 | GitHub Action daily sync | 4h | Low | Yes | Ref-based | Yes | No |

(CC = Claude Code. "Survives CC updates" = will still work after Anthropic ships new versions.)

---

## Pattern 1 — Claude Code Plugin Marketplace (RECOMMENDED)

### What it is
Anthropic's **native, first-party distribution mechanism** for Claude Code extensions. Shipped in late 2025, expanded with enterprise private marketplaces on **24 Feb 2026**. A "marketplace" is just a GitHub repo containing `.claude-plugin/marketplace.json` — a JSON catalog that lists one or more "plugins". Each plugin bundles any combination of: commands, **agents**, skills, hooks, MCP servers, LSP servers.

### How it works
1. Create a repo `volaura/claude-plugins` with this layout:
```
volaura/claude-plugins/
├── .claude-plugin/
│   └── marketplace.json          # The catalog
└── plugins/
    └── volaura-core/             # Single plugin with all 10 agents
        ├── .claude-plugin/
        │   └── plugin.json
        └── agents/
            ├── a11y-scanner.md
            ├── build-error-resolver.md
            ├── bundle-analyzer.md
            ├── code-reviewer.md
            ├── e2e-runner.md
            ├── growth.md
            ├── guardrail-auditor.md
            ├── infra.md
            ├── liveops.md
            └── sec.md
```

2. `marketplace.json` (the whole thing):
```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "volaura",
  "owner": { "name": "VOLAURA", "email": "ganbarov.y@gmail.com" },
  "metadata": { "description": "Shared Claude Code agents for the VOLAURA ecosystem" },
  "plugins": [
    {
      "name": "volaura-core",
      "source": "./plugins/volaura-core",
      "description": "10 shared agents: a11y, build-fix, bundle, review, e2e, growth, guardrail, infra, liveops, sec",
      "version": "1.0.0",
      "category": "development"
    }
  ]
}
```

3. `plugins/volaura-core/.claude-plugin/plugin.json`:
```json
{
  "name": "volaura-core",
  "description": "Shared agents for MindShift, VOLAURA, claw3d, BrandedBy, ZEUS",
  "version": "1.0.0",
  "author": { "name": "Yusif Ganbarov" }
}
```

4. Each consumer repo (MindShift, VOLAURA, claw3d, BrandedBy, ZEUS) adds this to `.claude/settings.json`:
```json
{
  "extraKnownMarketplaces": {
    "volaura": {
      "source": { "source": "github", "repo": "volaura/claude-plugins" }
    }
  },
  "enabledPlugins": {
    "volaura-core@volaura": true
  }
}
```

5. That's it. Every time a dev opens Claude Code in any of the 5 repos, it auto-prompts to install. After accepting once, agents are always available.

### Installation on developer machines
```bash
/plugin marketplace add volaura/claude-plugins
/plugin install volaura-core@volaura
```

### Private repo support
Works with private GitHub repos. Manual install uses existing `gh auth login` credentials. Auto-update requires `GITHUB_TOKEN` env var. Documented here: https://code.claude.com/docs/en/plugin-marketplaces#private-repositories

### Versioning
Three levels of pinning in `marketplace.json`:
- `"ref": "main"` — always latest
- `"ref": "v1.2.0"` — tagged release (recommended)
- `"sha": "a1b2c3..."` — exact commit

Can run stable/latest release channels by pointing two marketplaces at different refs of the same repo.

### Survives Claude Code updates
**Yes — this is the path Anthropic is investing in.** From the Feb 2026 release: Anthropic expanded it with enterprise private marketplaces, and it is the mechanism Anthropic itself uses for their own 13-plugin official marketplace at `anthropics/claude-plugins-official`.

### Cross-platform
Yes. Claude Code handles clone + cache on all OS (`~/.claude/plugins/cache/`). No symlinks, no path issues.

### Setup time
**2 hours** for the initial marketplace. After that, adding new agents = `git push` to the marketplace repo + `/plugin marketplace update volaura` in consumer repos.

### Maintenance cost
**0.** Updates are automatic when auto-update is enabled (on by default for official, can be enabled per marketplace via UI).

### Real-world evidence
- `anthropics/claude-plugins-official` — Anthropic's own 13-plugin marketplace
- `wshobson/agents` — 75-plugin community marketplace using this exact pattern
- `davepoon/buildwithclaude` — similar community marketplace
- `VoltAgent/awesome-claude-code-subagents` — 100+ agents distributed this way
- Enterprise teams have been running private marketplaces since Feb 2026 (`almcorp.com/blog/claude-cowork-plugins-enterprise-guide`)

### Pros
- First-party. No chance of being deprecated while `.claude/agents/` still works.
- Single install command. No Git complexity for consumers.
- Agents propagate via `git push` to one repo. All 5 products update on next `/plugin marketplace update volaura`.
- Supports adding skills, commands, hooks, MCP configs later without changing the distribution pattern.
- `extraKnownMarketplaces` in `.claude/settings.json` auto-prompts team members.
- Can version-pin per consumer (e.g., ZEUS pins to `v1.0.0`, MindShift tracks `main`).
- Private repos are supported.

### Cons
- Plugins are loaded from a cache directory, so agents can't `../reference-outside` the plugin dir. Not a problem here — agents are self-contained `.md` files.
- Requires Claude Code ≥ the version that shipped plugin support (already stable months ago).
- New team members must trust the repo once. Not automatic on first ever clone until they accept the prompt.

---

## Pattern 2 — Git Submodule

### What it is
`.claude/agents/` in each consumer repo becomes a submodule pointing to `volaura/claude-agents`. Classic git pattern, pre-dates Claude Code.

### Setup
```bash
cd mindshift
git submodule add https://github.com/volaura/claude-agents .claude/agents
git commit -m "Add shared agents submodule"
```

### Pros
- Explicit commit pinning per consumer.
- Works offline after initial clone.
- No new tools.

### Cons
- **Active bug: Claude Code's LS/Grep/Glob tools ignore git submodules** (anthropics/claude-code#7852). The agents would still load (Claude Code reads `.claude/agents/` on boot) but any agent self-discovery is broken.
- **Submodule tax:** every clone needs `git clone --recursive` or `git submodule update --init`. Forgotten → empty directory → confused "agent missing" errors.
- **Branch switching pain:** Switching git branches that have different submodule commits leaves stale files or detached HEADs.
- **No auto-update.** Each consumer must explicitly `git submodule update --remote` and commit the pointer bump.
- Contributors need to learn submodule commands. Well-documented pain point (`blog.timhutt.co.uk/against-submodules`).

### Verdict
**Rejected.** The Claude Code submodule bug alone kills it. Even without it, maintenance burden is too high for a team that prefers autonomy.

---

## Pattern 3 — Git Subtree

### What it is
Subtree copies the full history of `volaura/claude-agents` into each consumer's `.claude/agents/` directory. No pointer — actual files, merged into history.

### Setup
```bash
git subtree add --prefix=.claude/agents https://github.com/volaura/claude-agents main --squash
```

### Pros
- No `.gitmodules`. Clones "just work".
- Other contributors don't need to know subtree exists.
- Branch switching is clean — it's all regular files.

### Cons
- **No auto-update.** Each consumer runs `git subtree pull --prefix=.claude/agents https://... main --squash` manually. 5 products × manual = drift.
- Pushing changes *back* to the source repo from a consumer is awkward (`git subtree push`).
- History becomes messy with many consumers pulling at different times.
- Every consumer still has a local copy. Still drifts if devs forget to pull.

### Verdict
**Rejected.** Solves submodule's clone-complexity problem but leaves the "manual sync" problem. Worse than the Plugin Marketplace in every dimension that matters.

---

## Pattern 4 — Symlink to Shared Folder

### What it is
A single `~/.claude/projects-shared/agents/` directory on each dev's machine. Every consumer repo's `.claude/agents/` is a symlink to it.

### Cross-platform reality
- **macOS/Linux:** `ln -s` works fine.
- **Windows native:** Requires **Developer Mode** (Settings → For developers) OR an elevated shell. Git doesn't enable symlink support by default; you need `git config --global core.symlinks true` per developer.
- **WSL:** Works, but only inside WSL filesystem. Windows side can't read symlinks into WSL2 (`\\wsl$` path).
- **Git with `autocrlf`:** Symlinks get converted to plain text files containing the target path. Broken.

### Pros
- Genuinely zero sync — one folder on disk serves all repos.
- No network calls, no caches.

### Cons
- **Cross-OS is broken.** Yusif's team works on Windows (env shows `win32`). Developer Mode must be enabled on every machine. Git config must be set per dev. This is a per-dev-machine support ticket.
- **Nothing is versioned.** If Yusif edits an agent, every repo gets the change instantly — including the one where it was going to ship as part of a tagged release. No rollback.
- **CI can't use it.** GitHub Actions runners don't have the shared folder. Tests that depend on agents would need to re-create the symlink or copy files at CI-start.
- Not checked into git. A new dev who clones MindShift gets an empty `.claude/agents/`.

### Verdict
**Rejected.** Windows-hostile, zero versioning, breaks CI. Dead on arrival for a Windows-first team.

---

## Pattern 5 — Community Marketplace Mirror (claudefa.st / buildwithclaude / etc)

### What it is
Publish agents to a public third-party registry and consume them from there.

### Verdict
**Rejected on ethics.** VOLAURA agents will reference Yusif's Ecosystem Constitution, ADHD Foundation Laws, and proprietary business rules. They're not open-source material. Publishing to a public marketplace leaks IP.

Even for public agents, these marketplaces all use the **same underlying mechanism as Pattern 1** (the `marketplace.json` schema). So building a private marketplace is literally the same work, with full control and privacy.

---

## Pattern 6 — MCP Server Hosting Agents

### What it is
Build a custom MCP server (e.g. `volaura-agents-mcp`) that exposes each agent as a tool. Any MCP-compatible client connects to it.

### Reality check
- **Architectural mismatch.** MCP tools are for connecting AI to external systems (databases, APIs, file systems). Subagents are instructions executed *inside* a Claude Code session. Wrapping them in MCP means the subagent becomes a tool call that returns text — you lose the specialized context window, tool restrictions (`tools: Read, Grep`), model override (`model: sonnet`), and the whole "Claude spawns a subagent with isolated context" benefit.
- **There are existing MCP servers that delegate to sub-agents** (`dvcrn/mcp-server-subagent`, `steipete/claude-code-mcp`) but they do the opposite of what we want: they expose the *sub-agent runtime* as a tool for other agents to invoke, not as a distribution mechanism for agent definitions.
- **Maintenance:** You'd have to host a server somewhere, deal with auth, auto-start on dev machines, and keep the MCP protocol current as it evolves.
- **Updates:** Each agent change requires a server restart or re-install.

### Verdict
**Rejected.** Solves a different problem. Wrong tool.

---

## Pattern 7 — NPM Package + Post-Install

### What it is
Publish `@volaura/claude-agents` to npm. Each consumer repo adds it as a devDependency. A post-install script copies `node_modules/@volaura/claude-agents/agents/*.md` into `.claude/agents/`.

### Pros
- Semver versioning for free.
- npm registry handles private packages (paid tier).

### Cons
- **Postinstall scripts are a known smell.** npm community has moved away from them because of surprise side effects, security concerns, and `npm install --ignore-scripts` silently breaking the setup.
- **Only JS repos.** VOLAURA is Python (FastAPI). ZEUS is Node. claw3d is Vite/Three.js. If BrandedBy ends up being Python, it won't have `package.json`. The pattern falls apart.
- **Duplication.** Each consumer still has a copy on disk. Drift.
- **Pollutes node_modules.** Unrelated to runtime code.
- Claude Code's official skill distribution docs explicitly recommend **against** postinstall: "skills are not auto-installed on npm install; the consumer runs the installer explicitly, which keeps things transparent and avoids postinstall script surprises" (`gist.github.com/uhyo/e42484189de45c3e1c6f26154c1f2fc0`).

### Verdict
**Rejected.** Assumes everything is JavaScript. It isn't.

---

## Pattern 8 — GitHub Actions Daily Sync

### What it is
Source repo (`volaura/claude-agents`) has a GitHub Action that, on push, opens PRs against the 5 consumer repos with updated agent files. Tools: `Redocly/repo-file-sync-action` is the de-facto option.

### Setup
```yaml
# In volaura/claude-agents/.github/workflows/sync.yml
name: Sync Agents
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 5 * * *'  # daily 5 AM UTC
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: BetaHuhn/repo-file-sync-action@v1
        with:
          GH_PAT: ${{ secrets.VOLAURA_SYNC_TOKEN }}
          CONFIG_PATH: .github/sync.yml
```

Plus a `sync.yml` listing 5 target repos and which files go where.

### Pros
- Works regardless of language (JS/Python/Anything).
- Keeps a copy in each repo so offline dev works.
- PRs let you review changes before they land.

### Cons
- **Every sync opens 5 PRs.** Review fatigue. These PRs will pile up and get auto-merged without inspection.
- **5 copies on disk = 5 sources of drift.** The moment a dev edits `.claude/agents/code-reviewer.md` in MindShift directly, the next sync will either overwrite it (lost work) or create a merge conflict (blocked sync).
- **CI tax.** Each sync run = Actions minutes on 6 repos (1 source + 5 targets).
- **Custom infrastructure.** Now you have a thing to maintain. The sync breaks → Yusif debugs it.
- Auth: Personal access token with `repo` scope on 5 repos. Rotation burden.

### Verdict
**Rejected.** Works but fragile. Pattern 1 achieves the same outcome (single source of truth, propagates everywhere) without the fragility.

---

## Head-to-Head: Plugin Marketplace vs Everything Else

| Criterion | Plugin Marketplace | Best Alternative | Winner |
|---|---|---|---|
| First-party Anthropic support | Yes, actively developed Feb 2026 | — | Plugin |
| Setup time | 2h | 30m (subtree) | Subtree *but* see below |
| Ongoing maintenance | 0 (auto-update enabled) | Manual pulls every consumer | Plugin |
| Single source of truth | Yes — one repo, one `push` | Yes (submodule/subtree) | Tie |
| Survives Claude Code updates | Built into Claude Code itself | External mechanism | Plugin |
| Cross-platform | Yes | Symlink = no, others = yes | Plugin |
| Private repo support | Yes (beta for GitHub) | Yes | Tie |
| Versioning | ref, sha, semver, release channels | Git commit / npm semver | Tie |
| Language-agnostic (works with Python VOLAURA) | Yes | Symlink/submodule yes, npm no | Plugin |
| Can add skills/hooks/commands later without changing distribution | Yes — plugin is the bundle | No, need new mechanism | Plugin |
| Consumer install complexity | 1 line in settings.json → auto-prompt | Multiple steps | Plugin |

**Plugin Marketplace wins on every criterion that matters.**

---

## RECOMMENDATION: Pattern 1 — Private Plugin Marketplace

### Why
1. **First-party.** Anthropic built it. Anthropic uses it. Anthropic expanded it with enterprise private marketplaces in Feb 2026. It is *the* 2026 answer.
2. **Zero maintenance.** Auto-update on. `git push` to source = all 5 products pick up changes on next Claude Code startup.
3. **Language-agnostic.** VOLAURA is Python, MindShift is TypeScript, ZEUS is Node, claw3d is Vite. Plugin Marketplace doesn't care.
4. **Extensible.** Today: 10 agents. Tomorrow: add `.claude/skills/`, `.claude/commands/`, shared MCP config. Same plugin, same distribution, same install command. No migration.
5. **Ecosystem Constitution enforcement.** If an agent must reference Foundation Laws (Law 1: never red, Law 2: energy adaptation, etc.) that live in `C:/Projects/VOLAURA/docs/ECOSYSTEM-CONSTITUTION.md`, the agent lives with them in one repo.
6. **Private.** Repo stays private. Proprietary logic stays proprietary.
7. **Team-ready.** `extraKnownMarketplaces` in consumer `.claude/settings.json` auto-prompts new devs. No manual onboarding.

### Concrete next steps (2 hours total)
1. Create private repo `volaura/claude-plugins` on GitHub.
2. Create the directory structure above (`.claude-plugin/marketplace.json`, `plugins/volaura-core/`).
3. Copy MindShift's 10 canonical agents from `C:/Users/user/Downloads/mindshift/.claude/worktrees/bold-jones/.claude/agents/*.md` into `plugins/volaura-core/agents/`.
4. Write `marketplace.json` + `plugin.json` (templates above).
5. Run `claude plugin validate .` locally to check schema.
6. `git push`.
7. In each of the 5 consumer repos, add `extraKnownMarketplaces` + `enabledPlugins` block to `.claude/settings.json` and commit.
8. Run `/plugin marketplace add volaura/claude-plugins` once per developer machine. Done.
9. Delete the 39 stale agent files from `C:/Projects/VOLAURA/.claude/agents/` (keep the canonical 10 in the marketplace only).

### Future-proofing (later, when more products join)
- Tag releases: `v1.0.0`, `v1.1.0` as agents evolve.
- Pin production repos to tagged versions: `"ref": "v1.0.0"`.
- Keep experimental repos on `main` for early feedback.
- When skills get added, they go in the same plugin — no new distribution to set up.
- If a product needs its own agents (e.g. claw3d needs `three-js-reviewer`), add a second plugin to the same marketplace: `volaura-claw3d`. Consumers opt in via `enabledPlugins`.

---

## Sources

**Official Anthropic docs:**
- [Discover and install prebuilt plugins](https://code.claude.com/docs/en/discover-plugins) — marketplace + install flow
- [Create and distribute a plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) — full schema, private repos, release channels, CLI commands
- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) — Anthropic's own 13-plugin marketplace (proof-of-concept)
- [claude-code demo marketplace](https://github.com/anthropics/claude-code/blob/main/.claude-plugin/marketplace.json) — reference `marketplace.json`
- [Create custom subagents](https://code.claude.com/docs/en/sub-agents) — subagent + plugin distribution

**Enterprise private marketplaces (Feb 24, 2026):**
- [Cowork and plugins for teams across the enterprise](https://claude.com/blog/cowork-plugins-across-enterprise) — announcement
- [Claude Cowork Plugins for Enterprise: Private Marketplaces Guide](https://almcorp.com/blog/claude-cowork-plugins-enterprise-guide/) — private GitHub repo sources, auto-install
- [Anthropic Expands Claude With Enterprise Plugins and Marketplace](https://www.ghacks.net/2026/02/25/anthropic-expands-claude-with-enterprise-plugins-and-marketplace/)

**Community marketplace evidence (all use the same pattern):**
- [wshobson/agents](https://github.com/wshobson/agents) — 75-plugin marketplace
- [davepoon/buildwithclaude](https://github.com/davepoon/claude-code-subagents-collection) — plugin + skill hub
- [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) — 100+ subagents
- [jeremylongshore/claude-code-plugins-plus-skills](https://github.com/jeremylongshore/claude-code-plugins-plus-skills) — 340 plugins + 1367 skills
- [Build with Claude - Plugin Marketplace](https://buildwithclaude.com/)

**Alternative patterns (rejected, for reference):**
- [Reasons to avoid Git submodules](https://blog.timhutt.co.uk/against-submodules/) — submodule pain
- [Claude Code submodule bug](https://github.com/anthropics/claude-code/issues/7852) — LS/Grep/Glob ignore submodules
- [Fixing Git Symlink Issues on Windows](https://sqlpey.com/git/fixing-git-symlink-issues-windows/) — why symlinks fail cross-platform
- [Distributing AI Agent Skills via npm Packages](https://gist.github.com/uhyo/e42484189de45c3e1c6f26154c1f2fc0) — warns against postinstall
- [Repo File Sync Action](https://github.com/Redocly/repo-file-sync-action) — the sync approach

**Related concepts:**
- [Claude Code Skills vs MCP vs Plugins: Complete Guide 2026](https://www.morphllm.com/claude-code-skills-mcp-plugins) — skills work everywhere, plugins are Claude Code specific
- [The Virtual Monorepo Pattern](https://medium.com/devops-ai/the-virtual-monorepo-pattern-how-i-gave-claude-code-full-system-context-across-35-repos-43b310c97db8) — related but different (code context, not agent sharing)
