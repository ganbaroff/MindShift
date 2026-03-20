# Google Play Featuring Strategy — MindShift

> Last updated: 2026-03-20
> Goal: Maximize chances of Google Play editorial featuring (Editors' Choice, category featuring, curated collections)

---

## A) Google's Official Featuring Criteria

### What the Editorial Team Looks For

Google Play's editorial team evaluates apps on five axes. There is no public application form for Editors' Choice — selection is editorially driven. However, developers can submit newly launched apps via the **Featuring Nomination** form (within 120 days of launch) and use **Promotional Content** to request featuring for time-bound events (limited requests per quarter, must submit 14+ days before event start).

| Criterion | What Google Means | Weight |
|-----------|-------------------|--------|
| **Quality** | Stability, performance, design, overall UX | Critical |
| **Innovation** | Unique features, creative concepts, novel approaches | High |
| **User Appeal** | Broad demographic value, solves real problems | High |
| **Relevance** | Aligns with current trends and user needs | Medium |
| **Overall Impact** | Positive category influence, demonstrates excellence | Medium |

**Key stat:** 85% of Google Play featured apps maintain ratings of 4.0+. Median rating for Editors' Choice apps is **4.5** (vs. platform average of 3.8).

### Android Vitals Thresholds (Core Quality Bar)

Google Play uses the last 28 days of data. Exceeding bad behavior thresholds reduces store visibility and may trigger user-facing warnings.

| Metric | Bad Behavior Threshold | Impact |
|--------|----------------------|--------|
| **User-perceived crash rate** | >1.09% (all sessions) or >8% (per device) | Visibility reduction |
| **User-perceived ANR rate** | >0.47% (all sessions) or >4.72% (per device) | Visibility reduction |
| **Excessive partial wake locks** | Threshold TBD (enforcement started March 2026) | Battery drain warning on listing |
| **Low memory kills (LMKs)** | New metric — no hard threshold yet | Perceived as crashes by users |

**Emerging issues:** Android Vitals flags problems affecting devices for 7+ days, giving you 21 days to fix before consequences.

### Design Quality Expectations

- Follow **Material Design 3 Expressive** (launched 2025) — bolder colors, fluid animations, adaptive layouts
- High-resolution assets throughout (720p minimum, 1080p preferred)
- Intuitive navigation and polished transitions
- Consistent visual language across all screens
- Dark theme support (Android system-level)

### Innovation & Uniqueness Factors

Google explicitly rewards:
- Novel use of Android platform features (widgets, shortcuts, PiP, Wear OS)
- Accessibility innovation beyond baseline compliance
- AI/ML integration that genuinely improves UX
- Cross-device optimization (phone, tablet, foldable, Chromebook)
- Offline capability and progressive enhancement

### User Engagement Metrics They Track

- **Retention rates** (Day 1, Day 7, Day 30)
- **Session frequency and duration**
- **Uninstall rate** (high uninstall = poor quality signal)
- **Review responsiveness** (developer replies to reviews)
- **Update frequency** (regular meaningful updates)
- **Crash-free user rate** (inverse of crash rate)

---

## B) What MindShift Already Has (Strengths)

MindShift is positioned well for featuring. Here is what already aligns with Google's criteria:

### Unique Niche Positioning
- [x] ADHD-specialized productivity — underserved market with growing awareness
- [x] Neuroscience-grounded features (struggle/release/flow phases, Research #2)
- [x] Non-punitive design philosophy — no red, no shame mechanics, no streak-break penalties
- [x] Energy-aware UX that adapts to user state (low-energy auto-simplify)
- This is a **strong innovation story** — most productivity apps punish ADHD users

### Accessibility (WCAG AA)
- [x] Full keyboard navigation with focus-visible rings
- [x] Screen reader support (aria-labels, aria-pressed, aria-expanded)
- [x] Reduced motion mode via `useMotion()` hook — system-wide
- [x] ADHD-safe color palette (no red, teal/indigo/gold only)
- [x] Haptic feedback with 9 distinct patterns (can be toggled)
- [x] Color never conveys information alone (always paired with text/icon)
- Google specifically highlights accessibility as a featuring factor

### Offline-First PWA
- [x] Service worker with CacheFirst strategy
- [x] IndexedDB state persistence (no 5MB localStorage limit)
- [x] Offline indicator (gold bar) with reconnect confirmation
- [x] Guest mode works fully offline without any account
- [x] Optimistic mutations with enqueue/dequeue pattern

### AI Personalization
- [x] Mochi AI companion — psychotype-aware, energy-aware, behavior-aware
- [x] AI task decomposition (decompose-task edge function)
- [x] AI weekly insights from session data
- [x] AI recovery messages after absence
- [x] Voice input with AI classification
- [x] Rate-limited (10/day free) with hardcoded fallbacks — responsible AI

### Internationalization
- [x] English + Russian language support
- [x] i18n foundation with `t()` function and `{{placeholder}}` interpolation
- [x] All AI edge functions receive user locale for native-language responses

### Privacy-First Design
- [x] GDPR compliant (export + delete edge functions)
- [x] No ads, no tracking pixels, no data selling
- [x] Cookie consent banner
- [x] Anonymous focus rooms (no identity exposure)
- [x] Guest mode without any account required
- [x] Minimal permissions model

### Technical Foundation
- [x] Capacitor config ready for native Android build
- [x] PWA manifest with 4 app shortcuts
- [x] React.memo with custom comparators on list items
- [x] Lazy-loaded overlays (code splitting)
- [x] Per-route error boundaries
- [x] 132/132 E2E tests passing

---

## C) What We Should Add for Maximum Featuring Chance

### C1: Critical — Must Have Before Launch

#### Native Android Build Quality
- [ ] **Generate signed AAB** (Android App Bundle) via Capacitor — Google Play requires AAB, not APK
- [ ] **Adaptive icon** with foreground/background layers (Android 8.0+ standard)
- [ ] **Splash screen** via Android 12+ SplashScreen API (not the old Capacitor splash)
- [ ] **Edge-to-edge display** — draw behind system bars (status bar + navigation bar)
- [ ] **Predictive back gesture** support (Android 14+ requirement for new apps)
- [ ] **Target SDK 35** (Android 15) — Google Play requires targeting recent SDK

#### Android Vitals Readiness
- [ ] **Integrate Firebase Crashlytics** (or keep Sentry) — monitor crash/ANR rates from day one
- [ ] **Profile memory usage** — ensure no memory leaks in long focus sessions (45+ min)
- [ ] **Audit wake locks** — verify useAudioEngine releases audio context properly when backgrounded
- [ ] **Test on low-end devices** — Samsung A-series, Redmi budget phones (target 2GB RAM)
- [ ] **Background audio handling** — ensure audio engine doesn't drain battery when app is backgrounded

#### Store Listing Assets
- [ ] **Feature graphic** (1024x500 px) — required for featuring consideration
- [ ] **Phone screenshots** (minimum 4, recommend 8) — 16:9 or 9:16, min 1080px on short side
- [ ] **7-inch tablet screenshots** (minimum 1, recommend 4) — 1920x1080 preferred
- [ ] **10-inch tablet screenshots** (minimum 1, recommend 4) — 1920x1200 preferred
- [ ] **Promotional video** (30-120 seconds, YouTube link) — strongly recommended for featuring
- [ ] **Short description** optimized for keywords (current one is solid, already 80 chars)

#### Rating Strategy
- [ ] **In-app review prompt** via Google Play In-App Review API (`com.google.android.play:review`)
  - Trigger after: 3rd completed focus session AND rating >= 4.0 app-internal satisfaction
  - Never trigger during low-energy state or after failed session
  - Max once per 30 days
  - ADHD-friendly: brief, non-blocking, dismissible
- [ ] **Respond to every review** within 24 hours — Google tracks developer responsiveness

### C2: High Impact — Strong Featuring Signal

#### Tablet & Large Screen Optimization
- [ ] **Adaptive layout** — two-column layout on tablets (task list + detail/focus timer side by side)
- [ ] **Foldable posture support** — tabletop mode for timer (top: arc timer, bottom: controls)
- [ ] **Multi-window support** — ensure app works in split-screen mode
- [ ] **Keyboard + mouse input** — for Chromebook users (already have keyboard nav, add mouse hover states)
- [ ] **Tablet-specific screenshots** in store listing
- [ ] **"Designed for tablets" badge** unlocked by providing tablet screenshots

Google explicitly rewards large-screen optimization and is investing heavily in this area.

#### Android Home Screen Widget
- [ ] **Focus Timer widget** — shows today's focus minutes vs. daily goal (progress ring)
- [ ] **Quick Start widget** — one-tap to launch 5-min or 25-min focus session
- [ ] **Task widget** — shows NOW pool (max 3 tasks) with tap-to-complete
- [ ] Use **Glance** (Jetpack Compose for widgets) for modern Material 3 look
- [ ] Register widgets in `AndroidManifest.xml` with preview images

Google launched a dedicated **Widgets editorial page** in 2025 and added widget search filters + widget badges on app listings. Apps with quality widgets get boosted discovery.

#### Material Design 3 Alignment
- [ ] **Dynamic color** — support Material You color extraction from user wallpaper
- [ ] **M3 shape system** — rounded corners consistent with M3 spec (medium: 12dp, large: 16dp)
- [ ] **M3 typography scale** — align with Material type scale tokens
- [ ] **Motion tokens** — align transitions with M3 Expressive motion curves
- [ ] Keep custom ADHD palette as override — M3 dynamic color as optional "match my phone" mode in Settings

Note: MindShift's calm palette is a feature, not a limitation. Offer M3 dynamic color as an option but keep the ADHD-safe palette as default.

#### App Shortcuts (Enhanced)
- [ ] **Dynamic shortcuts** via Android ShortcutManager — "Continue: [current task name]"
- [ ] **Pinned shortcuts** — let users pin their most-used focus duration to home screen
- [ ] Current PWA shortcuts (4 defined in manifest.json) are a good start

### C3: Medium Impact — Differentiation

#### Wear OS Companion
- [ ] **Timer display** on watch — show focus phase (struggle/release/flow) with color ring
- [ ] **Haptic phase transitions** — wrist tap when entering flow state
- [ ] **Quick glance** — today's focus minutes on watch face complication
- [ ] **Session control** — start/pause/end from wrist
- Uses Android's cross-device story (phone + watch) which Google actively promotes

#### Picture-in-Picture (PiP) for Focus Timer
- [ ] **PiP mode** when user leaves app during active session — small floating timer
- [ ] Show phase color + elapsed time only (minimal distraction)
- [ ] Tap to return to full app
- [ ] Aligns with Android's multitasking strengths

#### Accessibility Extras Google Specifically Calls Out
- [ ] **Google Play accessibility tags** — register for: "Screen reader-friendly", "Learning disability"
- [ ] **TalkBack optimization** — test full flows with TalkBack enabled
- [ ] **Switch Access compatibility** — verify all interactive elements are reachable
- [ ] **High contrast text mode** support
- [ ] **Custom accessibility actions** on task cards (complete, park, move to someday)
- [ ] **Content descriptions** on all SVG/Canvas elements (ArcTimer, Mochi mascot)

#### Additional Language Support
- [ ] **Spanish** — 2nd most spoken language globally, large ADHD awareness market
- [ ] **German** — strong mental health app market in DACH region
- [ ] **Portuguese (BR)** — Google requiring developer verification in Brazil starting late 2026
- [ ] **Turkish** — natural fit given developer background
- Each new locale significantly improves featuring chances in that region

### C4: Nice to Have — Polish

#### Sound & Haptic Refinements
- [ ] **Haptic feedback aligned with Material 3** haptic guidelines
- [ ] **Audio focus handling** — duck/pause other apps properly via Android AudioFocus API
- [ ] **Media session integration** — show focus session in notification shade with controls
- [ ] **Bluetooth audio** — verify phase-adaptive volume works correctly over BT

#### Progressive Web App to Native Bridge
- [ ] **Deep links** — `mindshift://focus`, `mindshift://tasks` (Android App Links)
- [ ] **Share target** — register as share target so users can share text -> create task
- [ ] **Notification channels** — separate channels for reminders, focus nudges, rituals (Android 8.0+)
- [ ] **Foreground service** for active focus sessions — prevents system kill during long sessions

---

## D) App Store Optimization (ASO)

### D1: Keyword Strategy

**Primary keywords** (high volume, target in title + short description):
- `adhd planner` / `adhd focus` / `adhd app`
- `focus timer` / `productivity`

**Secondary keywords** (target in full description, naturally):
- `body doubling` / `brown noise` / `pink noise`
- `neurodivergent` / `executive function` / `time blindness`
- `pomodoro alternative` / `calm productivity`
- `adhd task manager` / `energy tracking`

**Long-tail keywords** (target in full description):
- `adhd friendly productivity app`
- `focus timer with brown noise`
- `body doubling app`
- `adhd burnout prevention`

**Keyword placement rules:**
- Title (30 chars): `MindShift — ADHD Focus` (current is good)
- Short description (80 chars): Include 2-3 primary keywords naturally
- Full description: Use each target keyword 2-3 times naturally (no stuffing)
- Google indexes title, short description, and full description
- Reviews and developer name also factor into search ranking

### D2: Screenshot Best Practices

| # | Screen | Caption | Purpose |
|---|--------|---------|---------|
| 1 | Home screen with Mochi + tasks | "Your calm command center" | First impression — shows unique personality |
| 2 | Focus timer in flow phase (teal arc) | "Focus sessions that adapt to your brain" | Core feature — visually striking |
| 3 | Task pools (NOW/NEXT/SOMEDAY) | "Three pools. Zero overwhelm." | Task management differentiator |
| 4 | Energy picker + low-energy mode | "Low energy? The app adjusts." | Unique selling point — energy awareness |
| 5 | Sound presets (brown/pink noise) | "Your focus soundtrack, built in" | Feature depth |
| 6 | Focus room with peer count | "Focus with others. Anonymously." | Social proof without identity |
| 7 | Progress + achievements | "Track progress. No guilt." | Retention + gamification done right |
| 8 | Settings (motion/sound/accessibility) | "Customizable for every brain" | Accessibility + customization story |

**Design rules:**
- Use device frames (Pixel 8 Pro for phone, Pixel Tablet for tablet)
- Dark theme (matches app default) with high contrast captions
- Caption text: 24-32pt, max 2 lines, white on dark overlay
- Show real app UI, not mockups — Google penalizes misleading screenshots
- First 3 screenshots visible without scrolling — make them count

### D3: Video Preview Recommendations

- **Length:** 30-60 seconds (YouTube, landscape orientation)
- **Structure:**
  1. (0-5s) Problem statement: "Most productivity apps fight your ADHD brain"
  2. (5-20s) Core loop: task creation -> focus session start -> phase transitions
  3. (20-35s) Differentiation: energy tracking, low-energy mode, Mochi companion
  4. (35-50s) Social proof: focus rooms, ambient orbit, anonymous co-working
  5. (50-60s) Close: "Focus made kind. Download free."
- **Audio:** Use MindShift's own brown noise as background, soft voiceover or captions only
- **No fake reviews or misleading claims**
- **Include captions** (accessibility + many users watch without sound)

### D4: Rating & Review Strategy

- [ ] Implement Google Play In-App Review API with ADHD-aware triggers (see C1 above)
- [ ] Reply to every review within 24 hours — template responses for common themes:
  - Positive: Thank + mention upcoming feature they'd like
  - Negative: Empathize + explain fix timeline + invite to email for direct help
  - Feature request: Acknowledge + add to backlog visibility
- [ ] Never incentivize reviews (Google policy violation)
- [ ] Track rating trend weekly — target 4.5+ average
- [ ] If rating drops below 4.0, pause featuring requests and focus on fixes

---

## E) Timeline & Priority

### Phase 1: Pre-Launch (Weeks 1-3)

**Week 1: Native Build Foundation**
- [ ] Run `npx cap add android` and verify build compiles
- [ ] Set `targetSdkVersion 35` in `build.gradle`
- [ ] Generate signed AAB with release keystore
- [ ] Create adaptive icon (foreground SVG + background color layer)
- [ ] Integrate Firebase Crashlytics or verify Sentry Android SDK works in Capacitor
- [ ] Set up Android notification channels (reminders, focus, rituals)
- [ ] Test on 3 physical devices: flagship, mid-range, budget

**Week 2: Store Listing & Assets**
- [ ] Design feature graphic (1024x500)
- [ ] Capture 8 phone screenshots with device frames + captions
- [ ] Capture 4 tablet screenshots (7" + 10")
- [ ] Record 45-second promotional video
- [ ] Finalize store listing copy (already drafted in `docs/play-store-listing.md`)
- [ ] Complete IARC content rating questionnaire
- [ ] Set up Google Play Console: create app, upload listing, configure pricing (free)

**Week 3: Quality Assurance**
- [ ] Profile memory on 45-min session (no leaks)
- [ ] Audit wake lock behavior when backgrounded
- [ ] Test with TalkBack screen reader — full task creation + focus session flow
- [ ] Test in split-screen / multi-window mode
- [ ] Fix any ANR-prone paths (heavy main thread work)
- [ ] Verify offline mode works in native build
- [ ] Run `tsc -b && vite build && npx cap sync` — clean build

### Phase 2: Launch Week (Week 4)

- [ ] Submit to Google Play as **closed testing** first (internal track)
- [ ] Invite 10-20 beta testers for 3-day soak test
- [ ] Monitor Crashlytics/Sentry for crash rate (target <0.5%)
- [ ] Fix any critical issues found in testing
- [ ] Promote to **open testing** for 3 more days
- [ ] Review Android Vitals dashboard — all metrics green
- [ ] **Production release** with staged rollout (20% -> 50% -> 100% over 5 days)
- [ ] Submit **Featuring Nomination form** on launch day (within 120-day window)

### Phase 3: First 30 Days Post-Launch

**Week 5-6: Engagement & Ratings**
- [ ] Implement In-App Review API with smart triggers
- [ ] Reply to every review within 24 hours
- [ ] Submit first **Promotional Content** event (e.g., "ADHD Awareness feature spotlight")
- [ ] Publish first meaningful update (bug fixes + 1 new feature)
- [ ] Share launch on ADHD communities (Reddit r/ADHD, Twitter/X, TikTok)
- [ ] Track Day-1 / Day-7 retention — target D1 >40%, D7 >20%

**Week 7-8: Feature Expansion**
- [ ] Ship Android home screen widget (Focus Timer + Task widget)
- [ ] Add tablet adaptive layout (two-column)
- [ ] Add 1 new language (Spanish or German)
- [ ] Submit second Promotional Content event
- [ ] Monitor Android Vitals weekly — maintain green on all metrics
- [ ] Target: 500+ installs, 4.3+ rating, <1% crash rate

### Phase 4: Featuring Push (Days 30-90)

**Months 2-3: Premium Quality**
- [ ] Ship Wear OS companion (timer + haptics)
- [ ] Add PiP mode for focus timer
- [ ] Register Google Play accessibility tags
- [ ] Add 2 more languages
- [ ] Reach 1,000+ installs with 4.5+ rating
- [ ] Submit for **Google Play Indie Games/Apps Corner** (if eligible)
- [ ] Apply for **Google Play Pass** nomination (if app goes premium/IAP)
- [ ] Re-submit Featuring Nomination if not yet featured
- [ ] Engage with Google Play developer relations (DevRel) if contacts available

**Ongoing: Maintain Featuring Eligibility**
- [ ] Ship meaningful updates every 2-4 weeks
- [ ] Maintain 4.5+ rating
- [ ] Keep crash rate <0.5%, ANR rate <0.2%
- [ ] Respond to 100% of reviews
- [ ] Use Promotional Content for seasonal events (ADHD Awareness Month = October)
- [ ] Monitor competitive landscape — stay ahead on ADHD-specific features
- [ ] Never let the app stagnate — Google tracks update frequency

---

## F) Competitive Positioning for Editors

When pitching in the Featuring Nomination form, emphasize these differentiators:

| What We Say | Why It Matters to Google |
|-------------|------------------------|
| "First ADHD productivity app with neuroscience-based focus phases" | Innovation + underserved market |
| "Energy-aware UI that simplifies itself when the user is struggling" | Accessibility innovation |
| "Zero shame mechanics — no red, no broken streak penalties, no guilt" | Inclusive design philosophy |
| "AI companion that respects boundaries (not a coach, not a therapist)" | Responsible AI |
| "Anonymous body-doubling in Focus Rooms" | Novel social feature without privacy risk |
| "WCAG AA accessible with reduced motion, haptic toggle, screen reader" | Accessibility depth |
| "Works offline-first — every feature works without internet" | Technical quality |
| "GDPR compliant, no ads, no tracking, guest mode" | Privacy-first (trending in editorial picks) |

---

## G) Resources & Links

- [Google Play Console — Getting Featured](https://play.google.com/console/about/guides/featuring/)
- [Google Play Console — Promotional Content](https://support.google.com/googleplay/android-developer/answer/12932541)
- [Android Vitals Documentation](https://developer.android.google.cn/topic/performance/vitals)
- [Large Screen App Quality Guidelines](https://developer.android.com/docs/quality-guidelines/large-screen-app-quality)
- [Google Play Academy](https://playacademy.withgoogle.com/)
- [Material Design 3 Expressive](https://m3.material.io/)
- [Google Play Widget Discovery (2025)](https://android-developers.googleblog.com/2025/03/google-play-enhances-widget-discovery.html)
- [Google Play Accessibility Tags](https://support.google.com/googleplay/answer/16318151)
- [Google Play Pass Nomination Form](https://docs.google.com/forms/d/e/1FAIpQLSdmL0YkKrklqZHTcb6sVZLnSXA7Tf5TELppa0mx7tAn1x3AJA/viewform)
- [AppTweak — How to Get Featured (2026)](https://www.apptweak.com/en/aso-blog/how-to-get-your-app-featured-on-the-app-store)
- [Google Play Developer Policy Center](https://play.google/developer-content-policy/)
