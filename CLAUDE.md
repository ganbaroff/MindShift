# MindFlow — Claude Code Intelligence File

## Project Overview

**MindFlow** is a React + Supabase web/mobile PWA for capturing, organizing, and AI-processing thoughts (brain dumps). It supports multilingual content (EN/RU/AZ), a freemium model ($8/mo Pro), and integrates with the Gemini API for AI features.

**Stack:** React 18, Vite, Supabase, Gemini API
**Deployment:** Vercel
**Entry point:** `src/mindflow.jsx`

---

## Active Skills

### 1. UI/UX Pro Max — Design Intelligence
> Installed at `.claude/skills/ui-ux-pro-max/SKILL.md`

**50+ UI styles · 97 color palettes · 57 font pairings · 99 UX guidelines · 25 chart types · 9 tech stacks**

Triggers automatically when building, designing, reviewing, or improving any UI/UX component.

Supported stacks: React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind/HTML, shadcn/ui.

**Key rules enforced:**
- Touch targets ≥ 44×44px (mobile first)
- Color contrast ≥ 4.5:1 (WCAG AA)
- Body text ≥ 16px on mobile
- `prefers-reduced-motion` respected
- Visible focus states on all interactive elements
- Skeleton screens / loading states on all async operations

**Design styles for MindFlow:** Glassmorphism, Dark Mode, Minimalism, Bento Grid

---

### 2. Nano Banana 2 — AI Image Generation
> Installed at `.claude/skills/nano-banana-2/SKILL.md`

**Google Gemini 3.1 Flash Image Preview — fast, cheap AI image generation**

Use for: UI mockups, app screenshots, icons, social assets, onboarding illustrations, hero images.

```bash
nano-banana "your prompt" [--model pro] [-s 512|1K|2K|4K] [-a 16:9|9:16|1:1] [-o filename]
```

Setup once: `git clone https://github.com/kingbootoshi/nano-banana-2-skill.git ~/tools/nano-banana-2 && cd ~/tools/nano-banana-2 && bun install && bun link`
API key: `echo "GEMINI_API_KEY=your_key" > ~/.nano-banana/.env`

---

### 3. Google Stitch — AI UI Design (MCP)
> Configured in `.mcp.json`

**Generates complete UI screens and production-ready frontend code from prompts or screenshots.**

Run setup once: `npx @_davideast/stitch-mcp init` → select "Claude Code"

Design at: [stitch.withgoogle.com](https://stitch.withgoogle.com) | Export to Figma | Pull code via MCP.

**MCP tools available after setup:**
- `build_site` — Map Stitch screens → routes → returns HTML per page
- `get_screen_code` — Download HTML code for a specific screen
- `get_screen_image` — Download screenshot of a screen as base64

**MCP config (already in `.mcp.json`):**
```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["@_davideast/stitch-mcp", "proxy"]
    }
  }
}
```

---

## Web & Mobile Development Capabilities

### Frontend Architecture
- **Component model:** React functional components + hooks (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`, `memo`)
- **State management:** Local state + Supabase Realtime; avoid Redux unless scale demands it
- **Styling:** Inline styles with CSS-in-JS pattern (current), migrate to Tailwind CSS for new screens
- **Code splitting:** Lazy load heavy screens; keep bundle lean
- **Error handling:** Use `ErrorBoundary` components at page and feature level

### Mobile / PWA
- **PWA manifest** in `public/` — ensure `manifest.json` and service worker are configured
- **Responsive breakpoints:** Mobile-first, breakpoints at 375px, 768px, 1280px
- **Safe areas:** Account for iOS notch/home bar with `env(safe-area-inset-*)`
- **Touch UX:** All tap targets ≥ 44×44px, swipe gestures for navigation where natural
- **Offline support:** Cache critical assets and API responses via service worker

### Backend / Data
- **Supabase:** Auth (magic link + OAuth), Postgres DB, Realtime subscriptions, Storage
- **API calls:** Always handle loading + error states; never leave UI in ambiguous state
- **Security:** RLS (Row Level Security) policies on all tables; never expose service key client-side
- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY`

### AI / Gemini Integration
- **Model:** Gemini 2.5 Pro (via Gemini API)
- **Use cases:** AI brain dump processing, thought summarization, smart categorization
- **Rate limiting:** Enforce freemium limits (30 dumps/mo free, 50 thoughts cap)
- **Prompting:** System prompt sets persona; user content is user's thoughts — never mix

---

## Code Standards

### React Patterns
```jsx
// Prefer named exports
export function ComponentName({ prop1, prop2 }) { ... }

// Memoize expensive renders
const MemoComponent = memo(function MemoComponent({ data }) { ... });

// useCallback for stable refs passed to children
const handleAction = useCallback(() => { ... }, [deps]);

// useMemo for derived data
const filtered = useMemo(() => items.filter(fn), [items, fn]);
```

### Styling (current inline style pattern)
```jsx
// Use the global C (colors) object for consistency
import { C } from '../constants'; // or define at top of file

style={{
  background: C.bg,
  color: C.text,
  borderRadius: 16,
  padding: '12px 16px',
}}
```

### Supabase Data Fetching
```jsx
const { data, error } = await supabase
  .from('thoughts')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

if (error) throw error;
```

---

## Design System (MindFlow)

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `C.bg` | `#0d0d0d` | App background |
| `C.surface` | `#1a1a1a` | Cards, panels |
| `C.text` | `#f0f0f0` | Primary text |
| `C.textSub` | `#a0a0a0` | Secondary text |
| `C.textDim` | `#606060` | Disabled / hint |
| `C.idea` | `#f5a623` | Accent / CTA |
| `C.accent` | `#7c5cbf` | Secondary accent |
| `C.border` | `#2a2a2a` | Borders, dividers |

### Typography
- **Font family:** System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- **Body:** 15–16px / line-height 1.5
- **Headings:** 20–28px / font-weight 700
- **Labels:** 12–13px / font-weight 500 / letter-spacing 0.3

### Spacing Scale
`4px · 8px · 12px · 16px · 20px · 24px · 32px · 48px`

### Border Radius
`8px (tight) · 12px (default) · 16px (cards) · 24px (sheets) · 9999px (pills)`

---

## File Structure

```
mindflow-ready/
├── .mcp.json                    ← Stitch MCP server config
├── CLAUDE.md                    ← This file
├── .claude/
│   └── skills/
│       ├── ui-ux-pro-max/
│       │   └── SKILL.md         ← Design intelligence
│       └── nano-banana-2/
│           └── SKILL.md         ← AI image generation
├── src/
│   ├── main.jsx                 ← React entry point
│   └── mindflow.jsx             ← Full app (monolith, to be split)
├── public/                      ← Static assets, PWA manifest
├── index.html
├── vite.config.js
└── vercel.json
```

---

## Workflow for New Features

1. **Design phase:** Use [stitch.withgoogle.com](https://stitch.withgoogle.com) to generate UI → pull via `get_screen_code` MCP tool
2. **Asset generation:** Use `nano-banana` CLI for any illustrations, icons, or social assets
3. **Implementation:** Apply UI/UX Pro Max guidelines automatically
4. **Review checklist:**
   - [ ] Mobile responsive (375px+)
   - [ ] Touch targets ≥ 44px
   - [ ] Color contrast passes WCAG AA
   - [ ] Loading + error states handled
   - [ ] Multilingual strings added (EN/RU/AZ)
   - [ ] Freemium gate applied where relevant
   - [ ] Supabase RLS not bypassed

---

## Freemium Rules

| Feature | Free | Pro ($8/mo) |
|---------|------|-------------|
| AI dumps/month | 30 | Unlimited |
| Thoughts stored | 50 | Unlimited |
| Export | — | CSV / JSON |
| Personas | 1 | Multiple |

Gate UI with `<ProBanner>` component. Never block navigation — only block the specific action.

---

## Commands

```bash
npm run dev      # Start dev server (Vite, port 5173)
npm run build    # Production build
npm run preview  # Preview production build
```

---

## References

- [Google Stitch](https://stitch.withgoogle.com) — AI UI design
- [stitch-mcp GitHub](https://github.com/davideast/stitch-mcp) — MCP integration
- [Nano Banana 2 CLI](https://github.com/kingbootoshi/nano-banana-2-skill) — Image generation
- [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — Design intelligence skill
- [Supabase Docs](https://supabase.com/docs) — Backend reference
- [Gemini API](https://ai.google.dev/gemini-api/docs) — AI features
- [Vite Docs](https://vitejs.dev) — Build tooling
