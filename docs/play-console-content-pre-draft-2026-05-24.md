# Play Console Content Pre-Draft — MindShift v1.0 (versionCode 100)

**Purpose:** CEO copy-paste source for Google Play Console "App content" section. Closes CL-J7 / CL-J8 / CL-J9 / CL-J10 of `docs/PRE-PUBLISH-CHECKLIST-2026-05-24.md`. Each answer cites the source file in repo so CEO can verify before submitting. Mark `(verify)` items require CEO confirmation; rest are derived from code + documented architecture.

**Authored:** 2026-05-24 ~12:30 AST by Atlas/CLI-side Claude Opus 4.7. Cross-referenced against `CLAUDE.md` Supabase Edge Functions table, Sprint A-AG history, `apps/web/src/store/index.ts` partialize, `supabase/functions/gdpr-*` source, `public/privacy.html` (HTTP 200 prod) and `public/terms.html`.

**Repo HEAD at draft time:** main `8f6c65a`.

---

## 1. Data Safety form

Google Play Console path: `App content → Data safety → Manage`. Form has 4 sections.

### 1.1 Data collection and security

**Does your app collect or share any of the required user data types?** → **Yes**

**Is all of the user data collected by your app encrypted in transit?** → **Yes** (HTTPS everywhere — Vercel-hosted PWA + Supabase TLS edge functions + Sentry HTTPS + Plausible HTTPS + Gemini HTTPS).

**Do you provide a way for users to request that their data be deleted?** → **Yes** (`supabase/functions/gdpr-delete/index.ts` — full account deletion endpoint accessible via in-app Settings → Delete Account, source: `CLAUDE.md` Supabase Edge Functions table).

### 1.2 Data types collected

Tick the following data types per Google's taxonomy. For each, set: collected ✅ / shared ✅ if applicable / processed ephemerally only if applicable / purposes + required/optional + linked to user identity.

| Data type | Collected | Shared | Processed ephemerally | Purposes | Required or optional | Linked to user ID |
|---|---|---|---|---|---|---|
| **Email address** (Personal info) | ✅ | ❌ | ❌ | App functionality (account), Communications (magic link login) | Required | ✅ Yes |
| **Name** (Personal info) | ✅ optional in profile | ❌ | ❌ | App functionality (personalisation) | Optional | ✅ Yes |
| **User IDs** (Personal info) | ✅ Supabase UUID + Google OAuth sub | ❌ | ❌ | App functionality, Account management | Required | ✅ Yes |
| **Health info** (Health and fitness — ADHD context) | ✅ self-reported energy levels + ADHD signals (timeBlindness, emotionalReactivity, medicationTime if user enters) | ❌ | ❌ | App functionality, Personalization | Optional | ✅ Yes |
| **Voice or sound recordings** (Audio files) | ✅ Web Speech API transcript via `useVoiceInput` → `classify-voice-input` edge function | ❌ — text transcript only, audio not stored | ✅ ephemeral (browser SpeechRecognition processes locally; only resulting text is sent to backend) | App functionality (voice task creation) | Optional | ✅ Yes (sent with user JWT) |
| **Calendar events** (Calendar) | ✅ optional, only if user enables Google Calendar integration | ❌ | ❌ | App functionality (calendar sync for tasks) | Optional | ✅ Yes |
| **App interactions** (App activity) | ✅ focus_sessions, tasks, energy_logs, achievements, snooze counts | ❌ | ❌ | App functionality, Analytics, Personalization | Required (for core features to work) | ✅ Yes |
| **Crash logs** (App info and performance) | ✅ Sentry | ✅ Sentry (third-party processor) | ❌ | Analytics (crash diagnostics) | Required | ❌ No (anonymous crash digest) `(verify)` |
| **Diagnostics** (App info and performance) | ✅ Plausible analytics (privacy-first, cookieless) | ✅ Plausible (third-party processor) | ❌ | Analytics | Required | ❌ No (no user ID linkage; aggregated only) |

**Data types NOT collected** (do not tick): Approximate location, Precise location, Address, Phone number, Race/ethnicity, Political/religious, Sexual orientation, Other personal info, Financial info (Dodo Payments processes payment separately, MindShift app does not store financial info itself — confirm with Dodo as processor), Other health (medical records, fitness), Photos, Other audio, Files & docs, Contacts, Messages, Web browsing, Advertising ID, Other IDs.

### 1.3 Per-data-type sharing details

For each row with `Shared: ✅`, declare the third-party processor:

- **Crash logs → Sentry** (sentry.io). Purpose: aggregate crash diagnostics. Data residency: Sentry US/EU regions. `(verify)` — confirm Sentry org region in CEO Sentry dashboard.
- **Diagnostics → Plausible** (plausible.io). Purpose: page-view analytics. Cookieless, privacy-first, EU-hosted by default. Note: prod returns 503 currently — analytics not actually flowing, but form must declare the intended integration.

### 1.4 Data security practices

- Data encrypted in transit: **Yes** (HTTPS + Supabase TLS).
- Data encrypted at rest: **Yes** (Supabase managed Postgres has at-rest encryption per Supabase docs; client IndexedDB unencrypted by default — `(verify)` if Capacitor adds platform-level encryption).
- Follows Families Policy: **No** (app is for adults; ADHD focus, not aimed at children under 13).
- Independent security review: **Not provided** (small team; rely on Supabase + Vercel infrastructure security).
- Users can request data deletion: **Yes** — in-app Settings → Delete Account → calls `gdpr-delete` edge function.
- Users can request data export: **Yes** — in-app Settings → Export Data → calls `gdpr-export` edge function returning JSON.
- Committed to Play Families Policy: **No**.

---

## 2. Age Rating quiz

Google Play Console path: `App content → Age rating → Start questionnaire`. The quiz produces an IARC rating. For MindShift:

| Question | Answer | Why |
|---|---|---|
| Does your app contain violence? | **No** | No combat, weapons, hostile interaction. |
| Does your app contain sexual content or nudity? | **No** | |
| Profanity? | **No** | UI copy is calm + warm; no profanity in any locale (verified via `.claude/rules/guardrails.md` shame-free rules + grep). |
| Drugs, tobacco, alcohol references? | **No** | (Medication-time feature lets user record their own ADHD-medication timing; this is the user's data input, not app-promoted content. Likely answer "No" — `(verify)` if Google considers self-reported medication as drug reference; if uncertain, write to support before submission.) |
| Simulated gambling? | **No** | Crystal economy is non-monetised internal currency; no real-money gambling. |
| Real-money gambling? | **No** | |
| Horror, fear, scary content? | **No** | |
| User-generated content shared publicly? | **No** | Focus Rooms use anonymous presence — no posted text, no profile images; Community face MVP. `(verify)` — at v1.0 internal-test scope. |
| Unrestricted internet access? | **No** | App is closed-system; no general browser. |
| Location sharing? | **No** | No location collected. |
| Personal info shared with other users? | **No** | Focus Rooms expose anonymous presence + 4-char room code only. |
| Digital purchases? | **Yes — non-essential subscription** | Dodo Payments → MindShift Pro subscription tier. No loot boxes, no consumable IAP. |

Expected resulting rating: **Everyone (PEGI 3 / ESRB E)** OR **PEGI 7 / ESRB E10+** depending on Google's interpretation of medication-time and subscription. Likely Everyone.

---

## 3. Target audience and content

Google Play Console path: `App content → Target audience and content`.

- **Target age groups (select all that apply):** **18 and over** (and optionally **13-17** if you want to reach late-teen ADHD users; reasonable for an ADHD productivity tool. Default-recommended: 18+ only at internal-test scope to avoid COPPA / Families policy overhead).
- **App designed for children?** **No** — does not appeal primarily to children, does not market to children, content is not child-directed.
- **App attractiveness to children?** **No** — no characters, no kid-friendly visual style, copy is adult-oriented (productivity, focus, ADHD support).
- **Ads visible to mixed audience?** **No ads** (see §4).
- **Account creation required for users under 13?** **N/A** — app is 13+.

---

## 4. Ads declaration

Google Play Console path: `App content → Ads`.

- **Does your app contain ads?** **No**.
- Source of truth: `package.json` has no ad-network SDKs (no `react-native-google-mobile-ads`, no `@adsense/*`, no `applovin`, no `unity-ads`). Verified by `grep` on package.json.

---

## 5. App content additional sections (commonly required for internal-test)

| Section | Answer |
|---|---|
| **Privacy Policy URL** | `https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app/privacy` (verified live HTTP 200 in CL-J5). Same URL also fine for production. |
| **App access (for Google review team)** | **All app features are available without restriction or special access.** No login wall — Guest mode is supported; magic-link sign-in is optional for cross-device sync. If Google review team needs an authenticated walk-through, provide test credentials separately. `(verify)` whether Google requires test login for internal-test review (usually only for closed/production). |
| **Content rating** | Submit Age Rating quiz answers from §2 above. |
| **Target audience** | §3 above. |
| **News apps declaration** | **Not a news app.** |
| **COVID-19 contact tracing / status app** | **No.** |
| **Data safety** | §1 above. |
| **Government apps** | **Not a government app.** |
| **Financial features** | **No** (Dodo subscription handled by Dodo Payments, MindShift is not a banking/financial-services app). |
| **Health & fitness** | **Self-care / personal organisation** — declare as health-adjacent only if Google forces the category. MindShift is closer to productivity than fitness; recommend "Productivity" primary category, "Health & Fitness" not selected. `(verify)`. |

---

## 6. What is NOT pre-drafted (CEO must answer in real-time)

These rows depend on legal interpretation, account-specific account choices, or Google's evolving 2026 policy text. CEO reads the Play Console question text + uses §1-§5 above as context but answers in his own judgement:

- Exact Sentry org region (US vs EU) — affects "Data shared with Sentry" data-residency declaration.
- Whether to declare `(verify)` items as Required/Optional for medical-data-like fields (ADHD signal).
- Whether 13-17 age band is included in target audience.
- Any new questions Google added since this draft was written.

---

## 7. Verify checklist before submit

Before clicking "Submit for review" in Play Console:

1. Privacy Policy URL returns HTTP 200 → already GREEN per CL-J5.
2. Terms URL returns HTTP 200 → already GREEN per CL-J6.
3. Data Safety declarations match `supabase/functions/gdpr-*` edge functions still exist → `ls supabase/functions/ \| grep gdpr` should return both files.
4. Sentry org region known to CEO before declaring data residency.
5. No third-party processor accidentally omitted — check `package.json` deps for anything that calls home (`grep -E "sentry\|plausible\|hotjar\|amplitude\|mixpanel" package.json`).
6. Dodo Payments processor declared separately under "Financial info" if Google forces it (it processes payment, but Mindshift app doesn't store financial data itself).

— end —
