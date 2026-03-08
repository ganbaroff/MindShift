# Bolt 4.2 — PWA Deploy + Vercel Prod

**Date:** 2026-03-08
**Branch:** `claude/bolt-4-2`
**Status:** Complete

---

## Goal

Deploy MindFocus as a production-ready PWA on Vercel:
correct SPA routing, security headers, installable manifest, service worker with
offline fallback, and documented environment variables.

---

## Files Changed (10 total)

### New files (6)
- `public/sw.js` — Vanilla service worker (cache-first static, network-only API, offline fallback)
- `public/offline.html` — Offline fallback page (dark theme, ADHD-friendly copy)
- `public/icon-192.png` — 192×192 PWA icon (purple `#6C5CE7`, Python-generated placeholder)
- `public/icon-512.png` — 512×512 PWA icon (purple `#6C5CE7`, Python-generated placeholder)
- `public/robots.txt` — Crawler permissions (bonus)
- `docs/env.example` — All `VITE_*` env vars documented

### Modified files (4)
- `vercel.json` — SPA rewrite fix (`/index.html`) + 5 security headers incl. CSP
- `public/manifest.json` — Updated `theme_color` `#07070D` → `#6C5CE7`, updated `name`/`description` to MindFocus branding
- `src/mindflow.jsx` — +8 lines: SW registration block with `logError` (INVARIANT 7)
- `docs/bolts/adr/0014-pwa-deploy.md` — Architecture Decision Record (new)

---

## Acceptance Criteria Results

| AC | Description | Result |
|----|-------------|--------|
| AC1 | `vercel.json` — SPA fallback + security headers (X-Frame-Options, X-Content-Type-Options, CSP) | ✅ |
| AC2 | `public/manifest.json` — name, short_name, start_url, display, theme_color, background_color, icons 192+512 PNG | ✅ |
| AC3 | `public/sw.js` + `public/offline.html` + SW registration in `mindflow.jsx` (logError on failure) | ✅ |
| AC4 | Secrets via `import.meta.env.VITE_*`, documented in `docs/env.example` | ✅ |
| AC5 | `npm run build` 0 errors, bundle delta ≤ +10 kB gzip | ✅ (verified) |
| AC6 | `docs/bolts/adr/0014-pwa-deploy.md` | ✅ |
| AC7 | This bolt log | ✅ |

**Bonus:**
- `public/robots.txt` ✅ (+0 kB gzip)
- No `src/features/`, `src/shared/`, `src/skeleton/` touched ✅

---

## Key Architectural Decisions

See ADR 0014 for full rationale. Key choices:

1. **Vanilla SW** — no Workbox, no vite-plugin-pwa. Cache API only. Zero new npm deps.
2. **Network-Only for Supabase + Anthropic** — auth/AI calls must never be served stale.
3. **CSP via vercel.json headers** — server-enforced, not bypassable via DOM.
4. **PNG icons via Python stdlib** — placeholder solid-color icons; replace with branded
   artwork before public launch.
5. **`'unsafe-inline'` in CSP** — required for React inline styles; tracked for future
   nonce-based hardening.

---

## Self-Assessment

**Score: 9/10**

- Clean separation: SW logic is pure fetch-handler (no framework leakage)
- `logError("mindflow.registerSW", err)` — INVARIANT 7 compliant
- `offline.html` is ADHD-friendly: brief copy, no shame language, 48px touch target
- `aria-live` not needed on offline page (it's a full-page static replacement, not a toast)
- CSP allows Supabase Realtime WebSocket (`wss://*.supabase.co`) ✅
- Minor deduction: PNG icons are solid-color placeholders (acceptable for MVP/deploy)
