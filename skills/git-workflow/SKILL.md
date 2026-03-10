---
name: git-workflow
description: "Git workflow management for solo and small-team projects. Use for: creating branches, writing commit messages, managing PRs, resolving merge conflicts, git history cleanup, release tagging, and git best practices. Triggers on: 'commit', 'branch', 'PR', 'merge', 'git', 'release', 'tag', 'changelog', 'what branch', 'push'."
version: "1.0"
updated: "2026-03-09"
---

# Git Workflow

Opinionated git workflow for shipping solo and small-team projects cleanly.

---

## 1. Branch Strategy

```
main                    ← production, always deployable
  └── fix/mobile-ux-bugs     ← current active branch (MindShift)
  └── feat/[feature-name]    ← new features
  └── fix/[issue-description] ← bug fixes
  └── chore/[task]           ← dependencies, tooling, docs
  └── hotfix/[critical-fix]  ← emergency production fixes
```

**Rules:**
- Never commit directly to `main`
- Branch names: lowercase, hyphens, no spaces, descriptive
- Delete branches after merging

---

## 2. Commit Message Convention (Conventional Commits)

Format: `<type>(<scope>): <description>`

```
feat(tasks): add AI decomposition for complex tasks
fix(focus): correct timer drift when app is backgrounded
fix(a11y): add role=dialog and focus trap to AddTaskModal
chore(deps): update supabase-js to 2.98
docs(adr): add ADR-003 for variable ratio XP design
refactor(store): split monolithic store into slice files
test(xp): add unit tests for VR XP calculation
style(tokens): replace hardcoded colors with design tokens
perf(bundle): lazy-load ProgressScreen and SettingsScreen
```

**Types:**
| Type | When to use |
|------|-------------|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `fix(a11y)` | Accessibility fix |
| `fix(ux)` | UX copy or interaction fix |
| `chore` | Tooling, deps, build |
| `docs` | Documentation only |
| `refactor` | Code restructure, no behavior change |
| `test` | Add or fix tests |
| `style` | Formatting, tokens (no logic change) |
| `perf` | Performance improvement |
| `revert` | Revert a previous commit |

**Co-author template:**
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## 3. Before Every Commit Checklist

```bash
# 1. TypeScript — zero errors
npx tsc --noEmit

# 2. Tests (if not broken by Windows rollup issue)
# npm run test

# 3. What am I actually staging?
git diff --staged

# 4. Am I on the right branch?
git branch --show-current

# 5. Stage specific files (never git add -A blindly)
git add src/features/focus/FocusScreen.tsx src/shared/lib/tokens.ts
```

---

## 4. Commit Size Guidelines

**Each commit should:**
- Do one logical thing
- Leave the codebase in a working state
- Have a message that explains WHY, not just what

**Split these into separate commits:**
- Feature code vs. its tests
- Bug fix vs. unrelated cleanup
- Multiple unrelated bug fixes
- Code changes vs. documentation

**OK to combine in one commit:**
- A component + its types
- A fix + the test that proves it
- Related accessibility fixes across multiple files

---

## 5. Tagging Releases

```bash
# Semantic versioning: MAJOR.MINOR.PATCH
# MAJOR: breaking change
# MINOR: new feature, backward compatible
# PATCH: bug fix

git tag -a v0.1.0-beta -m "Beta release — full QA audit complete"
git push origin v0.1.0-beta

# List tags
git tag --list

# Show what's in a tag
git show v0.1.0-beta
```

---

## 6. Common Recovery Operations

```bash
# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Undo last commit (keep changes unstaged)
git reset HEAD~1

# Discard all uncommitted changes (DESTRUCTIVE)
git checkout -- .

# Remove a file from staging
git restore --staged src/file.tsx

# Fix commit message before pushing
git commit --amend -m "fix(focus): correct timer drift"
# Only if not yet pushed!

# Stash WIP before switching branches
git stash push -m "WIP: refactoring focus screen"
git stash pop  # to restore

# Remove a stale lock file
rm .git/index.lock  # if git is stuck

# Find what changed between two commits
git diff v0.1.0..HEAD --stat
```

---

## 7. MindShift-Specific Notes

**Current branch:** `fix/mobile-ux-bugs`
**Build constraint:** `npm run build` requires Linux/Mac (rollup binary). `tsc --noEmit` works on Windows.
**CI status:** Not yet set up (TD-002) — run `tsc --noEmit` manually before push.

**Recommended release flow:**
1. `npx tsc --noEmit` — must pass
2. Commit with conventional commit message
3. Push to `fix/mobile-ux-bugs`
4. When ready to merge to main: squash and merge
5. Tag: `git tag -a v[version]` with release notes
6. Vercel auto-deploys from main

---

## 8. Changelog Format

```markdown
# Changelog

## [0.2.0] — 2026-03-15
### Added
- AI task decomposition (decompose-task edge function)
- Variable ratio XP system (Research #5)

### Fixed
- Timer drift when app is backgrounded (visibilitychange handler)
- Safe area padding on iPhone 14 Pro (Dynamic Island)

### Accessibility
- AddTaskModal: role=dialog, focus trap, aria-pressed buttons
- AuthScreen: email input properly labelled

### Performance
- dnd-kit split into separate vendor chunk
- ProgressScreen lazy-loaded

## [0.1.0] — 2026-03-09
### Initial beta release
```
