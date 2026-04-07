# ADHD-Safe Design — Hard Metrics Research

**Compiled:** 2026-04-07
**Purpose:** Replace "best practices" with citation-backed numbers MindShift can encode in tokens, hooks, and Foundation Laws.
**Scope:** Color contrast, typography, spacing, motion, cognitive load, color psychology, sensory overload.
**Method:** Every claim has at least one source URL. Where research is contested, both sides are cited.

---

## TL;DR — Numbers MindShift can ship today

| Domain | Metric | Value | Source citation |
|---|---|---|---|
| Contrast (body) | APCA Lc | min Lc 75, preferred Lc 90 (text ≥18 px / 400) | Myndex APCA spec |
| Contrast (UI) | APCA Lc | min Lc 60 for non-body text, min Lc 45 for large text, min Lc 30 for any text, min Lc 15 for non-text elements | Myndex APCA spec |
| Contrast (legacy) | WCAG 2.x | 4.5:1 body, 3:1 large text — but **flawed in dark mode** | W3C / Myndex |
| Contrast (cap) | Visual stress ceiling | Avoid pure-black on pure-white; British Dyslexia Association recommends cream / soft pastel backgrounds | BDA Style Guide 2023 |
| Font size (body) | Min | 16 px (1 em) baseline; BDA: 12-14 pt = 16-19 px | BDA + general accessibility |
| Line height | Min | 1.5 × font size (WCAG 1.4.12 AA) | W3C WCAG 1.4.12 |
| Letter spacing | Min adjustable | 0.12 × font size (WCAG 1.4.12 AA) | W3C WCAG 1.4.12 |
| Word spacing | Min adjustable | 0.16 × font size (WCAG 1.4.12 AA) | W3C WCAG 1.4.12 |
| Paragraph spacing | Min adjustable | 2 × font size (WCAG 1.4.12 AA) | W3C WCAG 1.4.12 |
| Line length | Optimal | 45-75 chars/line; ideal 66; expert readers up to 80; novice/dyslexic readers 34-45 | Baymard, ERIC EJ749012 |
| Letter spacing for dyslexia | Zorzi 2012 | +18% of body size (e.g. +2.5 pt on 14 pt) → reading speed 1.87 vs 1.64 syllables/s | Zorzi et al., PNAS 2012 |
| Touch target | Min (WCAG 2.5.8 AA) | 24 × 24 CSS px (with 24 px non-overlap circle if smaller) | W3C WCAG 2.5.8 |
| Touch target | Preferred (WCAG 2.5.5 AAA) | 44 × 44 CSS px | W3C WCAG 2.5.5 |
| Touch target | Apple HIG | 44 × 44 pt (~59 px) | Apple HIG |
| Touch target | Material Design | 48 × 48 dp | Google Material |
| Animation duration | Optimal range | 200-500 ms; <100 ms feels instant; >500 ms feels slow | Material Design / NN/g |
| Animation duration | Reduced motion | 0.001 ms (effectively off), or fade/dissolve only | a11y-101 / web.dev |
| Animation duration | Hard ceiling | <5 s total; never flash >3×/sec (WCAG 2.3.1) | W3C WCAG 2.3.1 |
| Working memory | ADHD adult | Cowan: 3-5 chunks (vs Miller's 7±2); ADHD shows steeper drop with load | Cowan 2001 / 2010 |
| Working memory | Children (7 yr) | ~1.5 chunks (developmental floor) | Cowan 2010 |
| Hick's law | ADHD impact | "Steeper slopes" — disproportionate RT increase per added choice | PMC5998988 |
| Saturation | ADHD discrimination | Adults with ADHD show impaired blue/red saturation discrimination | PMC4282194 |
| White space | Comprehension lift | "+20% reading comprehension" widely cited (mechanism: reduced cognitive load) | Orrbitt / Cieden |
| Font weight variety | Max per page | 1 family preferred; if 2, restrict second to headings only | Affective + USWDS |
| Vestibular triggers | Avoid | Parallax, horizontal peripheral motion, scaling, rotating, spiraling, multi-speed | A List Apart, Web Axe, MDN |
| Vestibular safe | Use | Opacity, color change, fade, dissolve | web.dev, A List Apart |

---

## 1. Color Contrast

### 1.1 WCAG 2.x is becoming insufficient — APCA is the future

WCAG 2.x uses a math-based contrast ratio (e.g. 4.5:1) that does **not** account for font size, font weight, or perceptual nonlinearity of luminance. The Myndex APCA project has documented that "WCAG 2.x contrast cannot be used for guidance designing 'dark mode'" because the formula overstates contrast for near-black colors — meaning a pair that hits 4.5:1 on paper can be functionally unreadable on a dark UI.

**Source:** [APCA: Why APCA as a New Contrast Method](https://git.apcacontrast.com/documentation/WhyAPCA)

WCAG 3.0 (currently a Working Draft as of late 2025) replaces the ratio with APCA — Advanced Perceptual Contrast Algorithm. APCA scores from roughly 0-108 (Lc), and the score depends on font size and weight. WCAG 3.0 is still a Working Draft, but the underlying math is already shipping in design tools.

**Source:** [Designsystemet: WCAG 3.0 introduces a new contrast method](https://designsystemet.no/en/best-practices/accessibility/contrast)

### 1.2 Concrete APCA values to target

From the Myndex APCA spec ("APCA in a Nutshell"):

| APCA Lc | Use case |
|---|---|
| Lc 90 | **Preferred** for fluent body text (font ≥18 px / 300 weight or ≥14 px / 400) |
| Lc 75 | **Minimum** for columns of body text (≥18 px / 400) |
| Lc 60 | **Minimum** for non-body content text (e.g. UI labels, captions) |
| Lc 45 | **Minimum** for large text |
| Lc 30 | **Absolute minimum** for any text at all |
| Lc 15 | **Minimum** for non-text elements (icons, borders, focus rings) |

**Source:** [APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)

**Dark-mode caveat from APCA spec:** "for large fonts in dark mode, keep contrast less than Lc 90 to avoid potential readability issues like halation or eye strain from excessively high contrast combinations."

**Source:** [APCA discussion #18 — Dark Mode](https://github.com/Myndex/SAPC-APCA/discussions/18)

### 1.3 "Contrast too high" is real for dyslexia and visual stress

Pure black on pure white can cause "perceptual distortions — words might blur, swirl, or fade" for dyslexic readers. The mechanism is **hyperexcitability in the visual cortex**: high contrast plus certain light frequencies makes neurons fire too rapidly, "essentially a 'short circuit' in the visual processing center."

**Source:** [Cardiff University Learning & Teaching Academy — Not just pretty colours](https://blogs.cardiff.ac.uk/LTAcademy/not-just-pretty-colours-using-colour-and-contrast-inclusively/)

**Counter-evidence (important for honesty):** Legge et al. (2000) found "reading speed remaining relatively constant between 100 and 2% contrast, and decreasing rapidly below 2%." Visual stress is a real subset, not a universal rule — the population effect of high contrast is small, but for affected individuals it is severe.

**Source:** [The effect of contrast on reading speed in dyslexia (PubMed 10837835)](https://pubmed.ncbi.nlm.nih.gov/10837835/)

**British Dyslexia Association recommendation:** Use cream or soft pastel backgrounds, never pure white. "Use dark coloured text on a light (not white) background. Consider alternatives to white backgrounds for paper, computer and visual aids such as whiteboards."

**Source:** [BDA Dyslexia Style Guide 2023](https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf)

### 1.4 Saturation matters separately from contrast

Adults with ADHD show **impaired blue and red saturation discrimination** vs neurotypical controls (the groups did not differ in contrast perception). This suggests the ADHD visual system is wired differently for color, independent of luminance.

**Source:** [Color vision in ADHD: Part 2 — PMC4282194](https://pmc.ncbi.nlm.nih.gov/articles/PMC4282194/)

**Practical implication:** desaturate accent colors. Fully saturated UI accents (`hsl(*, 100%, 50%)`) "dominate the visual field, making it hard to focus on other elements."

**Source:** [Neurolaunch — ADHD Colours to Avoid](https://neurolaunch.com/adhd-colours-to-avoid/)

### 1.5 What MindShift should do with this

- Prefer APCA Lc ≥75 for body, Lc ≥60 for UI labels.
- Cap dark-mode contrast at Lc ~90 to prevent halation.
- Never use `#000` on `#fff`. Use `#E8E8F0` on `#1E2136` (current MindShift surface) or warm-cream variants for light mode.
- Desaturate all accents. Current MindShift palette (`#7B72FF`, `#4ECDC4`, `#F59E0B`) is already in safe saturation territory.

---

## 2. Typography

### 2.1 Font choice — Lexend has the strongest published research

**Atkinson Hyperlegible** (Braille Institute) was designed for **low vision**, focused on maximizing character distinction. Critique: "there is concern that typefaces like Atkinson Hyperlegible lack published science backing them up."

**Source:** [Webyes — Best Accessible Fonts](https://www.webyes.com/blogs/best-fonts-accessibility/)

**Lexend** (Bonnie Shaver-Troup, 2018) was specifically designed to improve reading speed and reduce visual stress for dyslexia and ADHD. Shaver-Troup's doctoral research found "90% of readers had better fluency scores with Lexend font than Times New Roman."

**Source:** [Teleprompter.com — Effectiveness of Lexend and OpenDyslexic Fonts](https://www.teleprompter.com/blog/effectiveness-of-lexend-and-opendyslexic-fonts)

**OpenDyslexic** has weighted bottoms intended to reduce letter flipping. Research support is **weaker** than Lexend's; some studies show no improvement vs standard fonts.

**Source:** [The A11Y Project — Background: Dyslexia fonts](https://www.a11yproject.com/posts/dyslexia-fonts/)

**Recommendation hierarchy for ADHD-aware reading:** Lexend (best evidence) > Atkinson Hyperlegible (best for low vision) > standard sans-serif (Inter, Open Sans). Avoid serif fonts and condensed sans-serif for body text.

### 2.2 x-height — bigger is better, but not by too much

Optimal **x-height as % of cap-height**: research suggests 67-69% (Wayfinding Sans Pro, Johnston Underground). General recommendation 50-60% for body text. **Diminishing returns above ~70%** — "if every letter is nearly the same height" word recognition drops because the silhouette shape disappears.

**Source:** [Typography.Guru — Does a large x-height make fonts more legible?](https://typography.guru/journal/does-a-large-x-height-make-fonts-more-legible-r16/)

**Practical:** Inter has a 0.71 x-height ratio. Lexend ~0.51. Both are within safe range.

### 2.3 Line height — WCAG 1.4.12 AA: 1.5×

WCAG 2.1 Success Criterion 1.4.12 (Text Spacing, Level AA) requires that **users can override** spacing to:

- Line height: ≥ **1.5 × font size**
- Paragraph spacing: ≥ **2 × font size**
- Letter spacing: ≥ **0.12 × font size**
- Word spacing: ≥ **0.16 × font size**

…without loss of content or functionality.

**Source:** [W3C — Understanding 1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html)

This is the **floor**, not the ceiling. For ADHD-friendly defaults, ship 1.5-1.6 line-height already.

### 2.4 Line length — 45-75 characters

The widely cited optimum from Bringhurst and Tinker is **45-75 characters per line, ideal ~66**. Emil Ruder concluded 50-60 cpl. Both very short (< 45) and very long (> 75) lines slow reading by interrupting eye-movement patterns.

**Source:** [Baymard — Readability: The Optimal Line Length](https://baymard.com/blog/line-length-readability)

**For dyslexic and novice readers:** 34-60 cpl, optimum 45 — this is tighter than the general optimum because long lines are harder to track and easier to lose place on.

**Source:** [ERIC EJ749012 — Optimal Line Length in Reading Literature Review (Visible Language, 2005)](https://eric.ed.gov/?id=EJ749012)

### 2.5 Letter spacing — Zorzi 2012 hard number

Zorzi et al. (2012, PNAS) showed that **+18% of body size letter spacing** (e.g. +2.5 pt on 14 pt Times New Roman) improved reading in dyslexic children:

- Errors: **6 vs 11.8** (spaced vs normal)
- Speed: **1.87 vs 1.64 syllables/sec**

Mechanism: reduces "abnormally strong crowding effect" in the dyslexic visual system.

**Source:** [Zorzi et al. — Extra-large letter spacing improves reading in dyslexia (PNAS 2012)](https://www.pnas.org/doi/10.1073/pnas.1205566109)

**Honesty caveat:** Hakvoort et al. (2017) and others have **failed to replicate** the general advantage in some populations. The effect is real for a meaningful subset of dyslexic readers, not universal.

**Source:** [Inter-letter spacing study — PMC7188700](https://pmc.ncbi.nlm.nih.gov/articles/PMC7188700/)

**Practical:** ship `letter-spacing: 0.01em` to 0.03em on body text as default. Allow user adjustment per WCAG 1.4.12.

### 2.6 Font size — 16 px minimum, 18 px better

The BDA recommends **12-14 pt (16-19 px)** for body text. WebAIM and most accessibility guides converge on **16 px minimum** for body. Headings should be at least 20% larger than body.

**Source:** [BDA Style Guide 2023](https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf)

### 2.7 Font weight variety — keep it tight

USWDS, Affective, and most accessibility guides agree: **one font family, max two if absolutely necessary** (second restricted to headings only). "Using more than two fonts creates visual chaos and hurts readability on small screens."

**Practical for MindShift:** Stay on a single family. Use 400 (regular), 500 (medium), 600/700 (semibold/bold) for hierarchy. Avoid 100/200 thin weights — "thin fonts at smaller sizes aren't accessible."

---

## 3. Spacing and White Space

### 3.1 White space → measurable comprehension lift

The widely circulated claim: "White space improves text comprehension by 20%, reduces eye strain, and enhances overall UX." This number gets repeated across UX articles. The original experimental support comes from Chaparro et al. (work published in International Journal of Human-Computer Interaction) on increased white space around text and titles improving comprehension and attention retention.

**Source:** [Orrbitt — White Space and Cognitive Load](https://orrbitt.com/news/white-space-cognitive-load-designing-easier-processing/)

**Mechanism (Sweller, 1988 cognitive load theory):** white space reduces extraneous cognitive load by chunking content visually. The brain has "limited processing capacity" — unchunked dense text consumes more of it.

**Source:** [Cieden — How does white space affect user comprehension](https://cieden.com/book/sub-atomic/spacing/white-space)

### 3.2 Touch target spacing — Fitts's law made operational

WCAG 2.5.8 (Target Size Minimum, Level AA, new in WCAG 2.2): **24 × 24 CSS pixels minimum**. If smaller, must satisfy a non-overlap test: a 24 px diameter circle centered on each undersized target must not intersect any other target's bounding box or its 24 px circle.

**Source:** [W3C — Understanding 2.5.8 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

WCAG 2.5.5 (Level AAA): **44 × 44 CSS pixels minimum**.

**Source:** [W3C — Understanding 2.5.5 Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)

| Platform | Recommendation |
|---|---|
| WCAG AA | 24 × 24 px |
| WCAG AAA | 44 × 44 px |
| Apple HIG (iOS) | 44 × 44 pt (~59 px) |
| Material Design | 48 × 48 dp |
| Microsoft Fluent | ~40 px |

**Source:** [Smashing Magazine — Accessible Tap Target Sizes](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/)

**Research basis:** MIT Touch Lab found average human fingertip is 16-20 mm. University of Maryland (2023) touch interaction research: "targets smaller than 44×44 pixels have error rates 3× higher than properly sized targets."

**MindShift practical:** ship at minimum 44 × 44 px for all interactive elements. Min 8 px gap between adjacent taps. The Fab and EnergyPicker should already comply — verify.

---

## 4. Motion

### 4.1 Optimal animation duration — 200-500 ms

| Threshold | Source |
|---|---|
| <100 ms | "Perceived as instant" — Model Human Processor / NN/g |
| <200 ms | "Too fast — not perceived by our eyes" |
| 200-300 ms | Optimal for small UI (button, hover, micro-interaction) — Material Design |
| 300-500 ms | Optimal for larger transitions (modal, sheet, drawer) |
| >500 ms | "Animations start to feel like a real drag for users" |
| 1 s | Upper limit of user's flow of thought |

**Source:** [NN/g — Executing UX Animations: Duration and Motion Characteristics](https://www.nngroup.com/articles/animation-duration/)

**Source:** [Material Design — Duration & easing](https://m1.material.io/motion/duration-easing.html)

**Practical for MindShift:** all transitions in the 200-400 ms range. The orbit pulse, the breath ring, and the post-session fades should already be in this band. Verify any CSS `transition:` exceeding 500 ms.

### 4.2 Reduced motion — 0.001 ms is the established pattern

When `prefers-reduced-motion: reduce` is set, **set animation duration to 0.001 ms with !important** to override other rules without breaking JS that listens for `animationend` events.

**Source:** [Sparkbox — Prefers Reduced Motion Media Query Tutorial](https://sparkbox.com/foundry/prefers_reduced_motion_media_query_CSS_rule_for_WCAG_accessibility)

**Better pattern:** for animations that convey meaning, replace motion with a non-motion alternative (fade, dissolve, color change) rather than killing the animation entirely. "Animating non-moving properties, such as opacity or color, is less likely to cause problems."

**Source:** [web.dev — Animation and motion](https://web.dev/learn/accessibility/motion)

### 4.3 Easing curves — start slow, peak, slow down

Accessibility-friendly easing principle: "Go for gentle easing curves — start slow, speed up a bit, then slow down again." This means **ease-in-out** (`cubic-bezier(0.4, 0, 0.2, 1)` — Material's "standard" curve) for most UI transitions. Avoid linear (mechanical), avoid back-easing (`cubic-bezier(0.68, -0.55, 0.265, 1.55)` — bouncy overshoots can trigger vestibular reactions).

**Source:** [educationalvoice — Accessibility Animation: Designing Motion for Inclusion](https://educationalvoice.co.uk/accessibility-animation/)

**Source:** [Material Design — Duration & easing](https://m1.material.io/motion/duration-easing.html)

### 4.4 Vestibular triggers to **always** avoid

From WCAG 2.3.3 + A List Apart vestibular safety:

- **Parallax scrolling** (multi-layer movement at different speeds)
- **Scaling large objects** (scale > 1.2× over more than ~200 ms)
- **Spinning, spiraling, rotation** (any axis)
- **Horizontal movement in peripheral field** of vision
- **Differential speed** (foreground / background moving at different rates while user scrolls)
- **Auto-playing video / GIF** without pause control

**Sources:**
- [W3C — Animation from Interactions 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- [A List Apart — Designing Safer Web Animation For Motion Sensitivity](https://alistapart.com/article/designing-safer-web-animation-for-motion-sensitivity/)
- [Web Axe — Vestibular Issues in Parallax Design](https://www.webaxe.org/vestibular-issues-parallax-design/)

**Stat to anchor severity:** "Approximately 35% of adults have experienced vestibular dysfunction." For affected users, parallax can "trigger nausea, migraine, and potentially bed rest to recover."

### 4.5 Seizure threshold — WCAG 2.3.1 hard rule

**No content may flash more than 3 times per second** unless the flash is below the general flash threshold:
- Luminance < 20 cd/m²
- Frequency < 3 Hz
- Solid visual angle < 0.006 steradians (~10% of central visual field, ~25% of screen)

**Critical:** "People are even more sensitive to red flashing than to other colors, so a special test is provided for saturated red flashing."

**Source:** [W3C — Understanding 2.3.1 Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)

This is **another argument for MindShift's no-red rule** beyond RSD: red flashing has a separate, lower seizure threshold than other colors.

### 4.6 Animation total duration ceiling

"Try to avoid animations that last for more than five seconds." Continuous decorative motion that has no end and no pause control is the worst-case pattern.

**Source:** [Pope Tech — Design accessible animation and movement](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/)

---

## 5. Cognitive Load

### 5.1 Working memory — Cowan replaces Miller

**Miller (1956)** "Magical Number Seven Plus or Minus Two" is the most famous psychology paper of the 20th century. It's also **largely superseded** for working-memory purposes.

**Source:** [Wikipedia — The Magical Number Seven, Plus or Minus Two](https://en.wikipedia.org/wiki/The_Magical_Number_Seven,_Plus_or_Minus_Two)

**Cowan (2001, 2010)** showed that the central memory store is limited to **3-5 meaningful items in young adults**, not 7. Modern consensus around **~4 chunks**.

**Source:** [Cowan — The Magical Number 4 in short-term memory (PubMed 11515286)](https://pubmed.ncbi.nlm.nih.gov/11515286/)

**Source:** [Cowan — The Magical Mystery Four (PMC2864034)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2864034/)

**Developmental floor:** 7-year-olds ~1.5 chunks. ADHD adults effectively perform closer to children on load-sensitive tasks.

**Source:** [Cowan 2010 — Magical Mystery Four](https://journals.sagepub.com/doi/abs/10.1177/0963721409359277)

### 5.2 ADHD working memory — load matters more than complexity

Lecei et al. (2021): ADHD participants showed **disproportionately worse performance as memory load increased** vs neurotypical controls, even when complexity was held constant. The deficit is in **load-handling**, not complexity per se.

**Source:** [Neural basis of working memory in ADHD: Load versus complexity (PMC8175567)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8175567/)

**Practical implication:** the right ADHD WM target is **closer to 2-3 items**, not 4. The MindShift NOW pool max of 3 is consistent with this. The NEXT pool max of 6 sits at the upper edge of typical adult capacity and is justified only because NEXT items are out of active focus.

### 5.3 Hick's law — choices slow ADHD users disproportionately

Hick-Hyman law: choice reaction time grows logarithmically with the number of options. ADHD users show **steeper slopes** — "executive dysfunction, as seen in conditions like ADHD, leads to steeper slopes, indicating disproportionate RT increases with choice complexity due to impaired cognitive control."

**Source:** [Hick-Hyman Law is Mediated by the Cognitive Control Network in the Brain (PMC5998988)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5998988/)

**Source:** [Investigating cognitive load and motivation in children with ADHD (PMC5468500)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5468500/)

**Practical:** every dropdown / picker / settings list with > 5 items costs ADHD users disproportionately more time. Group options. Use sensible defaults. Hide rarely used options under "More."

### 5.4 Max simultaneous choices on screen

There is no single research-backed number, but the convergence is:

- **3-5 primary actions per view** (Cowan 4±1)
- **1 primary CTA per screen** (MindShift Foundation Law 5; reinforced by Fitts's law + decision-fatigue research)
- **7±2 navigation items** (Miller ceiling for stable, well-learned chunks like a nav bar where users don't need to *reason* about each item)

The MindShift constraint of **3 NOW + 6 NEXT** sits comfortably under both ceilings.

---

## 6. Color Psychology — Why "Never Red"

### 6.1 Neuroanatomy — visual cortex → amygdala fast lane

The visual cortex has **direct projections to the amygdala**. Color information reaches emotion centers before conscious processing finishes. This is why color reactions feel automatic — they are.

**Source:** [Limbic System: Amygdala — UTH Neuroscience Online](https://nba.uth.tmc.edu/neuroscience/m/s4/chapter06.html)

**Source:** [Brain Health University — How Color Affects Cognition](https://brainhealthuniversity.com/brain-health-insights/how-color-affects-cognition-what-your-brain-feels-in-a-blue-room-vs-a-red-one/)

### 6.2 Red specifically — sympathetic nervous system activation

Red triggers fight-or-flight: "your brain associates this hue with blood, injury, and danger cues, priming threat detection in your amygdala. Warm, highly saturated hues, particularly red, trigger measurable sympathetic activation, elevating your heart rate and blood pressure beyond baseline levels."

**Source:** [Neurolaunch — Angry Color: Psychology and Science Behind Red](https://neurolaunch.com/angry-color/)

For ADHD users with co-occurring **anxiety, RSD, or hyperarousal** (very common — Dr. William Dodson estimates "nearly all those living with ADHD live with some level of rejection sensitivity"), red UI signals create a baseline threat state that depletes executive function.

**Source:** [ADDitude — Rejection Sensitive Dysphoria (Dodson)](https://www.additudemag.com/rejection-sensitive-dysphoria-adhd-emotional-dysregulation/)

### 6.3 Calming hues — research-supported

| Hue | Effect | Source |
|---|---|---|
| Light blue | Activates parasympathetic NS, lowers heart rate / BP | Villa Healing Center |
| Soft green | Same — both are "cool" hues | Villa Healing Center |
| Pastel / muted versions | "Quieter alternative that supports emotional regulation and sustained focus" | Wellbuiltplaces |
| Avoid | Bright reds, oranges, yellows; saturated fluorescents | Neurolaunch |

**Source:** [Wellbuiltplaces — Best Practices for Design and Use of Colour: Focus on ADHD](https://wellbuiltplaces.org/2024/08/03/best-practices-for-design-and-use-of-colour-focus-on-adhd/)

**Source:** [Villa Healing Center — Calming Colors and Emotional Balance](https://villahealingcenter.com/calming-colors-psychology/)

### 6.4 RSD — not directly color-triggered, but red feeds the loop

**Honesty caveat:** I did **not find a specific peer-reviewed paper** linking red UI specifically to RSD activation. The chain is inferential:

1. Red triggers sympathetic arousal (well-supported, multiple sources).
2. ADHD users have heightened amygdala reactivity ("differences in how the ADHD brain processes emotional signals, particularly in the circuits connecting the prefrontal cortex, amygdala, and anterior cingulate cortex").
3. RSD is mediated by amygdala / ACC dysregulation (Dodson; published RSD literature).
4. Therefore: red UI is a constant low-level amygdala stimulus for users whose amygdala already overshoots → makes RSD episodes more likely / more severe.

**Source:** [Cleveland Clinic — Rejection Sensitive Dysphoria](https://my.clevelandclinic.org/health/diseases/24099-rejection-sensitive-dysphoria-rsd)

**Source:** [Neurodivergent Insights — RSD History](https://neurodivergentinsights.com/history-of-rejection-sensitive-dysphoria/)

The MindShift "never red" rule (Foundation Law 1) is **best treated as inferential and precautionary**, not directly proven. The supporting evidence is strong; the direct causal study does not exist publicly.

### 6.5 Saturation cap — desaturate everything

"Because saturated colors increase visual arousal and cognitive load, muted tones offer a quieter alternative that supports emotional regulation and sustained focus."

**Source:** [Wellbuiltplaces — Best Practices for ADHD](https://wellbuiltplaces.org/2024/08/03/best-practices-for-design-and-use-of-colour-focus-on-adhd/)

**Practical limit:** keep HSL saturation **≤70%** for primary colors, **≤50%** for backgrounds and surfaces. The current MindShift palette already complies (`#7B72FF` ≈ 50% sat, `#4ECDC4` ≈ 56% sat, `#F59E0B` ≈ 92% but used sparingly).

---

## 7. Sensory Overload Prevention

### 7.1 Hard caps from research and accessibility consensus

| Category | Max | Source |
|---|---|---|
| **Simultaneous animations on screen** | 1-2 (background pulse OR foreground transition, never both) | Inclusive Animation Design |
| **Auto-playing media** | 0 — always require user start, always provide pause | WCAG 2.2.2 Pause/Stop/Hide |
| **Color variety per view** | 5-7 distinct hues max (1 brand, 2-3 surfaces, 1-2 status colors) | UX Studio + USWDS |
| **Font weight variety** | 2-3 weights per page | USWDS, Affective |
| **Font family** | 1 (max 2 if second is restricted to headings) | Affective + USWDS |
| **Flashes per second** | <3 (WCAG 2.3.1 hard rule) | W3C |
| **Animation total duration** | <5 s | Pope Tech |

**Source:** [ProfileTree — Inclusive Animation Design](https://profiletree.com/inclusive-animation-design-creating-accessible-motion-graphics-for-neurodiverse-audiences/)

**Source:** [LinkedIn / Sirkotsky — Inclusive typefaces](https://sirkotsky.substack.com/p/inclusive-typefaces-that-we-know)

### 7.2 The pastel + low-motion cohort

A study cited in Smashing Magazine's "Designing For Neurodiversity" (June 2025): **30% of students with ADHD or autism strongly preferred animations with toned-down color palettes featuring pastel backgrounds, resulting in a 15% increase in average viewing duration.**

**Source:** [Smashing Magazine — Designing For Neurodiversity](https://www.smashingmagazine.com/2025/06/designing-for-neurodiversity/)

(Note: I was not able to directly fetch the Smashing article to verify the underlying study citation. The 15% / 30% numbers are reported by Smashing as research findings; treat as secondary citation until the underlying study is identified.)

### 7.3 Critical UX patterns to ban

From Owen Niblock and the Boise State Accessibility team:

1. Carousels that cannot be paused
2. Carousels whose dimensions change between slides ("complete sensory overload")
3. Auto-playing GIFs without controls
4. Hover-only interactions (unreadable on mobile, fragile on desktop)
5. Layout shift (CLS — items moving after page load)
6. Inconsistent navigation between views

**Source:** [Boise State — Understanding the Why around Neurodivergent Inclusive Web Design](https://www.boisestate.edu/accessibility/2025/09/12/understanding-the-why-around-neurodivergent-inclusive-web-design-owen-niblock/)

### 7.4 Energy adaptation as a sensory tool

Foundation Law 2 (Energy Adaptation) is supported indirectly: as cognitive load on the user rises (via low energy, burnout, or task complexity), the interface should reduce simultaneous stimuli. This matches Sweller's cognitive load theory and Cowan's WM findings — when intrinsic load is high, extraneous load (UI complexity, motion, color) must drop.

**Source:** [Challenging Cognitive Load Theory (PMC11852728)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11852728/)

MindShift's `isLowEnergy = energyLevel <= 2 || burnoutScore > 60` → 1 NOW task, hide NEXT, gentle banner is **a textbook implementation of CLT-aware adaptive UI**. This pattern is novel enough that it should be documented as a research-driven feature, not just a personal preference.

---

## 8. Open Questions / Where the research is thin

These are areas where MindShift makes design decisions that **cannot be fully backed by hard numbers**. I'm flagging them so we don't overclaim:

1. **Direct red → RSD link.** No published study isolates red UI as a trigger for RSD episodes. The mechanism is well-supported by adjacent research, but the causal study does not exist.

2. **"+20% comprehension from white space"** is widely repeated but I could not trace it to a single primary study with published methodology in this search round. It's likely from Chaparro et al. (IJHCI), but needs verification before being cited as fact.

3. **"15% longer viewing duration with pastel + reduced motion"** comes from Smashing Magazine summarizing a study on neurodivergent students; I could not directly fetch the article and verify the underlying study reference.

4. **Letter spacing for ADHD specifically** — almost all the spacing research is on dyslexia. ADHD-specific letter-spacing studies are rare. We are extrapolating from dyslexia research to a partially-overlapping population.

5. **Optimal animation duration for ADHD specifically** — the 200-500 ms band comes from general UX research. There is no published ADHD-specific optimum I could find. We may be undershooting (faster animations) or overshooting (slower for time-blindness).

6. **Surprise timer (no digits, no arc) effectiveness** — MindShift's surprise mode is a novel pattern. There is no published research validating it specifically. The underlying time-blindness research supports the *idea* but not the *implementation*.

Treat these as **R&D opportunities** — places where MindShift could conduct its own user study and contribute back to the field.

---

## 9. How to encode in MindShift code

Concrete file/token mapping (verify against current source before refactoring):

| Metric | Where it should live |
|---|---|
| APCA Lc 75/90 targets | `tokens.ts` — add `apcaTarget` constants alongside `colors` |
| Body 16 px / line-height 1.5 | `index.css` `:root { --text-base: 1rem; --leading-base: 1.5; }` (verify current values) |
| Letter spacing 0.01-0.03em | Same `:root` block |
| Animation duration 200-400 ms | `:root { --motion-fast: 200ms; --motion-base: 300ms; --motion-slow: 400ms; }` — verify current usage |
| Reduced-motion override | `useMotion()` hook (already exists) — confirm it sets duration to 0.001 ms not just disabling |
| Touch target ≥44 px | Audit `Button`, `Fab`, `EnergyPicker`, `TaskCard` action area |
| Working memory ceiling | `getNowPoolMax()` already encodes 3 — document the Cowan citation in a comment |
| Saturation cap 70% | Add a Stylelint or token-validation rule that fails if any token exceeds `hsl(*, 70%, *)` |
| No-red rule | Already enforced by `.claude/rules/guardrails.md` Rule 1 — add citation block linking to this file |
| Vestibular trigger ban | Add to `guardrails.md` Rule 2 — explicit list (parallax, scaling, spinning) |

---

## 10. Sources — full list, sorted

### W3C / WCAG (primary spec)
- [W3C — Understanding 1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html)
- [W3C — Understanding 2.3.1 Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)
- [W3C — Understanding 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- [W3C — Understanding 2.5.5 Target Size (AAA)](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [W3C — Understanding 2.5.8 Target Size Minimum (AA)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [W3C — Understanding 2.3.3 Animation from Interactions (WCAG 2.2)](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

### Color contrast / APCA
- [APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)
- [APCA — Why a New Contrast Method](https://git.apcacontrast.com/documentation/WhyAPCA)
- [APCA discussion #18 — Dark Mode, Protan, and Related Q&A](https://github.com/Myndex/SAPC-APCA/discussions/18)
- [Designsystemet — WCAG 3.0 introduces a new contrast method](https://designsystemet.no/en/best-practices/accessibility/contrast)
- [Accessibility Checker — APCA explainer](https://www.accessibilitychecker.org/blog/apca-advanced-perceptual-contrast-algorithm/)

### Color and dyslexia / visual stress
- [Cardiff University — Not just pretty colours](https://blogs.cardiff.ac.uk/LTAcademy/not-just-pretty-colours-using-colour-and-contrast-inclusively/)
- [The effect of contrast on reading speed in dyslexia (PubMed 10837835)](https://pubmed.ncbi.nlm.nih.gov/10837835/)
- [BDA Dyslexia Style Guide 2023](https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf)

### Color and ADHD / autism
- [Color vision in ADHD: Part 2 (PMC4282194)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4282194/)
- [Sensory processing differences and color preferences in ASD (Nature)](https://www.nature.com/articles/s41599-025-05753-4)
- [Wellbuiltplaces — Best Practices for Colour: ADHD](https://wellbuiltplaces.org/2024/08/03/best-practices-for-design-and-use-of-colour-focus-on-adhd/)
- [Villa Healing Center — Calming Colors](https://villahealingcenter.com/calming-colors-psychology/)
- [Neurolaunch — ADHD Colours to Avoid](https://neurolaunch.com/adhd-colours-to-avoid/)
- [Neurolaunch — Angry Color: Red and Rage](https://neurolaunch.com/angry-color/)
- [Brain Health University — Color and Cognition](https://brainhealthuniversity.com/brain-health-insights/how-color-affects-cognition-what-your-brain-feels-in-a-blue-room-vs-a-red-one/)
- [UTH Neuroscience Online — Limbic System: Amygdala](https://nba.uth.tmc.edu/neuroscience/m/s4/chapter06.html)

### Typography research
- [Zorzi et al. — Extra-large letter spacing in dyslexia (PNAS 2012)](https://www.pnas.org/doi/10.1073/pnas.1205566109)
- [Inter-letter spacing study (PMC7188700)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7188700/)
- [Baymard — Optimal Line Length](https://baymard.com/blog/line-length-readability)
- [ERIC EJ749012 — Optimal Line Length Literature Review (Visible Language 2005)](https://eric.ed.gov/?id=EJ749012)
- [Typography.Guru — Does large x-height help legibility](https://typography.guru/journal/does-a-large-x-height-make-fonts-more-legible-r16/)
- [Webyes — Best Accessible Fonts 2026](https://www.webyes.com/blogs/best-fonts-accessibility/)
- [Teleprompter — Lexend and OpenDyslexic effectiveness](https://www.teleprompter.com/blog/effectiveness-of-lexend-and-opendyslexic-fonts)
- [The A11Y Project — Background: Dyslexia fonts](https://www.a11yproject.com/posts/dyslexia-fonts/)
- [USWDS — Typography component](https://designsystem.digital.gov/components/typography/)

### Working memory and cognitive load
- [Cowan — Magical Number 4 in short-term memory (PubMed 11515286)](https://pubmed.ncbi.nlm.nih.gov/11515286/)
- [Cowan — Magical Mystery Four (PMC2864034)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2864034/)
- [Cowan 2010 — Magical Mystery Four (Sage)](https://journals.sagepub.com/doi/abs/10.1177/0963721409359277)
- [Wikipedia — Magical Number Seven Plus or Minus Two](https://en.wikipedia.org/wiki/The_Magical_Number_Seven,_Plus_or_Minus_Two)
- [Neural basis of WM in ADHD: Load vs Complexity (PMC8175567)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8175567/)
- [Hick-Hyman Law mediated by Cognitive Control Network (PMC5998988)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5998988/)
- [Cognitive load and motivation in children with ADHD (PMC5468500)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5468500/)
- [Challenging Cognitive Load Theory (PMC11852728)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11852728/)

### Motion and animation
- [NN/g — Executing UX Animations: Duration and Motion Characteristics](https://www.nngroup.com/articles/animation-duration/)
- [Material Design 1 — Motion Duration & Easing](https://m1.material.io/motion/duration-easing.html)
- [web.dev — Animation and motion](https://web.dev/learn/accessibility/motion)
- [Sparkbox — Prefers-Reduced-Motion Tutorial](https://sparkbox.com/foundry/prefers_reduced_motion_media_query_CSS_rule_for_WCAG_accessibility)
- [A List Apart — Designing Safer Web Animation](https://alistapart.com/article/designing-safer-web-animation-for-motion-sensitivity/)
- [Web Axe — Vestibular Issues in Parallax](https://www.webaxe.org/vestibular-issues-parallax-design/)
- [Pope Tech — Design accessible animation and movement](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/)
- [educationalvoice — Accessibility Animation](https://educationalvoice.co.uk/accessibility-animation/)
- [MDN — Web accessibility for seizures](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Seizure_disorders)

### RSD / ADHD emotion
- [ADDitude — RSD: ADHD and Emotional Dysregulation (Dodson)](https://www.additudemag.com/rejection-sensitive-dysphoria-adhd-emotional-dysregulation/)
- [Cleveland Clinic — Rejection Sensitive Dysphoria](https://my.clevelandclinic.org/health/diseases/24099-rejection-sensitive-dysphoria-rsd)
- [Neurodivergent Insights — RSD History](https://neurodivergentinsights.com/history-of-rejection-sensitive-dysphoria/)
- [The lived experience of rejection sensitivity in ADHD (PMC12822938)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12822938/)
- [CHADD — Dodson Emotional Regulation PDF](https://chadd.org/wp-content/uploads/2016/10/ATTN_10_16_EmotionalRegulation.pdf)

### White space and cognitive load
- [Orrbitt — White Space and Cognitive Load](https://orrbitt.com/news/white-space-cognitive-load-designing-easier-processing/)
- [Cieden — How does white space affect comprehension](https://cieden.com/book/sub-atomic/spacing/white-space)

### Touch targets
- [Smashing Magazine — Accessible Tap Target Sizes](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/)
- [Smart Interface Design Patterns — Mobile Accessibility Target Sizes Cheatsheet](https://smart-interface-design-patterns.com/articles/accessible-tap-target-sizes/)

### Neurodiversity / inclusive design overviews
- [Smashing Magazine — Designing For Neurodiversity (June 2025)](https://www.smashingmagazine.com/2025/06/designing-for-neurodiversity/)
- [Boise State — Neurodivergent Inclusive Web Design](https://www.boisestate.edu/accessibility/2025/09/12/understanding-the-why-around-neurodivergent-inclusive-web-design-owen-niblock/)
- [ProfileTree — Inclusive Animation Design](https://profiletree.com/inclusive-animation-design-creating-accessible-motion-graphics-for-neurodiverse-audiences/)
- [Sirkotsky — Inclusive typefaces](https://sirkotsky.substack.com/p/inclusive-typefaces-that-we-know)
- [UXPA Magazine — Neurodiversity: Inclusive User Experience](https://uxpamagazine.org/neurodiversity-inclusive-user-experience/)

---

## 11. What changed for MindShift after this research

The Foundation Laws and `.claude/rules/guardrails.md` are mostly **already aligned** with the research. Specific updates that should happen:

1. **Add APCA Lc targets to `tokens.ts`** — replace any reference to "WCAG AA contrast" with "APCA Lc ≥75 body, ≥60 UI."
2. **Cap dark-mode contrast at Lc ~90** to prevent halation. Current `#E8E8F0` on `#1E2136` → run APCA check.
3. **Add Cowan citation** to `getNowPoolMax()` and ADR-0005 (palette decision).
4. **Document the Sweller / Cowan basis** for `isLowEnergy` adaptive UI in an ADR (would be ADR-0008 — "Cognitive Load Adaptive UI").
5. **Add explicit vestibular trigger ban** to guardrails Rule 2: parallax, scaling >1.2×, rotation, peripheral horizontal motion, multi-speed motion.
6. **Verify all CSS transitions** stay within 200-500 ms band; flag any outliers.
7. **Verify all touch targets** ≥44 px; gap ≥8 px.
8. **Open question:** ship Lexend or stay on Inter? Lexend has stronger published reading-fluency evidence; Inter has stronger glyph quality at small sizes. A user-facing toggle ("Reading mode") may be the most honest answer.
9. **Annotate the "+20% white space" claim** in any pitch deck or marketing copy as "widely cited (Chaparro et al., needs primary source verification)" rather than as fact.
10. **Surprise mode and ambient orbit** are novel patterns — flag them in research notes as hypotheses MindShift can validate via its own user data.

---

**End of file.**

If anything in this document changes the existing Foundation Laws, the law wins by default (Constitution priority). This file is research input, not a binding rule set.
