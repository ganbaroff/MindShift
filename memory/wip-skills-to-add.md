# Skills & tools to research/add

## Already have (global ~/.claude/skills/)
- supabase-postgres-best-practices
- vercel-react-best-practices
- vercel-web-design-guidelines
- gemini-api-dev
- stripe-best-practices
- sentry-code-review / sentry-commit
- cloudflare-web-perf
- expo-building-native-ui / expo-deployment

## Already have (project .claude/)
- humanizer, build-fix, e2e, code-review, guardrails, verify, tdd, bundle-check
- playwright-test (just created)

## Should research & add:
1. **lighthouse-runner** — PWA audit (LCP/FID/CLS). We're a PWA, should auto-audit
2. **accessibility-checker** — WCAG scanning. Constitution Law 4, we need automated a11y
3. **ci-debugger** — CI pipeline debugging. Our CI is currently broken
4. **bundle-analyzer** — already have bundle-check but dedicated skill might be better
5. **i18n linter** — we have 6 locales, no automated check for missing keys
6. **Playwright MCP server** — @playwright/mcp from Microsoft, different from skill. Direct browser control
7. **agentsys** — workflow automation. Could help with autonomous PR review

## Sources
- https://github.com/rohitg00/awesome-claude-code-toolkit (135 agents, 35 skills)
- https://github.com/ComposioHQ/awesome-claude-skills (curated list)
- https://github.com/hesreallyhim/awesome-claude-code (skills, hooks, commands)
- https://github.com/lackeyjb/playwright-skill (playwright skill)
