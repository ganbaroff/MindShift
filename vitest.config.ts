import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // jsdom: required for localStorage (offlineQueue) and Zustand persist
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    // Playwright E2E tests live in e2e/ — exclude from Vitest.
    // Also exclude .claude/worktrees/** so sibling worktrees' e2e specs and
    // source files are not picked up by the root vitest run. Worktrees share
    // node_modules via symlink, so their *.spec.ts files importing @playwright/test
    // would otherwise fail to load (63 phantom failures at 8f6c65a).
    exclude: [
      'e2e/**',
      'node_modules/**',
      '.claude/worktrees/**',
    ],
    coverage: {
      include: ['src/shared/lib/**', 'src/store/**'],
      exclude: ['src/shared/lib/supabase.ts'],  // skip side-effectful init
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
