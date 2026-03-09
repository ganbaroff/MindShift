import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // jsdom: required for localStorage (offlineQueue) and Zustand persist
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    // Playwright E2E tests live in e2e/ — exclude from Vitest
    exclude: ['e2e/**', 'node_modules/**'],
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
