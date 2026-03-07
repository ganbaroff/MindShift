# [0004] React + Vite (no SSR, no Next.js)

- **Status:** Accepted
- **Date:** 2026-03-07
- **Owner:** Yusif Ganbarov

## Context and Problem Statement

Choosing the frontend build system and whether to use SSR is a foundational decision that affects DX, deployment, and PWA capabilities.

## Considered Options

- **Option A: Vite + React (current)** — SPA, fast HMR, simple PWA setup via vite-plugin-pwa.
- **Option B: Next.js App Router** — SSR/SSG, but complex PWA setup, unnecessary server costs for a client-side data app.
- **Option C: Remix** — full-stack, edge-first, overkill for current scope.

## Decision Outcome

**Chosen option: Option A — Vite + React**

MindFlow is a client-side app. All data is user-specific and loaded after auth — SSR provides no SEO or performance benefit. Vite's dev speed and simple PWA plugin outweigh any Next.js ecosystem advantages at this scale.

### Positive Consequences

- Deploys as a static bundle to Vercel CDN — zero server costs.
- `vite-plugin-pwa` + Workbox gives full offline support with minimal config.
- Fast iteration: HMR in <100ms.

### Negative Consequences / Trade-offs

- No server-side rendering — not suitable if MindFlow ever needs public SEO pages (landing, blog). Would require a separate marketing site.
- Bundle size management is manual (no automatic route-level code splitting like Next.js provides out-of-box).

### Risks / Open Questions

- TypeScript migration: currently all `.jsx`. Migration plan: `tsconfig.json` with `allowJs: true` → rename files one sprint at a time.
