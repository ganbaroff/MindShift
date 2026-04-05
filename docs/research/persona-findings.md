# Stakeholder Persona Findings — Consolidated

**Date:** 2026-04-04/05
**Method:** 6 simulated user personas tested against MindShift codebase

---

## Marat (28, developer, Kazan, Russia)
**Profile:** Senior dev, ADHD diagnosed at 25. Tries every app, deletes in 2 min.
**Verdict:** 🤬 on RU translations, 👍 on Settings and CookieBanner

**Critical findings:**
- ru.json gen-Z Mochi texts = Google Translate garbage: "30 дюймов" (30 inches instead of 30 deep), "без шапки" (no hat instead of no cap), "рН" (pH instead of fr)
- Mochi companion cannot be disabled — needs toggle in Settings
- PostSessionFlow: up to 4 screens and 6 taps before next session
- Recovery Lock bypass button too small (text-xs)
- Bento grid shows 4 cards with zeros for new users

**Status:** RU translations FIXED (22 strings). Mochi toggle ADDED. Bypass/bento NOT fixed yet.

## Aigul (34, mother of 2, Baku, Azerbaijan)
**Profile:** Diagnosed ADHD last year. Not tech-savvy. 5 min of peace per day.
**Verdict:** 😭 on AZ translations, 💚 on emotional copy

**Critical findings:**
- "Təbiət tamponu" (Nature Buffer literal translation — "tampon" means something else in AZ)
- "Simli" (Wired energy — means "cable" in AZ)
- "Hovuz" (Pool — swimming pool, not task pool)
- RSD abbreviation unexplained
- "Park edin" (Park it — driving, not postponing)
- Voice input not discoverable (mic icon too small, no hint text)
- aria-labels in English, not AZ

**Loved:** "Kiçik addımlar hələ də sayılır" (small steps still count) — almost cried.
**Status:** AZ translations FIXED (19 keys). Voice hint and aria NOT fixed yet.

## Dima (16, student, Almaty, Kazakhstan)
**Profile:** TikTok 6h/day. 8-second attention span. Mom installed the app.
**Verdict:** 🔥 on timer/audio, 😴 on home screen

**Key quotes:**
- Timer: "surprise mode is genius, zen af"
- Audio engine: "lo-fi preset goes hard"
- Home screen: "boring, nobody screenshots this"
- Mochi: "lowkey adorable, almost GOAT. needs accessories"
- Progress page: "spreadsheet not game, where are the level-up animations?"

**What would make him stay:** Customization (themes, Mochi accessories), level-up animations, audio visualizer, share card for Instagram stories.
**Status:** Share card with PNG export BUILT. Rest = backlog.

## Olga (42, Senior PM, Moscow, Russia)
**Profile:** Manages 15-person teams. Suspects ADHD. Very organized with Jira/Notion.
**Verdict:** 🚫 dealbreakers (task management too limited for power user)

**Key findings:**
- No bulk edit, no filters by date/type, no sort options — dealbreaker
- No charts/graphs in analytics — dealbreaker
- GDPR export missing 6 fields (dueDate, note, taskType, repeat, category, dueTime)
- No keyboard shortcuts
- No language selector (auto-detect only)
- No CSV export

**Her conclusion:** "MindShift is not a Todoist replacement. It's a focus companion. I'd use it alongside my existing tools."
**Status:** GDPR export fields ADDED. Rest = architectural decisions (NOW/NEXT pool caps are by design).

## Artem (31, security researcher, Tbilisi, Georgia)
**Profile:** Audits mobile apps for a living. Downloads apps to find vulnerabilities.
**Verdict:** ⚠️ 2 exploits found, mostly secure

**Exploits found:**
1. SW open redirect via `//evil.com` — bypasses `startsWith('/')` check → FIXED (added `!raw.startsWith('//')`)
2. Room code brute-force: 4 chars = 1.6M combinations → FIXED (increased to 6 chars = 2.1B)
3. Store manipulation: subscriptionTier writable in IDB → LOW risk (no Stripe yet)
4. broadcast() no debounce → DoS possible in rooms → NOT FIXED
5. Cross-tab state injection via storage event → No schema validation → NOT FIXED

**His verdict:** "Secure enough for public launch" with conditions.
**Status:** 2 critical FIXED. 3 lower priority NOT fixed.

## Nargiz (39, clinical psychologist, Istanbul, Turkey)
**Profile:** Specializes in adult ADHD. Sees 20+ patients/week. Recommends apps to patients.
**Verdict:** 🌟 EXEMPLARY on burnout detection and RecoveryProtocol

**Key clinical assessments:**
- Burnout detection (4-signal composite): "One of the most thoughtfully designed burnout detection mechanisms I have seen in a consumer app"
- RecoveryProtocol (72h+ absence): EXEMPLARY — "I would cite this in professional contexts"
  - Auto-archiving of old tasks
  - Identity reinforcement ("You're a consistent returner, not a perfect one")
  - Micro-win chips for low executive function
  - Spiciness meter for overwhelm calibration
- Hyperfocus Autopsy: APPROPRIATE — reactivity gating is "genuinely psychologically aware"
- VR XP system: APPROPRIATE with caveat — needs daily XP cap for compulsive users
- Mochi companion: APPROPRIATE — "observation over evaluation" is clinically correct

**Recommendations implemented:**
- Gen-Z tone gate for high reactivity during struggle → BUILT
- Mochi companion toggle → BUILT
- 👎 replaced with 🌀 (RSD-safe) → BUILT

**Not implemented:**
- XP daily cap
- Wrapped stats: hide "best streak" when current=0
- Parasocial attachment monitoring

---

## Expert Panel (5 experts, separate from personas)

### Leila (social psychologist): Persistent micro-communities ("Groves")
- 2-8 people who focus together regularly
- Shared crystal total, collective streak
- "Someone is expecting me" = strongest retention signal

### Denis (game economy designer): Crystal sinks inside MindShift
- Without spending, crystals become meaningless after 2 weeks
- 5 sinks: audio packs (30c), Mochi personality (50c), room boost (20c/week), themes (15c), Grove tithe (5c)
- NO trading between players (speculation = ADHD anxiety)

### Maria (accessibility expert): ADHD + comorbidities excluded
- 30-50% have dyslexia, 50%+ have anxiety
- No font size control
- No contrast adjustment
- No "truly blind" mode (duration never shown)
- Extreme contrast (14:1) may harm dyslexic readers

### Alex (platform strategist): No viral artifact
- Need "Focus Proof" — shareable verified card
- Every card on LinkedIn = free billboard
- K-factor through Telegram, not App Store

### Kamila (data ethicist): Cross-product behavioral profiling = medical data
- MindShift health data (energy, burnout, medication timing) flows to VOLAURA
- Employer could infer medication effectiveness from focus patterns
- Data firewall needed: health data = visibility: 'private', never in org search
- GDPR Article 9 risk, EU AI Act high-risk classification
