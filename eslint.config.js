import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Ignore build output, Playwright E2E (not React code), Android build artifacts, and worktree copies
  globalIgnores(['dist', 'e2e/**', 'android/**', '.claude/worktrees/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // Only the two battle-tested react-hooks rules.
      // v7 added experimental React-Compiler rules (purity, refs,
      // static-components, set-state-in-effect) that flag valid patterns
      // like Math.random() in Framer Motion props and setState-in-effect
      // for localStorage reads. Disable those until the project opts in.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
