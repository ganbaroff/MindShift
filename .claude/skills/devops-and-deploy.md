# Skill: devops-and-deploy

> Read this file before deploying, modifying the build pipeline, touching `vercel.json`,
> or making changes that affect bundle size or PWA behaviour.

---

## Local Development

```bash
npm run dev       # Vite dev server on http://localhost:5173 with HMR
npm run build     # Production build → dist/
npm run preview   # Serve dist/ locally on http://localhost:4173
```

- Always run `npm run build` at the end of every bolt — never ship a bolt that fails build
- `npm run preview` is useful for testing PWA behaviour (service worker, manifest)
- Hot Module Replacement (HMR) is on by default — no manual refreshes needed

---

## Deployment — Vercel

The app deploys to Vercel automatically on push to `main`.

### `vercel.json` Configuration

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This enables client-side routing (React handles all routes). Never remove this rewrite or
the app will return 404 on direct URL access.

### Environment Variables (Vercel Dashboard)

Set these in Project → Settings → Environment Variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_SUPABASE_URL` | ✅ | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Public anon key |
| `VITE_GEMINI_API_KEY` | ✅ | AI features |

Never add secret keys (service role, admin tokens) as Vercel environment variables for
the frontend project — they would be bundled into the client JavaScript.

---

## PWA Configuration

The PWA manifest is at `public/manifest.json`. Required fields:

```json
{
  "name": "MindFocus",
  "short_name": "MindFocus",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0d0d0d",
  "theme_color": "#6c5ce7",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

If you change the app name or accent color (`C.accent`), update both `manifest.json`
and the `theme_color` meta tag in `index.html`.

### Service Worker

The service worker caches critical assets for offline use. When adding new static assets
(fonts, icons), make sure they are included in the cache list.

The service worker file is at `public/sw.js` (to be created as a dedicated bolt when
offline support is prioritised).

---

## INVARIANT 7 — Logging

Every error that reaches the user must be logged. The logging utility:

```js
// src/shared/lib/logError.js
export function logError(context, error, meta = {}) {
  console.error(`[MindFocus] ${context}:`, error, meta);
  // Future: send to Sentry / LogRocket here
}
```

**Rules:**
- `context` format: `"ComponentName.operationName"` — e.g., `"DumpScreen.callAI"`
- Never use `console.error` directly in feature files — always use `logError`
- Never swallow errors in an empty catch block
- `meta` object: include only non-sensitive context (userId is OK; email/text is not)

---

## Bundle Size Management

Current budget: **< 500 kB gzipped initial JS**.

Check bundle size after any new `npm install`:

```bash
npm run build
# Look for: dist/assets/index-<hash>.js — check size
```

### Rules

- No moment.js — use `date.js` utilities or native `Date`
- No lodash — write the util inline or in `shared/lib/`
- No UI component libraries (MUI, Ant Design) — we use inline styles
- Icons are hand-rolled SVG in `shared/ui/icons.jsx` — no icon library
- Google Fonts loaded via CSS `@import` — already deferred by the browser

### Lazy Loading

Heavy screens should be code-split:

```jsx
const PricingScreen = lazy(() => import("./shared/ui/ProBanner.jsx"));
```

Priority order for lazy-loading: PricingScreen → EveningScreen → settings panels.

---

## CI Pipeline (Planned)

When a CI workflow is added, it must run:

```yaml
steps:
  - run: npm ci
  - run: npm run build          # must pass
  - run: npm run lint           # if eslint is configured
  - run: node scripts/check-mindflow-size.js   # < 600 lines guard
```

The `check-mindflow-size.js` script (to be written) reads `src/mindflow.jsx` and fails
the build if it exceeds 600 lines.

---

## Deployment Checklist

Before merging a PR to `main`:

- [ ] `npm run build` passes locally
- [ ] `npm run preview` — smoke test all 4 tabs
- [ ] Environment variables confirmed in Vercel dashboard
- [ ] `vercel.json` rewrites still present
- [ ] PWA manifest valid (`manifest.json` has name, icons, start_url, display)
- [ ] No sensitive data in committed files (`.env`, API keys, user data)
- [ ] `CLAUDE.md` updated if architecture changed

---

## Rollback Procedure

If a production deployment breaks the app:

1. Go to Vercel → Deployments
2. Find the last working deployment
3. Click "Redeploy" on that deployment
4. Fix the issue in a new branch, never directly on main
