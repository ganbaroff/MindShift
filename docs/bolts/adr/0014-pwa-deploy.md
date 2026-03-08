# ADR 0014 — PWA Deploy Architecture

**Date:** 2026-03-08
**Bolt:** 4.2 — PWA Deploy + Vercel Prod
**Status:** Accepted

---

## Context

Bolt 4.2 required deploying MindFocus as a production PWA on Vercel, with:
- Correct SPA routing (all paths → `index.html`)
- Security headers (X-Frame-Options, X-Content-Type-Options, basic CSP)
- PWA installability (manifest + service worker + HTTPS)
- Documented environment variables

The existing `vercel.json` had only a rewrite rule with `"destination": "/"`, which is
ambiguous. `public/manifest.json` and `public/icon.svg` existed, but 192px/512px PNG icons
required by Chrome's install prompt were missing. No service worker existed.

---

## Decisions

### 1. Vercel rewrites: destination `/index.html`, not `/`

**Decision:** `"destination": "/index.html"` (explicit).

**Rationale:** While Vercel resolves `/` to `index.html`, explicit paths are unambiguous
and prevent edge cases with future index file changes.

### 2. Vanilla Service Worker (no Workbox / vite-plugin-pwa)

**Decision:** Hand-written `public/sw.js` using the native Cache API. No new npm dependencies.

**Rationale:**
- Constraint: no new npm deps for MVP
- `vite-plugin-pwa` adds ~40 kB gzip and build complexity
- The app's caching needs are simple: pre-cache shell + cache-first for static assets
- Network-only for Supabase/Anthropic (never stale-cache auth or AI responses)

**Trade-off:** Manual cache versioning (`mf-v1`). On each deploy, bump `CACHE_VERSION`
in `public/sw.js` to force cache invalidation. Workbox would automate this — tracked as
future migration if offline needs grow.

### 3. Content Security Policy

**Decision:** CSP applied via `vercel.json` headers (not `<meta>` tag).

```
default-src 'self';
script-src  'self' 'unsafe-inline';
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src    'self' data: https://fonts.gstatic.com;
img-src     'self' data: blob:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com;
worker-src  'self';
manifest-src 'self';
frame-ancestors 'none'
```

**`'unsafe-inline'` for `script-src` and `style-src`:**
- React's inline styles (the `C` token pattern used throughout the app) require `'unsafe-inline'`
  in `style-src`
- Vite's production bundle includes inline script chunks; removing `'unsafe-inline'` would
  require adding a nonce-based CSP (future hardening)
- Tracked: migrate to nonce-based CSP in a dedicated security bolt

**Supabase WebSocket (`wss://*.supabase.co`):** Required for Supabase Realtime subscriptions.

### 4. PNG icons generated from SVG (Python stdlib)

**Decision:** Solid `#6C5CE7` 192×192 and 512×512 PNG icons generated via Python built-in
`zlib`/`struct` modules. No external tools or npm packages required.

**Rationale:**
- Chrome's PWA install prompt requires PNG icons (SVG alone is insufficient on Android)
- The existing `icon.svg` cannot be used as a PWA installable icon on all platforms
- Python is available in the dev environment with no installation needed
- For production: replace with a high-fidelity icon via design tooling before v1.0 launch

**Known limitation:** Icons are solid-color placeholders. Replace with branded artwork
before public launch. The SVG (`icon.svg`) is already well-designed and should be the
source for final PNG exports.

### 5. `VITE_ANTHROPIC_API_KEY` ships to the browser

**Decision:** Accepted for MVP with documented mitigations.

**Rationale:** The app calls Anthropic API directly from the client (no server proxy).
This is a known security trade-off:
- Use a restricted-scope key with usage limits in the Anthropic Console
- Rotate immediately if leaked
- Future: add a Vercel Edge Function proxy to keep the key server-side (separate bolt)

Documented in `docs/env.example`.

---

## Consequences

**Positive:**
- PWA installable on Chrome/Android/Safari (manifest + SW + HTTPS + icons)
- SPA routing works for all paths (deep links, refresh)
- Basic security headers reduce XSS/clickjacking attack surface
- No new npm dependencies (bundle delta ≤ +3 kB gzip)

**Negative / Known Limitations:**
- `'unsafe-inline'` weakens CSP (future: nonce-based)
- PNG icons are placeholder solid color (future: branded artwork)
- SW cache versioning is manual (future: vite-plugin-pwa or Workbox)
- Anthropic API key is client-exposed (future: Edge Function proxy)
