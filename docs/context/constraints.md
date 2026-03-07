# Project Constraints

Hard limits and non-negotiables for MindFlow development.

---

## Technical Constraints

| Constraint | Reason |
|---|---|
| No SSR (Vite SPA only) | PWA install + client-side auth; SSR adds complexity with no benefit |
| Supabase anon key only on client | Never expose service key; RLS must be enabled on all tables |
| `VITE_ANTHROPIC_API_KEY` is client-side for now | Acceptable in beta; must move to Edge Function before 1000+ MAU |
| No Redux | Too heavy for current scale; Zustand is the planned ceiling |
| React 18 (no React 19 yet) | Stable concurrent features needed; upgrade when ecosystem is ready |
| No breaking changes to DB schema without migration script | Existing user data must be preserved |
| Touch targets ≥ 44×44px | WCAG AA; primary audience uses mobile |
| All user-visible strings in `T` object | Required for EN/RU/AZ multilingual support |

---

## Business Constraints

| Constraint | Reason |
|---|---|
| Free tier: 30 AI dumps/month, 50 thoughts cap | Gross margin protection; AI calls cost money |
| No guilt-based UX | Core product promise for ADHD users; evening review must never shame |
| Payment: M10 + AzeriCard for Azerbaijan | Local market requirement; Stripe for international |
| No Stripe in MVP | Integration complexity; start with waitlist, add payment in V1.1 |
| Multilingual: EN, RU, AZ from day one | Target market is Azerbaijan + diaspora |

---

## Team Constraints

| Constraint | Reason |
|---|---|
| Solo founder | All architecture decisions require low operational overhead |
| AI agents do NOT touch `src/skeleton/` without ADR | Prevent accidental breaking of auth/security boundaries |
| Spec required before bolt | Prevents AI agents from building the wrong thing |
| Max ~400 lines per feature slice | Forces separation of concerns; split if exceeded |
