---
name: perf-audit
description: "Web performance audit for React PWAs. Use when: bundle size growing, app feels slow, Lighthouse score needs improvement, Core Web Vitals analysis, lazy loading audit, image optimization, code splitting, re-render profiling. Triggers on: 'app is slow', 'bundle size', 'performance', 'Lighthouse', 'Core Web Vitals', 'LCP', 'INP', 'CLS', 'lazy load', 'code split', 'optimize'."
version: "1.0"
updated: "2026-03-09"
---

# Performance Audit — React PWA

Structured performance audit for production React + Vite apps.

---

## 1. Quick Diagnostics

Run these first to get a baseline:

```bash
# Bundle analysis
npm run build && npx vite-bundle-analyzer dist/stats.html

# TypeScript (catches tree-shaking issues via unused imports)
npx tsc --noEmit

# Lighthouse CLI (headless)
npx lighthouse https://your-app.vercel.app --output=html --output-path=lighthouse.html \
  --preset=mobile --throttling-method=simulate

# Bundle size breakdown
npx bundlephobia-cli package-name  # for any dependency
```

---

## 2. Core Web Vitals Targets

| Metric | Good | Needs work | Poor | MindShift target |
|--------|------|------------|------|-----------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5–4s | > 4s | < 2s |
| **INP** (Interaction to Next Paint) | < 200ms | 200–500ms | > 500ms | < 150ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1–0.25 | > 0.25 | < 0.05 |
| **FCP** (First Contentful Paint) | < 1.8s | 1.8–3s | > 3s | < 1.5s |
| **TTI** (Time to Interactive) | < 3.8s | 3.8–7.3s | > 7.3s | < 3s |

---

## 3. Bundle Audit Framework

### What to look for

```
dist/
├── index-[hash].js     ← should be < 30 kB gzip (app code only)
├── vendor-react.js     ← ~42 kB gzip (unavoidable)
├── vendor-motion.js    ← ~30 kB gzip (Framer Motion)
├── vendor-supabase.js  ← ~18 kB gzip
├── vendor-dnd.js       ← ~12 kB gzip (dnd-kit — lazy if possible)
└── ...
```

**Red flags:**
- Any chunk > 100 kB gzip (should be split)
- Icons from lucide-react not tree-shaken (import `{ X }` not `import * as`)
- `moment.js` anywhere (replace with `date-fns` or native Intl)
- Lodash as full import (use `lodash-es` or import individual functions)
- Uncompressed images > 100 kB

### MindShift-specific chunk strategy (from `vite.config.ts`):
```ts
manualChunks: {
  'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
  'vendor-motion':   ['motion/react'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-query':    ['@tanstack/react-query'],
  'vendor-ui':       ['zustand', 'sonner', 'lucide-react'],
  'vendor-dnd':      ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
}
```

---

## 4. React Re-render Profiling

```tsx
// Quick: add to component to count renders
let renderCount = 0
function MyComponent() {
  console.log('renders:', ++renderCount) // remove before ship
}

// Better: React DevTools Profiler
// Flamegraph → look for unexpected gray bars (re-renders without visual change)

// Common culprits:
// 1. Object/array literals in JSX props → useMemo/useCallback
// 2. Context with large value object → split into smaller contexts
// 3. Zustand: useStore(s => s) selects entire store → use specific selector
// 4. useStore without selector causes all-store re-renders
```

**MindShift patterns:**
```tsx
// ❌ Re-renders on ANY store change
const everything = useStore()

// ✓ Only re-renders when nowPool changes
const nowPool = useStore(s => s.nowPool)

// ✓ Multiple values with shallow equality
const { nowPool, nextPool } = useStore(
  s => ({ nowPool: s.nowPool, nextPool: s.nextPool }),
  shallow
)
```

---

## 5. Lazy Loading Audit

```tsx
// Screens that should be lazy-loaded (not in main bundle):
const ProgressScreen  = lazy(() => import('./features/progress/ProgressScreen'))
const SettingsScreen  = lazy(() => import('./features/settings/SettingsScreen'))
const AudioScreen     = lazy(() => import('./features/audio/AudioScreen'))
const OnboardingFlow  = lazy(() => import('./features/onboarding/OnboardingFlow'))

// Critical path (do NOT lazy-load):
// - AuthScreen (shown to all unauthenticated users)
// - HomeScreen (first screen after auth)
// - TasksScreen (primary tab)

// Wrap in Suspense with fallback:
<Suspense fallback={<LoadingScreen />}>
  <ProgressScreen />
</Suspense>
```

---

## 6. Image Optimization

```bash
# Check all images
find public/ -name "*.png" -o -name "*.jpg" | while read f; do
  size=$(stat -c%s "$f")
  echo "$size bytes: $f"
done | sort -n -r
```

**Rules:**
- PNG icons: must be compressed (use `pngquant` or `oxipng`)
- Photos: use WebP with PNG fallback
- SVGs: inline in JSX for icons (Lucide does this) — no external SVG requests
- App icons (192px, 512px): compress but don't sacrifice quality — store stores them

---

## 7. Audio Performance (MindShift-specific)

AudioWorklet is off the main thread — no jank risk. But:

```ts
// ✓ AudioContext lazy initialization (on first user gesture)
// AudioContext must be created in response to user interaction (browser policy)
// Check: is AudioContext created on component mount or on button press?

// ✓ Crossfade duration: 1.5s is correct (prevents click)
// ✗ Watch for: creating new AudioContext on every preset change (expensive)
// ✓ Should reuse single AudioContext, just swap nodes
```

---

## 8. Service Worker Audit

```bash
# Check what's cached
# DevTools → Application → Cache Storage → workbox-precache

# Check SW size
ls -lh dist/sw.js dist/workbox-*.js
```

**Rules:**
- Precache: HTML, CSS, JS, icons only — NOT audio (generated by AudioWorklet)
- Runtime cache: Supabase API calls with StaleWhileRevalidate strategy
- Offline fallback: `/offline.html` for navigation requests
- SW update: `registerType: 'autoUpdate'` = silent update on next page load

---

## 9. Database Query Performance (Supabase)

```sql
-- Check slow queries in Supabase Dashboard → Database → Slow Query Log

-- Common issues:
-- 1. Missing index on tasks.user_id (should be indexed — check 001_init.sql)
-- 2. Missing index on focus_sessions.user_id + started_at (range queries)
-- 3. N+1: fetching tasks then achievements separately → join them

-- Verify RLS doesn't kill performance:
EXPLAIN ANALYZE SELECT * FROM tasks WHERE user_id = 'uuid-here';
-- Should use index scan, not seq scan
```

---

## 10. Audit Output Format

```markdown
## Performance Audit: [Date]

### Bundle Analysis
- Total gzip: X kB (baseline: 98 kB)
- Largest chunks: [list]
- Issues: [list]

### Core Web Vitals (Mobile, Simulated 4G)
- LCP: Xms [PASS/FAIL]
- INP: Xms [PASS/FAIL]
- CLS: X [PASS/FAIL]

### Re-render Hotspots
- [Component]: [issue] → [fix]

### Lazy Loading
- Missing lazy imports: [list]
- Unnecessary lazy imports: [list]

### Quick Wins (< 2 hours each)
1. [action] → expected gain
2. ...

### Verdict: ✅ PASS / ⚠️ NEEDS FIXES / ❌ FAIL
```
