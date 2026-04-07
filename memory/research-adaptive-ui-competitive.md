# Adaptive Visual UI — Competitive Fact-Check (2026-04-07)

## The Claim Being Tested

> "Nobody in the world ships combined adaptive visual UI that responds to user state
> (typography + spacing + motion + color all together)."

## Verdict in One Line

**The claim is PARTIALLY TRUE but dangerously imprecise.** What no shipping consumer
product does exactly — but adjacent pieces ship everywhere, and the gap is narrower
than a naive reading suggests. "First in the world" is a marketing claim we cannot
defend; "first to combine these four axes in a single ADHD-aware productivity PWA driven
by user-declared energy state" is defensible.

Read the full analysis before making any marketing claim.

---

## The Five Things That Actually Matter (Skip to these)

1. **Nobody ships consumer-grade real-time visual UI adaptation from inferred state.**
   Every research paper reviewed (Face2Feel, AdaptAI, NeuroSphere, Easy Reading,
   HCEye) confirms this explicitly: "dynamically changing user interfaces based on
   emotional states are not yet widely implemented" (2025 arxiv review).

2. **Everyone ships pieces.** Apple has Dynamic Type + Reduce Motion + Smart Invert +
   Focus Modes. Google has Material 3 Expressive with adaptive shape+color+motion.
   Microsoft has Fluent 2 Mica. Linear has a static "calmer interface." Endel has
   heart-rate-driven audio with matching visuals. None of these COMPOSE into one
   coherent user-state signal driving four visual axes simultaneously.

3. **The closest prior art is Apple's Focus Modes + Sleep Focus** — it switches home
   screen layout, dims display, forces dark mode, and filters apps. But: (a) the
   trigger is manual/scheduled, not user state; (b) it's a binary switch between
   pre-built modes, not a continuous adaptive layer; (c) only one visual axis moves
   at a time (brightness + chrome), not typography/spacing/motion/color in concert.

4. **Research is catching up fast.** CHI 2025 Late-Breaking Work accepted AdaptAI
   (multimodal state inference for ADHD professionals). Face2Feel published Oct 2025.
   A 2025 review found 85.7% user preference for emotion-adaptive UIs. The window
   between "nobody ships this" and "everyone ships this" will likely close in 18-36
   months once Apple or Google ships a reference implementation.

5. **"Combined adaptive layer" is genuinely novel — but "typography + spacing + motion
   + color from energy state" is not as unique as it sounds.** If the energy state is
   user-declared (not inferred from biometrics), the novelty collapses into
   "conditional styling based on a Zustand field" — which is a tiny amount of code.
   The DIFFERENTIATOR is the IDEA and the ADHD-specific design intent, not the
   technical innovation.

---

## Per-Product Breakdown

Format per entry:
- **What adapts:** visual / audio / content / layout / none
- **Signal:** manual / scheduled / sensor / inference
- **Sophistication:** 1 axis / combined / none
- **State-adaptive or personalization?**
- **Shipping / research?**

### 1. Apple Intelligence (iOS 18 / iOS 26 / macOS 15)

- **What adapts:** content prioritization (notification summaries, Mail priority),
  NOT visual UI layers. Writing tools adapt output to user-chosen tone.
- **Signal:** content inference (what notifications you receive), not user state.
- **Sophistication:** 1 axis (content relevance).
- **Personalization, not state-adaptive.** Apple Intelligence does not change
  typography, spacing, motion, or color based on user cognitive load.
- **Shipping** (iOS 18.4+ on A17 Pro / M-series).

**Verdict:** Does NOT compete on visual adaptation. Competes on content/priority layer.

Sources:
- [Apple Newsroom — Apple Intelligence updates](https://www.apple.com/newsroom/2025/06/apple-intelligence-gets-even-more-powerful-with-new-capabilities-across-apple-devices/)
- [Apple Intelligence — Wikipedia](https://en.wikipedia.org/wiki/Apple_Intelligence)

### 2. Apple Accessibility Stack (Dynamic Type + Reduce Motion + Smart Invert + Increase Contrast + Reduce Transparency + Assistive Access + Focus Modes)

This is the CLOSEST PRIOR ART to MindShift's adaptive visual layer.

- **What adapts:**
  - Dynamic Type — typography scale only (user-set in Settings).
  - Reduce Motion — kills animations (binary toggle).
  - Smart Invert — inverts colors except media (binary toggle).
  - Increase Contrast — raises contrast ratio (binary toggle).
  - Reduce Transparency — removes blur effects (binary toggle).
  - Assistive Access — entirely different simplified UI with high-contrast buttons
    and large labels (iOS 17+).
  - Focus Modes (Sleep Focus) — dims display, filters apps, switches home screen,
    can force dark mode.
- **Signal:** user preference in Settings (Dynamic Type, Reduce Motion, etc.) OR
  scheduled/manual activation (Focus Modes).
- **Sophistication:** Each axis is independent. All axes compose, but they DO NOT
  respond to a unified "energy state" signal. User must manually compose them.
- **NOT state-adaptive.** All triggers are either persistent user preferences OR
  manual/time-based activation.
- **Shipping** (all features GA on iOS 18).

**Verdict:** Apple ships every individual primitive MindShift needs. What Apple does
NOT do is bind those primitives to a single user-state signal (energy level, burnout
score). Apple's stack is "user-configured accessibility accommodations," not
"real-time adaptive UI from cognitive state." MindShift's novelty is the COMPOSITION
ENGINE, not the individual visual axes.

Sources:
- [Apple — Reduce Motion](https://support.apple.com/en-us/111781)
- [Apple — Assistive Access User Guide](https://support.apple.com/guide/assistive-access-iphone/welcome/ios)
- [Apple — Accessibility](https://www.apple.com/accessibility/)
- [Apple — Sleep Focus](https://support.apple.com/guide/iphone/turn-sleep-focus-on-or-off-iph7cdb86325/ios)

### 3. Apple Watch — State of Mind (watchOS 10+)

- **What adapts:** a single animated SVG shape changes color and form as you spin
  the Digital Crown to log your mood. This is LOGGING UI, not APP-WIDE adaptation.
- **Signal:** user explicitly spins the crown.
- **Sophistication:** 1 visual element on 1 screen.
- **Personalization of mood logging, not state-adaptive UI.**
- **Shipping** (watchOS 10+).

**Verdict:** This is a cute mood logger, not adaptive UI. Not a competitor.

Source: [Apple — Log your state of mind on Apple Watch](https://support.apple.com/guide/watch/log-your-state-of-mind-apd7de0f5610/watchos)

### 4. Google Material 3 Expressive (Android 16, 2025-2026)

- **What adapts:** color theming (from wallpaper via dynamic color), shape
  personalization, motion emphasis per component, size-based hierarchy. Users can
  pick "Pro" vs "Expressive" intensity at design-system level.
- **Signal:** user theme pick + OS setting. NOT user cognitive state.
- **Sophistication:** Multi-axis (color + shape + motion + size), but the axes are
  set at design time or by the user, not inferred in real-time.
- **NOT state-adaptive.** The system supports motion reduction and contrast control
  via OS accessibility settings, but there is NO "Calm Mode" tied to user state.
- **Shipping** (Android 16).

**IMPORTANT:** Multiple blog posts (supercharge.design, archyde.com, zignuts.com)
claim Material 3 Expressive includes a "Calm Mode" feature that reduces motion,
simplifies decoration, and prioritizes text for neurodivergent users. **This claim
does not appear in Google's official I/O 2025 session, the android-developers blog,
or m3.material.io documentation.** It appears to be blog extrapolation from Google's
accessibility defaults (motion reduction from OS setting + contrast from Material
Theme). Do NOT cite "Material 3 Expressive Calm Mode" as prior art — it is not a
documented Google feature as of April 2026.

Sources:
- [Google I/O 2025 — Build next-level UX with Material 3 Expressive](https://io.google/2025/explore/technical-session-24/)
- [Android Developers Blog — Android Design at Google I/O 2025](https://android-developers.googleblog.com/2025/05/android-design-google-io-25.html)
- [Material 3 official site](https://m3.material.io/)
- [Dezeen — Material Design Expressive interfaces](https://www.dezeen.com/2025/05/28/google-ushers-in-age-of-expressive-interfaces-with-material-design-update/)
- [supercharge.design — blog claiming "Calm Mode"](https://supercharge.design/blog/material-3-expressive) (UNVERIFIED)

### 5. Microsoft Fluent 2 — Mica & Acrylic

- **What adapts:** background tint follows desktop wallpaper (active window) or
  neutral (inactive); falls back to solid color under Battery Saver, low-end
  hardware, or transparency-disabled. Respects light/dark mode.
- **Signal:** window focus + system settings.
- **Sophistication:** 1 axis (background opacity/tint).
- **NOT state-adaptive.** Responds to window focus and system settings, not user.
- **Shipping** (Windows 11).

**Verdict:** Pure system-level chrome adaptation. Not a competitor.

Sources:
- [Microsoft Learn — Mica material](https://learn.microsoft.com/en-us/windows/apps/design/style/mica)
- [Microsoft Learn — Acrylic material](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic)
- [Fluent 2 Design System — Material](https://fluent2.microsoft.design/material)

### 6. Spotify

- **What adapts:** content (what music plays), recommendations, AI DJ narration. Has
  context-adaptive models using location, time of day, activity. Prompted Playlists
  can generate music that transitions from workout intensity to cool-down.
- **Signal:** listening history + location + time + time of day (NOT biometric, NOT
  UI-affecting).
- **Sophistication:** content layer only — zero visual adaptation.
- **Personalization, not state-adaptive UI.**
- **Shipping**.

**Verdict:** Deep content adaptation, zero UI adaptation. Not a competitor for the
visual claim. If the claim were "combined adaptive content", Spotify would be ahead.

Sources:
- [Spotify NeurIPS 2025 research](https://research.atspotify.com/2025/11/transforming-ai-research-into-personalized-listening-spotify-at-neurips-2025)
- [Spotify Newsroom — Prompted Playlists](https://newsroom.spotify.com/2025-12-10/spotify-prompted-playlists-algorithm-gustav-soderstrom/)

### 7. Duolingo

- **What adapts:** lesson difficulty (BirdBrain ML model), content sequencing,
  exercise types, pacing. Server-driven UI for layout experiments.
- **Signal:** performance signals (accuracy, time, retry rate).
- **Sophistication:** content + layout experiments, not visual state.
- **Personalization, not state-adaptive UI.** Duolingo has faced criticism for using
  guilt-driven gamification (streaks, owl notifications). The removal of the Crown
  system is the opposite of adaptive UI — it is static de-gamification.
- **Shipping**.

**Verdict:** Content adaptation is deep. Visual UI adaptation is zero. Not a
competitor for the visual claim.

Sources:
- [Duolingo Blog — Server-driven UI](https://blog.duolingo.com/server-driven-ui/)
- [Chief AI Officer — Duolingo AI strategy](https://chiefaiofficer.com/duolingos-ai-strategy-fuels-51-user-growth-and-1b-revenue/)

### 8. Headspace + Calm

- **What adapts:** each meditation has its OWN visual theme (colors, animations)
  that matches content mood. Daily Calm sessions curated by mood playlist choice.
- **Signal:** user-picked meditation or mood input.
- **Sophistication:** every meditation is its own "scene," but the APP CHROME does
  not adapt. User sees different meditations, not a different app.
- **Content-themed, not state-adaptive.**
- **Shipping**.

**Verdict:** Every scene has its own visual vocabulary, but there is no single
"state-adaptive layer" that re-skins the rest of the app based on the user's stress.

Sources:
- [Headspace](https://www.headspace.com/)
- [How to Create a Meditation App (Globaldev)](https://globaldevgroup.medium.com/how-to-create-a-meditation-app-based-on-the-examples-of-calm-and-headspace-25af32b87579)

### 9. Endel

This is the single most relevant comparison for the "combined adaptive layer" claim.

- **What adapts:** generative soundscape + matching generative visual. Soundscape
  tempo adjusts to real-time heart rate (via Apple Watch / Google Fit). Visuals are
  generated in real-time alongside sound — "animations react to changes in input,
  and by the direction of the flow, you can quickly judge if the energy is rising
  or falling."
- **Signal:** heart rate + time of day + weather + location + circadian rhythm +
  activity (walking cadence).
- **Sophistication:** combined audio + visual, driven by multi-modal biometric
  input. This IS a combined adaptive layer.
- **State-adaptive.** Driven by real biometric signals.
- **Shipping** (iOS/Android/Apple Watch/Mac/Apple TV).

**VERDICT:** Endel IS a counter-example to "nobody ships combined adaptive visual UI
that responds to user state." Endel's visuals respond to heart rate in real time and
compose with audio. However:

1. Endel's visual layer is a single GENERATIVE VISUAL (like a screensaver), not a
   full app UI with typography, spacing, buttons, lists. It does not adjust task
   cards or reading layouts.
2. Endel's adaptation is about soundscape energy, not cognitive load or ADHD energy
   state.
3. Endel does not adapt typography or spacing at all.

**This means the claim "nobody ships combined adaptive visual UI" is false in the
strict sense (Endel does) but true if scoped to "productivity/task app with
typography + spacing + motion + color layer tied to user energy state."**

Sources:
- [Endel Technology](https://endel.io/technology)
- [Endel Personal Inputs](https://endel.zendesk.com/hc/en-us/articles/360011955640-Personal-Inputs)
- [Amazon Science — The science behind Endel](https://www.amazon.science/latest-news/the-science-behind-endels-ai-powered-soundscapes)

### 10. YouTube Shorts / TikTok / Instagram Reels

- **What adapts:** CONTENT feed only. Algorithm learns preferences.
- **Signal:** engagement.
- **Sophistication:** content only, zero visual UI adaptation.
- **NOT state-adaptive in user's favor — OPPOSITE.** These platforms are engineered
  to EXPLOIT state, not serve it. Research from CHI/psychology consistently links
  short-video platforms to attention deficit, cognitive fatigue, "TikTok brain,"
  scroll fatigue affecting 61% of 18-34 users.
- **Shipping**.

**Verdict:** Direct inversion of MindShift's intent. These are anti-examples, not
competitors.

Sources:
- [psypost.org — TikTok meta-analysis](https://www.psypost.org/large-meta-analysis-links-tiktok-and-instagram-reels-to-poorer-cognitive-and-mental-health/)
- [PMC — mobile phone short video EEG study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11236742/)

### 11. Notion / Notion AI

- **What adapts:** AI agents adapt to writing style and workflow. Adaptive content
  generation. Notion 3.0 (Sep 2025) introduced agents with multi-step actions.
- **Signal:** user language + document history.
- **Sophistication:** AI content personalization, zero visual state adaptation.
- **Personalization, not state-adaptive UI.**
- **Shipping**.

**Verdict:** Zero visual UI adaptation based on user state.

Source: [Notion AI for Work](https://www.notion.com/blog/notion-ai-for-work)

### 12. Linear — "Calmer Interface" (March 2026)

- **What adapts:** nothing dynamically. Linear did a UI REFRESH in March 2026
  described as "a calmer interface for a product in motion." They dimmed the
  sidebar, made tabs more compact, and reduced visual weight of non-primary
  elements. This is a STATIC redesign, not adaptive.
- **Signal:** none.
- **Sophistication:** static visual hierarchy redesign.
- **NOT state-adaptive.**
- **Shipping**.

**Verdict:** "Calm" is a static design property, not a response to user state.
Linear does not adapt based on workload or energy.

Source: [Linear — A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh)

### 13. Arc Browser — Boosts

- **What adapts:** user-authored per-site CSS/JS modifications (fonts, colors, hide
  elements). Boosts 2.0 adds Zap tool to remove elements.
- **Signal:** user-authored rules.
- **Sophistication:** per-site theming, manually defined.
- **NOT state-adaptive — user manually authors Boosts.**
- **Shipping** (though Arc itself is in a weird spot as Browser Company pivoted to
  Dia).

**Verdict:** User-controlled customization, not state-aware.

Source: [Arc Help Center — Boosts](https://resources.arc.net/hc/en-us/articles/19212718608151-Boosts-Customize-Any-Website)

### 14. Figma (the tool itself)

- **What adapts:** progressive disclosure in menus (expert vs beginner tools tucked
  into panels). Not a dynamic adaptation — a layout choice.
- **Signal:** none.
- **Sophistication:** static information architecture.
- **NOT state-adaptive.**
- **Shipping**.

**Verdict:** Figma does not adapt to user expertise at runtime. Progressive
disclosure is a UX pattern, not state-adaptive UI.

Source: [Figma Resource Library — UI Design Principles](https://www.figma.com/resource-library/ui-design-principles/)

### 15. Biometric-Adaptive Interfaces (Academic Research)

- **What adapts:** depends on paper. Cognitive-load-adaptive IDE (NeuroSphere),
  eye-tracking VR cognitive training, Shifting Focus (HCEye), adaptive voice
  interfaces, adaptive reading for language learning.
- **Signal:** EEG, eye-tracking, heart rate, skin conductance, pupil dilation.
- **Sophistication:** varies. Some are multi-axis (IDE code view simplification +
  information filtering). Most are single-axis.
- **State-adaptive.** YES.
- **Research only — no consumer shipping.**

CHI 2024/2025 papers found:
- "Shifting Focus with HCEye" — visual highlighting adapts to cognitive load.
- "Decoding Cognitive Load" — eye-tracking to working memory mapping (2025 ETRA).
- "Your Eyes Controlled the Game" — real-time VR cognitive training adaptation
  based on eye-tracking and physiological data.
- "Adaptive reading for improved comprehension and reduced anxiety" (Nature HSS
  Communications, 2025).
- "NeuroSphere" — EEG-based IDE adaptation claim (92% accuracy, 200ms latency,
  simplifies code view during high-load). Note: not fully verified — the source was
  a 2025 blog, not a peer-reviewed paper — possibly vaporware.

Quote from the 2025 literature: **"No existing study combines performance metrics
with real-time analysis, indicating a significant gap in the integration of these
aspects."** This is the research consensus — the integration layer is an open gap.

Sources:
- [Shifting Focus with HCEye (CHI 2024)](https://dl.acm.org/doi/10.1145/3655610)
- [Decoding Cognitive Load (ETRA 2025)](https://dl.acm.org/doi/10.1145/3715669.3725864)
- [CHI 2025 Program](https://programs.sigchi.org/chi/2025/program/all)
- [Adaptive reading — Nature HSS Communications 2025](https://www.nature.com/articles/s41599-025-04878-w)

### 16. Face2Feel (Oct 2025 arXiv)

- **What adapts:** UI dynamically adapts based on emotion from webcam face
  recognition. Claims 85.7% user preference.
- **Signal:** webcam facial expression inference.
- **Sophistication:** multi-axis (dynamic UI adjustments).
- **State-adaptive.** YES.
- **Research only — arxiv paper, October 2025, not shipped.**

Quote: "dynamically changing user interfaces based on emotional states are not yet
widely implemented" — directly from Face2Feel paper.

Source: [Face2Feel on arXiv](https://arxiv.org/abs/2510.00489)

### 17. AdaptAI (CHI 2025 Late-Breaking Work)

- **What adapts:** productivity interventions (movement reminders, micro-breaks,
  tone-adaptive conversational agent for stress, task automation for
  drafting/scheduling).
- **Signal:** egocentric vision (camera), audio, heart rate, motion, LLM
  orchestration.
- **Sophistication:** multi-modal signal, but interventions are NUDGES (notifications
  and automations) not visual UI LAYERS (typography/spacing/color).
- **State-adaptive.** Signal inference is real. Intervention is content/notification
  level, NOT visual UI level.
- **Research prototype**, open source on GitHub (gadhvirushiraj/AdaptAI). CHI 2025
  Late-Breaking Work. 15-participant preliminary study.

This is the closest academic work. It does NOT change typography, spacing, colors,
or motion. It sends interventions.

Sources:
- [AdaptAI on arXiv](https://arxiv.org/abs/2503.09150)
- [AdaptAI GitHub](https://github.com/gadhvirushiraj/AdaptAI)

### 18. Neurodivergent-Aware Productivity Framework (arXiv July 2025)

- **What adapts:** proposes behavioral sensing layer detecting tab churn, pause
  thresholds, idle states → maps to cognitive profiles (drift, hyperfocus, emotional
  fatigue, decision inertia) → selects micro-interventions (reflective prompt,
  accountability cue, passive ambient nudge).
- **Signal:** on-device ML reading tab/app focus/inactivity.
- **Sophistication:** multi-state cognitive mapping. Interventions are prompts and
  ambient cues, NOT visual UI layers.
- **Research proposal**, not shipped. Based on 25-participant preliminary survey.
- **State-adaptive in philosophy, but the visual layer is untouched.**

This is conceptually closest to MindShift's intent. It explicitly names states
("drift, hyperfocus, emotional fatigue, decision inertia") and proposes different
interventions for each. But:
1. It's a framework paper, not a product.
2. Interventions are NOTIFICATIONS, not visual UI changes.
3. No production deployment.

Source: [Toward Neurodivergent-Aware Productivity — arXiv 2507.06864](https://arxiv.org/abs/2507.06864)

### 19. Humane AI Pin / Rabbit R1

- **What adapts:** Humane AI Pin claims "contextual computing" — responses adapted
  to situation. Rabbit R1 Large Action Model executes across apps.
- **Signal:** environment + voice command + laser-projected context.
- **Sophistication:** both are input→output devices without traditional UI. There
  is no typography/spacing/color layer to adapt.
- **State-aware in intent, visually absent**. Humane AI Pin famously failed in
  market (Humane was acquired/dissolved). Rabbit R1 reviews mixed.
- **Shipping / struggling**.

**Verdict:** Neither has a traditional UI layer to adapt. Not a competitor.

Source: [TIME — Startups racing to create iPhone of AI](https://time.com/6553910/ai-device-rabbit-r1-humane/)

### 20. Meta Quest / Apple Vision Pro

- **What adapts:** passthrough quality, focus awareness (system UI overlays without
  interrupting app), lockscreen/power UI now shows passthrough.
- **Signal:** focus state (input to system vs app), app lifecycle events.
- **Sophistication:** passthrough transparency + overlay rendering. Binary focus
  modes, not graded state.
- **NOT user-state adaptive — system-focus adaptive.**
- **Shipping**.

**Verdict:** Focus Awareness is a system-level primitive (is the user looking at the
menu or the app?). It is NOT user cognitive state. Not a competitor.

Source: [Meta Horizon OS — Focus Awareness](https://developers.meta.com/horizon/documentation/unity/unity-focus-awareness/)

### 21. Tesla Car UI

- **What adapts:** day/night theme automatic, Chill Mode (acceleration softening),
  multiple drive modes.
- **Signal:** ambient light sensor + user-selected drive mode.
- **Sophistication:** day/night = 1 visual axis. Chill Mode affects physics, not UI.
- **Environment-adaptive, not user-state-adaptive.**
- **Shipping**.

Users complain that day/night threshold causes UI flicker in marginal light — so
even this basic adaptation has known issues.

Source: [TeslaTap — Night Driving Mode](https://teslatap.com/questions/night-driving-mode-for-screens/)

### 22. Samsung One UI 8 / One UI 8.5

- **What adapts:** "Adaptive Interface Design" adjusts to device configuration
  (foldable vs slab). Galaxy AI features. AI Select, Writing Assist. Routines
  system.
- **Signal:** device form factor + user routines + AI context.
- **Sophistication:** device-level layout adaptation + productivity AI features.
  NOT user cognitive state.
- **Form-factor adaptive, not state-adaptive.**
- **Shipping**.

Source: [Samsung US — One UI 6 features](https://www.samsung.com/us/apps/one-ui/features/)

### 23. Fitbit / Apple Health / Oura Ring

- **What adapts:** data visualizations update as new biometrics come in (Vitals
  tab on Oura shows daily snapshot of HR, HRV, temperature, stress). Daytime Stress
  measures HR/HRV/temperature every 15 min and shows stress triggers.
- **Signal:** biometric sensors (HR, HRV, temperature, SpO2, skin conductance,
  sleep).
- **Sophistication:** data display layer only. The APP CHROME does not adapt —
  only the data inside it updates.
- **NOT visually state-adaptive.** Shows you your state, does not reshape itself.
- **Shipping**.

**Verdict:** These are DATA DISPLAY apps. The app's typography, spacing, colors,
and motion are static. Only the numbers inside change.

Sources:
- [IncentFit — Oura vs Apple Watch vs Fitbit](https://incentfit.com/wellness-word/oura-ring-vs-apple-watch/)
- [Oura Support — Apple Health Integration](https://support.ouraring.com/hc/en-us/articles/360025438734-Apple-Health-Integration)

### 24. Meditation / Mental Wellness Apps (Finch, Daylio, How We Feel, Reflectly, Moodfit)

- **What adapts:** mood LOGGING. None of these change their own UI based on the
  logged state. Finch has a "How motivated are you for the day?" prompt with a 1-5
  weather-icon scale, and shows a mood tracker over time. Daylio allows user to
  change theme colors (manual).
- **Signal:** user self-report.
- **Sophistication:** single logger input, stored in chart.
- **NOT state-adaptive.**
- **Shipping**.

**Verdict:** They ASK you how you feel. They don't RESPOND by reshaping themselves.
Not competitors.

Sources:
- [How We Feel App — Yale](https://medicine.yale.edu/news-article/the-how-we-feel-app-helping-emotions-work-for-us-not-against-us/)
- [Daylio FAQ](https://daylio.net/faq/docs/daylio-faq/tutorials/create-and-manage-moods/)
- [Finch review — Deconstructor of Fun](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl)

### 25. Tiimo (ADHD-specific planner)

This is the closest ADHD-app competitor.

- **What adapts:** AI planner adjusts SUGGESTIONS based on energy over time. Users
  can choose from 3,000+ colors and custom icons (manual customization). Design is
  described as "soft colors, rounded shapes, and clear spacing make the app easy to
  navigate even on low-energy days."
- **Signal:** user mood check-ins and onboarding preferences.
- **Sophistication:** content layer (which tasks to suggest) adapts. Visual layer
  is STATIC but designed to be low-stimulation by default.
- **NOT visually state-adaptive.** Tiimo is a well-designed STATIC app that
  accommodates ADHD needs but does not reshape itself based on the user's current
  energy state.
- **Shipping**.

**Verdict:** Tiimo is the closest competitor in spirit. Their AI adjusts SUGGESTIONS
to energy. Their VISUAL UI does not. Soft colors + rounded shapes + generous
spacing are Tiimo's DEFAULT aesthetic — they don't make the app softer when you're
more tired.

Sources:
- [Tiimo](https://www.tiimoapp.com/)
- [Tiimo AI Planner](https://www.tiimoapp.com/resource-hub/ai-planner)
- [Tiimo — Sensory-friendly design](https://www.tiimoapp.com/resource-hub/sensory-design-neurodivergent-accessibility)

### 26. Brain.fm / Amazing Marvin / Inflow / Routinery (ADHD apps)

- **Brain.fm:** audio only, no visual adaptation. Has an "ADHD boost" preset but
  that's an audio preset, not UI.
- **Amazing Marvin:** highly customizable ("Strategies" toggle). User-configured,
  not state-adaptive.
- **Inflow:** coaching content + community.
- **Routinery:** step-by-step routine timer.
- **NONE** have state-adaptive visual UI.
- **Shipping**.

Source: [Fluidwave — Best ADHD productivity apps](https://fluidwave.com/blog/adhd-productivity-apps)

---

## Cross-Cutting Observations

### Who adapts VISUAL (typography/spacing/motion/color) from real-time state?
- **Endel** — visuals from heart rate. But only a generative visual, not a full app
  UI with typography/spacing/layout.
- **Research:** Face2Feel, AdaptAI, HCEye, NeuroSphere, Easy Reading Framework. All
  research, all unshipped.
- **Nobody else.**

### Who adapts CONTENT from user state?
- Apple Intelligence (notification priority from content urgency, not user state).
- Spotify (listening history + time + location, not user cognitive state).
- Duolingo (BirdBrain from performance signals, not cognitive load).
- AdaptAI research (interventions from multimodal state).
- Neurodivergent framework research (nudges from tab behavior).
- Tiimo (suggestions from mood check-in).
- Notion AI (writing style from history).

### Who adapts system chrome from environment?
- Apple Focus Modes (schedule/manual).
- Apple day/night wallpaper (time).
- Tesla day/night screen (light sensor).
- Microsoft Mica (window focus).
- Samsung One UI (foldable form factor).
- Material 3 dynamic color (wallpaper hue).

### What ships today that looks closest to MindShift's claim?
Endel is closest because it ACTUALLY adapts visual (animation) from biometric state
(HR) in real-time. Its limitation is scope: a single generative visual, not a full
UI layer with typography/spacing.

Apple's accessibility stack is second-closest. Ships every primitive MindShift
needs. Does not compose them into a user-state signal.

Tiimo is closest in intent (ADHD + energy + mood). Does not adapt visual UI.

---

## Honest Assessment of MindShift's Claim

### The strict claim "nobody ships combined adaptive visual UI that responds to user state" is:
**FALSE in the literal sense — Endel ships combined adaptive AUDIO + VISUAL that
responds to heart rate state. But TRUE if scoped to "full app UI (typography +
spacing + motion + color) responding to self-declared user energy state in an
ADHD-aware productivity context."**

### The stronger defensible claim is:
> "MindShift is the first ADHD-aware productivity app to tie typography scale,
> spacing density, motion, and color temperature to a self-declared energy signal,
> automatically simplifying its visual language in response to user state."

Even this narrower claim needs asterisks:
- Apple Accessibility composes most of these primitives, just not from a single
  user-state signal.
- Tiimo ships a soft-by-default ADHD aesthetic with content-level adaptation.
- Research (Face2Feel, AdaptAI, HCEye) is actively closing this gap.

### What's actually novel:
1. **The binding from a user-facing "energy slider" to four visual axes.** This is
   a design-system choice nobody has shipped as a holistic package in the
   productivity space.
2. **The ADHD-specific intent** — this is NOT the same as accessibility. ADHD needs
   SHIFTING presentation through the day, not a persistent single-state accommodation.
3. **The 1-5 energy model with derived burnout score driving UI simplification** is
   a specific product decision, not a common pattern.

### What's NOT novel:
1. Conditional styling based on a store field (this is just if/else CSS).
2. "Calm mode" / "low stim mode" (every wellness app has something like this).
3. Animation gating with `prefers-reduced-motion` (standard web practice since 2014).
4. Typography scaling based on accessibility settings (Apple Dynamic Type since 2013).
5. Multi-axis adaptation (Material 3 Expressive ships color+shape+motion adaptation,
   just from different signals).

### Conclusion for marketing purposes:
**Do NOT claim "first in the world."** It will be destroyed by the first reviewer
who Googles "adaptive UI" for 5 minutes. Endel is Apple Design Award 2020, Face2Feel
and AdaptAI are in published papers, Apple ships every primitive, Tiimo is an ADHD
app with mood check-ins.

**DO claim** something like:
- "MindShift is the first ADHD productivity app we know of that binds typography,
  spacing, motion, and color to your current energy level."
- "Tiimo makes one soft, low-stim interface. MindShift makes four — and the app
  picks which one to show you based on how you told us you're feeling."
- "Endel changes music to your heart rate. We change your task list to your
  brain."

These are defensible, specific, and truthful.

---

## Bottom Line: Is "combined typography + spacing + motion + color adaptation" novel or just "3 themes with different names"?

**It's closer to the second thing than you want to hear.**

If MindShift's "adaptive visual layer" is implemented as:
- `isLowEnergy ? 'text-xl' : 'text-base'`
- `isLowEnergy ? 'p-6' : 'p-3'`
- `isLowEnergy ? 'animate-none' : 'animate-pulse'`
- `isLowEnergy ? 'bg-teal-softest' : 'bg-teal-default'`

...that's conditional styling with two states. It's legitimately useful for ADHD
users. But it's "2 themes" in engineering terms, not "adaptive AI UI."

If MindShift's layer is implemented as:
- Continuous energy score (1-5) → interpolated typography scale
- Burnout score (0-100) → interpolated motion intensity
- Spacing density → interpolated by energy
- Color temperature → shifts as burnout rises
- All changes respect `prefers-reduced-motion` and APCA contrast at every tick

...that's a graded adaptive layer, and the novelty is real. But then the honest pitch
is "continuous state-interpolated visual layer," not "first adaptive visual UI."

### Recommendation
The best move is to IMPLEMENT the graded version (not just 2 states), SHIP it, and
then pitch it as:
- "The first productivity app built for ADHD where the UI gets quieter when you do."
- "Four visual axes that move with your energy."
- Not: "First in the world."

---

## Sources

All sources used in this research:

- [Apple Newsroom — Apple Intelligence 2025](https://www.apple.com/newsroom/2025/06/apple-intelligence-gets-even-more-powerful-with-new-capabilities-across-apple-devices/)
- [Apple Intelligence on Wikipedia](https://en.wikipedia.org/wiki/Apple_Intelligence)
- [Apple — Reduce Motion](https://support.apple.com/en-us/111781)
- [Apple — Assistive Access](https://support.apple.com/guide/assistive-access-iphone/welcome/ios)
- [Apple — Accessibility Overview](https://www.apple.com/accessibility/)
- [Apple — Sleep Focus](https://support.apple.com/guide/iphone/turn-sleep-focus-on-or-off-iph7cdb86325/ios)
- [Apple Watch — Log your state of mind](https://support.apple.com/guide/watch/log-your-state-of-mind-apd7de0f5610/watchos)
- [Google I/O 2025 — Material 3 Expressive session](https://io.google/2025/explore/technical-session-24/)
- [Android Developers Blog — Android Design at Google I/O 2025](https://android-developers.googleblog.com/2025/05/android-design-google-io-25.html)
- [Material Design 3](https://m3.material.io/)
- [Dezeen — Material Expressive](https://www.dezeen.com/2025/05/28/google-ushers-in-age-of-expressive-interfaces-with-material-design-update/)
- [Microsoft Learn — Mica](https://learn.microsoft.com/en-us/windows/apps/design/style/mica)
- [Microsoft Learn — Acrylic](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic)
- [Fluent 2 Material](https://fluent2.microsoft.design/material)
- [Spotify Research NeurIPS 2025](https://research.atspotify.com/2025/11/transforming-ai-research-into-personalized-listening-spotify-at-neurips-2025)
- [Spotify — Prompted Playlists](https://newsroom.spotify.com/2025-12-10/spotify-prompted-playlists-algorithm-gustav-soderstrom/)
- [Duolingo Blog — Server-driven UI](https://blog.duolingo.com/server-driven-ui/)
- [Chief AI Officer — Duolingo AI](https://chiefaiofficer.com/duolingos-ai-strategy-fuels-51-user-growth-and-1b-revenue/)
- [Headspace](https://www.headspace.com/)
- [Globaldev — Headspace/Calm breakdown](https://globaldevgroup.medium.com/how-to-create-a-meditation-app-based-on-the-examples-of-calm-and-headspace-25af32b87579)
- [Endel Technology](https://endel.io/technology)
- [Endel Personal Inputs](https://endel.zendesk.com/hc/en-us/articles/360011955640-Personal-Inputs)
- [Amazon Science — Endel](https://www.amazon.science/latest-news/the-science-behind-endels-ai-powered-soundscapes)
- [psypost.org — TikTok meta-analysis](https://www.psypost.org/large-meta-analysis-links-tiktok-and-instagram-reels-to-poorer-cognitive-and-mental-health/)
- [Notion AI for Work](https://www.notion.com/blog/notion-ai-for-work)
- [Linear — Calmer interface refresh](https://linear.app/now/behind-the-latest-design-refresh)
- [Linear — UI refresh changelog](https://linear.app/changelog/2026-03-12-ui-refresh)
- [Arc — Boosts documentation](https://resources.arc.net/hc/en-us/articles/19212718608151-Boosts-Customize-Any-Website)
- [Figma — UI Design Principles](https://www.figma.com/resource-library/ui-design-principles/)
- [CHI 2025 Program](https://programs.sigchi.org/chi/2025/program/all)
- [Shifting Focus with HCEye (CHI 2024)](https://dl.acm.org/doi/10.1145/3655610)
- [Decoding Cognitive Load (ETRA 2025)](https://dl.acm.org/doi/10.1145/3715669.3725864)
- [Adaptive reading — Nature 2025](https://www.nature.com/articles/s41599-025-04878-w)
- [Face2Feel on arXiv 2025](https://arxiv.org/abs/2510.00489)
- [AdaptAI on arXiv](https://arxiv.org/abs/2503.09150)
- [AdaptAI GitHub](https://github.com/gadhvirushiraj/AdaptAI)
- [Toward Neurodivergent-Aware Productivity](https://arxiv.org/abs/2507.06864)
- [Meta Horizon OS — Focus Awareness](https://developers.meta.com/horizon/documentation/unity/unity-focus-awareness/)
- [TeslaTap — Night Driving](https://teslatap.com/questions/night-driving-mode-for-screens/)
- [Samsung US — One UI](https://www.samsung.com/us/apps/one-ui/features/)
- [Oura Help — Apple Health Integration](https://support.ouraring.com/hc/en-us/articles/360025438734-Apple-Health-Integration)
- [Tiimo](https://www.tiimoapp.com/)
- [Tiimo AI Planner](https://www.tiimoapp.com/resource-hub/ai-planner)
- [Tiimo — Sensory-friendly design](https://www.tiimoapp.com/resource-hub/sensory-design-neurodivergent-accessibility)
- [Fluidwave — Best ADHD productivity apps](https://fluidwave.com/blog/adhd-productivity-apps)
- [TIME — Rabbit R1 vs AI Pin](https://time.com/6553910/ai-device-rabbit-r1-humane/)
- [How We Feel App — Yale](https://medicine.yale.edu/news-article/the-how-we-feel-app-helping-emotions-work-for-us-not-against-us/)
- [Daylio FAQ](https://daylio.net/faq/docs/daylio-faq/tutorials/create-and-manage-moods/)
- [Emotionally adaptive support — Frontiers Digital Health 2025](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2025.1657031/full)
- [IncentFit — Wearables comparison](https://incentfit.com/wellness-word/oura-ring-vs-apple-watch/)
