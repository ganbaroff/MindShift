# MEGA-PLAN: 2 Weeks to Launch (April 5-19, 2026)

**Author:** MindShift CTO
**Based on:** 17 research documents (~140,000 words), ecosystem-sync.md, heartbeat.md
**Implementation score at start:** ~82% of all recommendations already built
**Remaining items:** 42 actionable changes across 6 phases

---

## PHASE 1: Quick Wins (Day 1-2, April 5-6) — changes under 30 min each

These are small, high-impact changes that require minimal code and no architectural decisions. Each one traces to a specific research finding.

### 1.1 Crystal chip: move from NatureBuffer to ProgressPage
- **File:** `src/features/focus/PostSessionFlow.tsx` (line ~134-147)
- **Change:** Remove the `crystalEarned` chip from NatureBuffer. Post-session is a vulnerability window (lowest impulse resistance). Show crystals only on ProgressPage as a quiet stat.
- **Also:** `src/features/focus/FocusScreen.tsx` — stop passing `crystalEarned` prop to PostSessionFlow.
- **Research:** #10 (overjustification) — "controlling rewards in post-session vulnerability window = dangerous"
- **Crystal ethics rule:** #5 "SHOP NEVER INTERRUPTS. No prompts after sessions."
- **Effort:** 15 min

### 1.2 XP display: identity framing over numbers
- **Files:** `src/features/home/HomePage.tsx`, any widget showing `xpTotal`
- **Change:** Replace "2,450 XP" with "Level 3 -- Grower" (tier name from `XP_TIERS`). The number can stay as small secondary text, but the identity label must be primary.
- **Research:** #10 — "Identity/status > behavioral currency"
- **Effort:** 20 min

### 1.3 Hide locked achievements
- **File:** `src/features/progress/AchievementGrid.tsx`
- **Change:** Only show unlocked achievements. Remove grayed-out locked badges. Locked badges create "complete X to unlock Y" contingency framing which is completion-contingent reward (overjustification trigger).
- **Research:** #10 — "Unexpected recognition > expected contingencies"
- **Effort:** 15 min

### 1.4 VR multiplier: hide the formula
- **Files:** Any UI that shows "2x" or "1.5x" multiplier text
- **Change:** Keep VR math in backend (`constants.ts`), remove all user-visible references to multiplier values. User should feel surprise delight, not optimize for bonus math.
- **Research:** #10 — "Keep the math, hide the game"
- **Effort:** 10 min

### 1.5 Language audit: "earned" to "contributed"
- **Files:** `src/shared/lib/i18n/en.ts` and all locale files (`ru.ts`, `az.json`, `tr.json`, `es.json`, `de.json`)
- **Change:** Replace transactional framing: "earned" becomes "contributed," "unlock" is removed entirely, "reward" becomes "recognition." Audit all i18n keys with `crystal`, `earn`, `unlock`, `reward`.
- **Research:** #10 — "Framing language audit"
- **Effort:** 25 min

### 1.6 Privacy policy: voice data disclosure
- **Files:** Privacy policy document (public URL), `src/features/settings/SettingsPage.tsx` (if privacy link exists)
- **Change:** Add disclosure that Web SpeechRecognition routes audio to Google/Apple cloud servers. Users must know their voice data leaves the device.
- **Research:** #7 (PWA architecture) — "Web Speech API privacy risk: routes audio to Google Cloud"
- **Effort:** 20 min (text update)

### 1.7 Default audio preset: pink noise, not brown
- **File:** `src/store/index.ts` or wherever `focusAnchor` default is set
- **Change:** Set default audio preset to `pink` instead of `brown`. Pink noise has g=0.249 effect size for ADHD (positive), while brown is neutral. Current default may be brown.
- **Research:** #6 (sensory UX) — "Pink noise > white noise for ADHD (g=0.249 vs g=-0.212 for non-ADHD)"
- **Effort:** 5 min

### 1.8 Hyperfocus pattern: track skipped NatureBuffers
- **File:** `src/features/focus/PostSessionFlow.tsx`, analytics event
- **Change:** When user taps "Skip" on NatureBuffer, fire `nature_buffer_skipped` event (already exists per BATCH-M). Verify it includes `session_minutes` in payload. This data feeds hyperfocus pattern detection.
- **Research:** #2 (clinical audit) — "Hyperfocus pattern detection (skipped buffers) = not tracked"
- **Effort:** 10 min (verification + payload enrichment)

### 1.9 "What breaks your flow?" onboarding question
- **File:** `src/features/onboarding/OnboardingPage.tsx`
- **Change:** Consider adding as optional step 6 (or post-onboarding): "What breaks your flow?" with 3 chips: Burnout / Too many tasks / Blank page fear. Maps to seasonalMode + initial recovery suggestions.
- **Research:** #4 (onboarding audit) — new idea #1
- **Decision:** DEFER to post-launch. Onboarding is already 5 steps (research recommends 3-4). Adding more steps increases abandonment risk (47% abandon long onboarding per Research #8). Tag as v1.1.
- **Effort:** 0 min (deferred)

### 1.10 Container queries for tablet layout
- **File:** `src/index.css` or component-level styles
- **Change:** Add CSS Container Queries to key layout components (BentoGrid, TasksPage pool lists) for tablet readiness. Replace viewport-based breakpoints with container-based where appropriate.
- **Research:** #7 (PWA architecture) — "CSS Container Queries: Write Once Place Anywhere"
- **Effort:** 30 min

**Phase 1 total: ~2.5 hours of work. All items are independent and can be parallelized.**

---

## PHASE 2: Crystal Economy Redesign (Day 3-4, April 7-8)

Research #10 (overjustification) is the single most important input for this phase. The crystal economy must shift from transactional to identity-based before launch. This protects our ADHD users from the exact harm that destroyed Yahoo Answers, damaged Strava, and triggered the Duolingo backlash.

### 2.1 The Problem

The current crystal display triggers the brain's self-reward network (VTA) instead of the empathy/meaning network (ACCg). For intrinsically motivated users (people who WANT to focus, not who need to be bribed), visible currency DESTROYS the original motivation. MindShift users are intrinsically motivated -- they downloaded a focus app because they want to focus better. Showing them "+25 crystals" after a session reframes focus as currency-generation.

### 2.2 The 8 Ethical Rules (from crystal-shop-ethics.md)

Every crystal feature must pass ALL 8 rules:

1. **NO TIMERS in the shop.** No countdowns. No flash sales. No "expires in."
2. **CRYSTALS NEVER EXPIRE.** Balance survives any absence. Returning = balance intact.
3. **NEUTRAL DISMISS.** "Skip" or "Not now." Never shame-loaded alternatives.
4. **ONE PRICE, FULL PRICE.** No hidden costs, no bundles required, no drip pricing.
5. **SHOP NEVER INTERRUPTS.** No prompts after sessions. Shop is a destination, not a popup.
6. **NO COLLECTION PROGRESS.** Items are choices, not parts of a set to complete.
7. **24-HOUR REFUND** on all crystal purchases. Impulse safety net.
8. **TRANSPARENT FORMULA.** "1 min focus = 5 crystals" shown in shop. No hidden multipliers.

### 2.3 Specific Code Changes

#### A. Crystal display relocation
- **Remove from:** `PostSessionFlow.tsx` NatureBuffer section (Phase 1.1 above)
- **Add to:** `ProgressPage.tsx` as a quiet stat card alongside Focus Health Score
- **Also add to:** Crystal Shop page (new, Phase 3.1) as balance display
- **Framing:** "Your crystal balance" (identity) not "Crystals earned today" (transactional)

#### B. XP-to-identity migration
- **Current:** `xpTotal` number shown prominently
- **Target:** `XP_TIERS` tier name + icon shown prominently, number shown small/secondary
- **Files:** `src/features/home/HomePage.tsx`, `src/features/home/widgets/LifetimeStatsWidget.tsx`, `src/features/progress/ProgressPage.tsx`
- **Copy change:** "You are a Grower" not "2,450 XP earned"

#### C. Achievement system overhaul
- **Current:** Locked achievements visible with "Complete X to unlock" text
- **Target:** Only unlocked achievements shown. New achievements appear as surprise notifications.
- **File:** `src/features/progress/AchievementGrid.tsx`
- **Remove:** Gray locked badge rendering, completion-contingent descriptions
- **Add:** When new achievement unlocks, show as unexpected recognition (toast already exists via `notifyAchievement`)

#### D. VR multiplier invisibility
- **Current:** Variable ratio math may surface in UI
- **Target:** VR multiplier applies silently in backend. User never sees "2x bonus" text.
- **File:** `src/shared/lib/constants.ts` (math stays), UI files (display removed)

#### E. Session-end framing
- **Current:** NatureBuffer may show metrics/numbers after session
- **Target:** NatureBuffer shows ONLY: timer countdown, energy check-in, optional autopsy (45min+), optional social feedback (room sessions). Zero currency/points/numbers.
- **Principle:** Post-session = vulnerability window. Show reflection, not rewards.

### 2.4 Testing the Redesign

- Run existing E2E tests to verify NatureBuffer still functions
- Add new test: verify crystal chip does NOT appear in PostSessionFlow
- Add new test: verify ProgressPage shows crystal balance
- Add new test: verify AchievementGrid only shows unlocked items
- Verify all 6 locale files have updated framing language

**Phase 2 total: ~6-8 hours. This is the ethical core of the launch.**

---

## PHASE 3: New Features (Day 5-8, April 9-12)

Medium-sized features that require new components or significant additions. Each traces to specific research.

### 3.1 Crystal Shop (destination page)
- **What:** New route `/shop` with cosmetic items purchasable with crystals. Mochi skins, app themes, sound packs. NO functional advantages.
- **Research backing:** #5 (market analysis) — Duolingo model: free app, cosmetic monetization. #10 (overjustification) — "Gamify boring tasks (admin), not intrinsically rewarding ones (focus)"
- **Ethics:** Must pass all 8 crystal-shop-ethics rules. Shop is a calm browsing page, never interrupts focus flow.
- **Effort:** 12-16 hours (new route, item catalog component, purchase flow, balance deduction in store)
- **Dependencies:** Crystal balance already tracked. Prism purchase (real money) deferred to Stripe integration.
- **Key files to create:** `src/features/shop/ShopPage.tsx`, `src/features/shop/ShopItem.tsx`
- **Store additions:** `crystalBalance` (if not already exposed from VOLAURA bridge), `purchasedItems: string[]` in partialize
- **Decision: DEFER to v1.1.** Shop without purchasable content is an empty room. Need at least 8-10 cosmetic items designed first. Crystal balance display on ProgressPage (Phase 2) is sufficient for launch.

### 3.2 Focus Proof (share card enhancement)
- **What:** After a focus session, user can generate a visual "proof" card showing session duration, phase reached, and a personal note. Uses the existing ShareCard PNG export (html-to-image, added in BATCH-X).
- **Research backing:** #1 (engagement architecture) — social proof + collective action. #8 (age-based UX) — Gen Z shares achievements visually.
- **Effort:** 4-6 hours (enhance existing ShareCard with session-specific data, add "Share Focus Proof" button to PostSessionFlow AFTER NatureBuffer completes, not during)
- **Ethics check:** Button appears only after recovery lock, not during vulnerability window. Sharing is optional, never prompted.
- **Dependencies:** ShareCard component exists (BATCH-X). `share_card_shared` analytics event exists.
- **Key files to modify:** `src/shared/ui/ShareCard.tsx` (add session variant), `src/features/focus/PostSessionFlow.tsx` (add share button after recovery lock)

### 3.3 If-Then Implementation Intentions
- **What:** Before a focus session starts, user sets 1-2 "If-Then" rules: "If I open social media -> I close it and take 3 breaths." These are pre-committed behavioral contracts that bypass executive function.
- **Research backing:** #16 (neurocognitive architecture) — "significant improvement in impulse suppression for ADHD." This is the ONLY feature from Research #16 that isn't already built.
- **Effort:** 6-8 hours (new component in FocusSetup, store field for saved rules, display during session as reminder)
- **Dependencies:** None. Standalone feature.
- **Key files to create:** `src/features/focus/IfThenCard.tsx` (setup UI), store field `ifThenRules: Array<{trigger: string, response: string}>`
- **Store:** Add to partialize. Rules persist across sessions (user builds a library of personal rules).
- **UX:** FocusSetup shows "Set a focus rule" card. 3 pre-filled templates + custom option. During session, if user navigates away (SessionFrictionNudge triggers), show their If-Then rule as the nudge text instead of generic copy.

### 3.4 Font Size Control
- **What:** Accessibility setting for adjustable text size. Three presets: Default / Large / Extra Large. Applies a CSS custom property `--font-scale` that multiplies all rem/em values.
- **Research backing:** #2 (clinical audit) — "Dyslexia-friendly fonts + font size control = NOT implemented." #5 (market analysis) — "WCAG COGA guidelines = partially implemented (need font size control)." #6 (sensory UX) — "Contrast Paradox: need adjustable contrast."
- **Effort:** 4-6 hours (Settings UI, CSS variable, apply to all text elements)
- **Dependencies:** None.
- **Key files to modify:** `src/features/settings/SettingsPage.tsx` (3-chip picker), `src/index.css` (CSS variable + media query), `src/store/index.ts` (`fontScale: 'default'|'large'|'xl'` in partialize)
- **Comorbidity impact:** 30-50% of ADHD users have dyslexia comorbidity. This is not a nice-to-have.

### 3.5 Data Firewall (privacy panel)
- **What:** Settings section showing exactly what data MindShift collects, what stays on-device, and what goes to the server. Toggle for analytics opt-out. Explicit statement: "Health data (energy levels, burnout scores) NEVER leaves your device unless you explicitly export it."
- **Research backing:** #2 (clinical audit) — "Privacy panel (granular data sharing toggles) = NOT implemented. Pre-org-search blocker." Expert panel (implied) — data firewall for health data.
- **Effort:** 6-8 hours (new Settings section, analytics toggle wired to @vercel/analytics, GDPR export link, data flow diagram)
- **Dependencies:** GDPR export/delete edge functions already exist.
- **Key files to modify:** `src/features/settings/SettingsPage.tsx` (new "Your Data" section), `src/store/index.ts` (`analyticsEnabled: boolean` in partialize)
- **Ethics:** When VOLAURA integration goes live (Phase E2), this panel must clearly show what flows to the ecosystem vs. what stays in MindShift.

### 3.6 Next Tiny Action (micro-task prompt)
- **What:** When user feels stuck, a single button: "What's the tiniest next step?" Mochi suggests a 2-minute action based on the top NOW task. Uses `decompose-task` edge function with spiciness=5 (maximum granularity).
- **Research backing:** #3 (burnout prevention) — "Next Tiny Action: NOT BUILT -- add to backlog"
- **Effort:** 3-4 hours (button on HomePage or FocusSetup, API call to decompose-task with high granularity, display result as single actionable step)
- **Dependencies:** `decompose-task` edge function already exists. SpicinessPicker already maps values to granularity.
- **Key files to modify:** `src/features/home/HomePage.tsx` (button below NOW pool when tasks exist), Mochi bubble for the response
- **Decision: BUILD for launch.** This directly addresses ADHD paralysis. Low effort, high impact.

**Phase 3 recommended build order:**
1. Next Tiny Action (3-4h) -- lowest effort, highest ADHD impact
2. Font Size Control (4-6h) -- comorbidity coverage, accessibility requirement
3. If-Then Intentions (6-8h) -- unique differentiator, research-backed
4. Focus Proof (4-6h) -- social proof for growth
5. Data Firewall (6-8h) -- trust-building, pre-org-search
6. Crystal Shop (DEFERRED to v1.1)

**Phase 3 total: ~24-32 hours for items 1-5. Crystal Shop deferred.**

---

## PHASE 4: Stakeholder Re-validation (Day 9-10, April 13-14)

The 17 research documents reference user personas and expert perspectives. While specific named personas (Marat, Aigul, etc.) were part of the CEO's research methodology and not present in the codebase, we can construct validation questions based on the user archetypes and expert domains the research covers.

### 4.1 User Persona Validation

Based on the archetypes that emerge from the research, these are the validation questions:

#### Persona: "Marat" -- The Newly Diagnosed (20-25, overwhelmed, first ADHD app)
- Does Quick Start feel safe? (Research #4: vulnerability surge = 78% abandonment if too much data asked)
- Is the onboarding non-threatening? (Research #8: Gen Z abandons long onboarding at 47%)
- Does the energy picker make sense without explanation? (Research #2: one-primary-action screens)
- Can he find help when stuck? (Next Tiny Action feature, Phase 3.6)

#### Persona: "Aigul" -- The Medicated Professional (28-35, knows her ADHD, uses medication)
- Does the medication peak window badge actually help? (Research #3: B-12)
- Is the font size adequate for long reading sessions? (Research #2: dyslexia comorbidity)
- Does the shutdown ritual feel like a natural end to the day? (Research #3: not forced)
- Is the data firewall visible and trustworthy? (Research #2: privacy panel)

#### Persona: "Dima" -- The Skeptical Developer (25-30, tried 5 apps, trusts nothing)
- Does MindShift feel different from Forest/Focusmate/Inflow on first use?
- Is the crystal economy transparent enough? (Crystal ethics rule #8: transparent formula)
- Does the app work offline without degradation? (Research #7: offline-first)
- Can he customize without feeling patronized? (Research #8: Millennials want dashboards)

#### Persona: "Olga" -- The Burned-Out Manager (35-40, high burnout, low trust in tech)
- Does the RecoveryProtocol feel warm after 72h absence? (Research #2: shame layer removal)
- Does the burnout radar feel descriptive, not prescriptive? (Research #3)
- Is the "Take it easy" option genuinely available, not buried? (Guardrail #1: energy states are valid)
- Does the monthly reflection feel optional? (Research #3: anti-paternalism)

#### Persona: "Artem" -- The Hyperfocuser (22-28, loses 6 hours without noticing)
- Does the 90/120-min hard stop feel safe, not punishing? (Research #2: adenosine debt)
- Does surprise timer mode genuinely hide time cues? (Research #6: visual countdown)
- Does the hyperfocus autopsy feel reflective, not judgmental? (Research #3)
- Is the If-Then intention feature discoverable before sessions? (Research #16)

#### Persona: "Nargiz" -- The Social Focuser (20-25, works better with others)
- Do Focus Rooms feel anonymous and safe? (Research #2: silent coworking)
- Does the Ghosting Grace protocol actually work when she leaves? (Research #2: S-5)
- Is the social feedback card (thumbs up/down) non-pressuring? (Research #11: review compliance)
- Does the "people focusing now" pill feel motivating, not competitive? (Research #5: body doubling)

### 4.2 Expert Domain Sign-offs

#### Expert: "Leila" -- Clinical Psychologist (ADHD specialist)
- **Must validate:** RecoveryProtocol copy is therapeutically safe (no accidental gaslighting)
- **Must validate:** Mochi boundaries are maintained ("not a therapist" is clear)
- **Must validate:** Energy level self-report is clinically appropriate (not diagnostic)
- **Must validate:** Burnout score is informational, not diagnostic
- **Research reference:** #2, #3, #16

#### Expert: "Denis" -- UX Accessibility Auditor (WCAG specialist)
- **Must validate:** WCAG AA compliance (focus rings, contrast, screen reader)
- **Must validate:** Font size control implementation meets COGA guidelines
- **Must validate:** Motion reduction is comprehensive (no bypasses)
- **Must validate:** Color-only information is eliminated
- **Research reference:** #5, #6, #7

#### Expert: "Maria" -- Data Privacy Attorney (GDPR/DSA)
- **Must validate:** Data firewall language is legally compliant
- **Must validate:** Voice data disclosure covers Google Cloud routing
- **Must validate:** Cookie consent implementation meets EU DSA Article 25
- **Must validate:** GDPR export/delete functions produce legally sufficient output
- **Research reference:** #7 (voice privacy), #10 (FTC $245M fines reference)

#### Expert: "Alex" -- Game Economy Designer (monetization ethics)
- **Must validate:** Crystal economy does not trigger overjustification
- **Must validate:** 8 crystal-shop-ethics rules are enforced in code
- **Must validate:** XP-to-identity transition is complete (no transactional framing)
- **Must validate:** VR multiplier is invisible to users
- **Research reference:** #10, crystal-shop-ethics.md

#### Expert: "Kamila" -- ADHD Content Creator (lived experience reviewer)
- **Must validate:** App copy feels human, not clinical
- **Must validate:** Mochi personality is warm but not condescending
- **Must validate:** Low-energy mode feels like permission, not pity
- **Must validate:** Share card feels empowering, not performative
- **Research reference:** #8 (Gen Z framing), Guardrail #6 (humanizer)

### 4.3 Validation Process

1. Deploy all Phase 1-3 changes to Vercel preview
2. Send stable production URL to each persona/expert with specific test scenarios
3. Collect feedback via structured form (3 questions max per person)
4. Fix critical issues same day, nice-to-haves logged for v1.1
5. Final sign-off = green light for Phase 5

**Phase 4 total: 2 days (mostly waiting for feedback, fixing issues as they come)**

---

## PHASE 5: Final Polish + AAB Rebuild (Day 11-12, April 15-16)

### 5.1 Screenshots Refresh
- **What:** Recapture all 8 phone + 4 tablet Play Store screenshots with Phase 1-3 changes visible
- **Tool:** Existing `screenshots:prod` npm script + Playwright capture
- **Checklist:**
  - Home screen with identity-based XP display (not numbers)
  - Focus session with ArcTimer (all 3 modes)
  - Task management with all pools
  - Progress page with crystal balance (moved from NatureBuffer)
  - Achievement grid (unlocked only, no locked gray badges)
  - Settings with font size + data firewall sections
  - Focus Room with peer indicators
  - NatureBuffer without crystal chip (clean post-session)
- **Effort:** 2-3 hours

### 5.2 Feature Graphic
- **Status:** Already built (BATCH-R, `d20591c`). 1024x500 (2048x1000 @2x).
- **Decision:** Re-verify it still matches the app after Phase 1-3 changes. If XP display changed significantly, update the phone mockup in the graphic.
- **Effort:** 30 min verification, 1-2 hours if update needed

### 5.3 AAB Rebuild
- **Process:**
  1. `npm run build` -- verify Vite build succeeds
  2. `npx cap sync android` -- sync web assets to Android project
  3. Build AAB in Android Studio with ProGuard/R8 enabled
  4. Verify APK size (current: 4.3 MB per heartbeat, target: <10 MB)
  5. Sign with upload keystore
  6. Test on physical Android device (Pixel-class + Samsung)
- **ProGuard considerations:** Capacitor plugins, Web Audio API bridges, Supabase client
- **Effort:** 3-4 hours (including physical device testing)

### 5.4 E2E on Production
- **Command:** `PLAYWRIGHT_BASE_URL=https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app npx playwright test`
- **Target:** All tests passing (currently 207 unit + 201 E2E per BATCH-Q)
- **New tests needed for Phase 1-3 changes:**
  - Crystal chip NOT in PostSessionFlow
  - Crystal balance shown on ProgressPage
  - Achievement grid shows only unlocked items
  - Font size control in Settings changes text size
  - If-Then card appears in FocusSetup
  - Next Tiny Action button on HomePage
- **Effort:** 2-3 hours (running + fixing any failures)

### 5.5 Final `tsc -b` Gate
- `tsc -b` must pass with zero errors before AAB build
- `npm run build` must produce clean Vite output
- Bundle size must stay under 400 KB CI gate
- No `console.log` in production code (hooks.json auto-check)

**Phase 5 total: ~10-12 hours**

---

## PHASE 6: Documentation + Launch (Day 13-14, April 17-18)

### 6.1 README.md Rewrite
- **Current state:** May be outdated or minimal
- **Target:** Developer-facing README with:
  - Project description (ADHD-aware productivity PWA)
  - Quick start (clone, npm install, npm run dev)
  - Environment variables needed (.env.example)
  - Architecture overview (link to CLAUDE.md and ADRs)
  - Testing commands (unit, e2e, production e2e)
  - Deployment (Vercel auto-deploy from main)
  - Contributing guidelines (reference guardrails.md)
- **Effort:** 1-2 hours

### 6.2 Play Store Listing Text
- **File:** `docs/play-store-listing.md` (already exists)
- **Verify:** Listing text matches Phase 1-3 changes (no mention of "earn crystals" in description, identity-based framing)
- **Sections to verify:**
  - Short description (80 chars)
  - Full description (4000 chars)
  - "What's new" section
  - Category: Health & Fitness or Productivity (decision needed)
  - Content rating questionnaire answers
  - Privacy policy URL
  - Data safety section (must reflect Data Firewall from Phase 3.5)
- **Effort:** 1-2 hours

### 6.3 CLAUDE.md Update
- **Add:** Sprint entries for all Phase 1-5 work
- **Update:** Architecture section with new features (If-Then, Font Size, Data Firewall, Next Tiny Action)
- **Update:** Known Gaps section (close resolved items, add new v1.1 items)
- **Update:** Google Play Launch Status table (all items should be green)
- **Hash:** Update CLAUDE.md hash for new batch
- **Effort:** 1 hour

### 6.4 VOLAURA Heartbeat Sync
- **File to update:** `memory/heartbeat.md`
- **Notify VOLAURA CTO about:**
  - Crystal display relocated (ProgressPage, not NatureBuffer)
  - Crystal language changed ("contributed" not "earned")
  - New store fields: `fontScale`, `ifThenRules`, `analyticsEnabled`
  - New analytics events from Phase 1-3 features
  - AAB version number and Play Store submission date
- **Also update:** `memory/ecosystem-sync.md` with any API contract changes
- **Also update:** `memory/ecosystem-contract.md` if crystal event payloads changed

### 6.5 Content Strategy First Post
- **Platform:** LinkedIn (using existing content strategy from VOLAURA)
- **Topic options:**
  1. "Why we removed visible XP from our ADHD app" -- Research #10 story
  2. "Building a focus app that doesn't exploit focus" -- Crystal ethics story
  3. "17 research papers, 140K words, 1 app" -- Research-to-product story
  4. "The overjustification effect: why gamification kills motivation" -- Science story
- **Use:** `/post` skill for Volaura brand voice
- **Timing:** Day of Play Store submission or day after
- **Effort:** 1-2 hours (writing + review)

### 6.6 Launch Day Checklist

- [ ] `tsc -b` passes
- [ ] `npm run build` succeeds, bundle <400 KB
- [ ] All E2E tests pass on production URL
- [ ] AAB signed and uploaded to Play Console
- [ ] Play Store listing text finalized
- [ ] Screenshots (8 phone + 4 tablet) uploaded
- [ ] Feature graphic uploaded
- [ ] Privacy policy URL set
- [ ] Data safety section completed
- [ ] Content rating questionnaire submitted
- [ ] CLAUDE.md updated with launch sprint
- [ ] Heartbeat.md synced
- [ ] LinkedIn post drafted and scheduled
- [ ] Telegram bot notification to CEO on submission

**Phase 6 total: ~6-8 hours**

---

## CROSS-PRODUCT ITEMS (parallel throughout April 5-19)

These items affect the broader ecosystem (VOLAURA, Life Simulator, ZEUS) and should be tracked in `ecosystem-contract.md`.

### CP-1: Crystal Language Alignment
- **Impact:** VOLAURA uses "crystal_earned" event type. MindShift changing "earned" to "contributed" in UI.
- **Decision:** Event type name stays `crystal_earned` (it's an API contract, not user-facing). Only UI language changes.
- **Action:** Update ecosystem-contract.md to note that UI framing differs from API naming.

### CP-2: VOLAURA API Endpoints (still NOT BUILT)
- **Blocked items:** POST /api/character/events, GET /api/character/state, GET /api/character/crystals
- **Impact:** Crystal balance on ProgressPage will show locally-computed value only (no cross-product balance)
- **Action:** MindShift CTO builds local crystal balance tracking. VOLAURA CTO builds API endpoints in parallel. Integration happens post-launch.

### CP-3: Share Card as BrandedBy Input
- **What:** Share card PNG export (BATCH-X) could feed BrandedBy for video generation
- **Action:** Save share card PNG format spec in ecosystem-contract.md for BrandedBy CTO
- **Timing:** Post-launch

### CP-4: Room Code Format
- **What:** Room codes increased to 6 chars (BATCH-X heartbeat note)
- **Action:** Any VOLAURA room integration must use 6-char codes. Document in ecosystem-contract.md.

### CP-5: ZEUS Model Routing
- **What:** Research #12 recommends different LLMs for different task types. Currently all-haiku for 47 agents.
- **Impact on MindShift:** None directly. But if ZEUS orchestrates MindShift edge functions in future, routing matters.
- **Action:** VOLAURA CTO implements model routing. MindShift CTO stays on Gemini 2.5 Flash for edge functions (correct choice per Research #12 for content/creative tasks).

### CP-6: Persistent Memory for ZEUS
- **What:** Research #13 recommends episodic memory + sleep cycle consolidation for multi-agent swarms
- **Impact on MindShift:** If ZEUS agents interact with MindShift data, they need memory architecture
- **Action:** VOLAURA CTO implements. MindShift CTO provides event spec. No MindShift code changes.

### CP-7: Content Strategy Coordination
- **What:** Both products contribute to LinkedIn content queue
- **Action:** MindShift launch content (Phase 6.5) goes through VOLAURA content queue for brand consistency
- **File:** `VOLAURA/memory/swarm/content-queue/` -- add MindShift launch post

---

## RESEARCH-BACKED PRIORITY MATRIX

Every unbuilt item from all 17 research documents, ranked.

**Scoring:**
- Impact: 1-5 (5 = affects core user experience, 1 = nice-to-have)
- Effort: estimated hours
- Phase: recommended implementation phase

| # | Item | Impact | Effort (h) | Research | Phase | Status |
|---|------|--------|-----------|----------|-------|--------|
| 1 | Crystal chip: move from NatureBuffer to ProgressPage | 5 | 0.25 | #10 | P1 | TODO |
| 2 | XP display: identity framing ("Grower" not "2450 XP") | 5 | 0.3 | #10 | P1 | TODO |
| 3 | Hide locked achievements (surprise-only unlocks) | 4 | 0.25 | #10 | P1 | TODO |
| 4 | VR multiplier: hide formula from user | 4 | 0.15 | #10 | P1 | TODO |
| 5 | Language audit: "earned" to "contributed" | 4 | 0.4 | #10 | P1 | TODO |
| 6 | Next Tiny Action (micro-task prompt) | 5 | 4 | #3 | P3 | TODO |
| 7 | Font size control (3 presets) | 5 | 5 | #2, #5, #6 | P3 | TODO |
| 8 | If-Then Implementation Intentions | 4 | 7 | #16 | P3 | TODO |
| 9 | Data firewall (privacy panel in Settings) | 4 | 7 | #2 | P3 | TODO |
| 10 | Focus Proof (share card for sessions) | 3 | 5 | #1, #8 | P3 | TODO |
| 11 | Privacy policy: voice data disclosure | 4 | 0.3 | #7 | P1 | TODO |
| 12 | Default audio preset: pink not brown | 3 | 0.1 | #6 | P1 | TODO |
| 13 | Hyperfocus pattern: verify skipped buffer tracking | 3 | 0.15 | #2 | P1 | TODO |
| 14 | Container queries for tablet layout | 2 | 0.5 | #7 | P1 | TODO |
| 15 | FocusSetup: reduce to one-primary-action | 3 | 4 | #2 | v1.1 | DEFERRED |
| 16 | Crystal Shop (destination page) | 3 | 14 | #5, #10 | v1.1 | DEFERRED |
| 17 | Routine Resetter ("rebuild routine like LEGO") | 3 | 8 | #3 | v1.1 | DEFERRED |
| 18 | Quarterly Review (90-day analytics) | 2 | 10 | #3 | v1.1 | DEFERRED |
| 19 | Anti-Resolution (January protection) | 2 | 4 | #3 | v1.2 | DEFERRED |
| 20 | 16 Hz beta entrainment (AM layer on audio) | 3 | 8 | #6 | v1.2 | DEFERRED |
| 21 | Sustained haptic rhythm (0.2 BPM focus) | 2 | 6 | #6 | v1.2 | DEFERRED |
| 22 | Adjustable contrast toggle | 3 | 4 | #6 | v1.1 | DEFERRED |
| 23 | PostHog integration (Bayesian A/B testing) | 2 | 8 | #7 | v1.2 | DEFERRED |
| 24 | Voice-guided routines (Routinery competitor gap) | 2 | 20 | #5 | v2.0 | DEFERRED |
| 25 | Whisper WASM (private offline voice) | 3 | 16 | #7 | v2.0 | DEFERRED |
| 26 | On-device phenotyping (passive biometrics) | 2 | 40 | #2 | v3.0 | DEFERRED |
| 27 | Federated learning for burnout prediction | 1 | 60 | #2 | v3.0 | DEFERRED |
| 28 | Tab churn monitoring (browser tab switching) | 2 | 12 | #16 | v2.0 | DEFERRED |
| 29 | Voice companion (Mochi voice OUTPUT) | 3 | 20 | #16 | v2.0 | DEFERRED |
| 30 | Shame-free contract on onboarding Screen 1 | 3 | 1 | #4 | v1.1 | DEFERRED |
| 31 | Contextual medication question (not onboarding) | 2 | 3 | #4 | v1.1 | DEFERRED |
| 32 | "Professional" framing option (hide gamification) | 2 | 6 | #8 | v1.2 | DEFERRED |
| 33 | Gen X visual theme preset | 1 | 4 | #8 | v2.0 | DEFERRED |
| 34 | Email weekly digest for Gen X users | 1 | 8 | #8 | v2.0 | DEFERRED |
| 35 | Lifetime purchase option (when Stripe ships) | 4 | 12 | #5 | v1.1 | DEFERRED (needs Stripe) |
| 36 | User type selection in onboarding (adaptive UI) | 3 | 16 | #9 | v2.0 | DEFERRED |
| 37 | Frictionless task capture (NLP like Todoist) | 3 | 12 | #5 | v1.2 | DEFERRED |
| 38 | Cross-device distraction blocking | 2 | 20 | #5 | v2.0 | DEFERRED |
| 39 | Skeleton/Tissue file classification in CLAUDE.md | 2 | 1 | #17 | v1.1 | DEFERRED |
| 40 | WHISK context compression for CLAUDE.md | 2 | 2 | #14, #17 | v1.1 | DEFERRED |
| 41 | "What breaks your flow?" onboarding question | 3 | 2 | #4 | v1.1 | DEFERRED |
| 42 | iOS haptic DOM workaround (PWA-only) | 2 | 4 | #6 | v1.1 | DEFERRED |

### Summary by phase:

| Phase | Items | Total Effort | Timeline |
|-------|-------|-------------|----------|
| P1 (Quick Wins) | 8 items (#1-5, #11-14) | ~2.5 hours | Day 1-2 |
| P2 (Crystal Redesign) | 5 grouped changes | ~7 hours | Day 3-4 |
| P3 (New Features) | 5 features (#6-10) | ~28 hours | Day 5-8 |
| P4 (Validation) | Stakeholder feedback | ~4 hours active work | Day 9-10 |
| P5 (Polish + AAB) | Screenshots + build + E2E | ~11 hours | Day 11-12 |
| P6 (Docs + Launch) | README + listing + CLAUDE.md | ~7 hours | Day 13-14 |
| **TOTAL** | **24 items for launch** | **~60 hours** | **14 days** |

### Deferred backlog (v1.1+): 18 items, ~260 hours estimated

---

## DECISION LOG

Decisions made during plan creation that the CEO should review:

1. **Crystal Shop: DEFERRED to v1.1.** Rationale: shop without content is an empty room. Crystal balance on ProgressPage is sufficient for launch.

2. **"What breaks your flow?" onboarding: DEFERRED.** Rationale: Research #8 says 47% abandon long onboarding. We are already at 5 steps (recommended 3-4). Adding a 6th increases risk.

3. **Audio default stays as-is if already pink.** If brown is the current default, change to pink per Research #6. Verify before changing.

4. **FocusSetup one-action violation: DEFERRED.** Currently 6 elements. Research #2 recommends one-primary-action screens. This is a design debt sprint, not a launch blocker. Log for v1.1.

5. **Gen X visual themes: DEFERRED to v2.0.** MindShift targets 20-35 (Gen Z/Millennial boundary). Gen X coverage is bonus, not priority per Research #8.

6. **PostHog: DEFERRED to v1.2.** Current analytics (Vercel Analytics + Plausible) is sufficient for <1000 users. PostHog adds complexity and cost. Revisit after 1K MAU.

7. **Skeleton/Tissue classification: DEFERRED.** Good process improvement from Research #17, but no user impact. Do it when CLAUDE.md gets its next pruning pass.

---

## RISKS

1. **Google Play account verification still pending.** If not verified by April 19, the AAB build and screenshots are ready but cannot be submitted. Mitigation: continue PWA distribution via Vercel URL.

2. **Crystal economy changes may break VOLAURA integration tests.** Mitigation: API event names stay the same. Only UI language changes.

3. **Font size control may cause layout breakage in existing components.** Mitigation: use `rem` scaling (which most components already use), test on all 8 screenshot viewports.

4. **If-Then Intentions is a novel feature with no competitor reference.** Mitigation: ship as "experimental" with minimal UI. Gather data before expanding.

5. **Stakeholder validation (Phase 4) depends on external response times.** Mitigation: batch critical fixes, continue with AAB build in parallel.

---

*This plan was built from 17 research documents (~140,000 words), the ecosystem-sync.md state, the heartbeat.md snapshot, crystal-shop-ethics.md rules, and the current codebase state as of April 5, 2026.*
