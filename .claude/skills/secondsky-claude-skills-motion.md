---
name: framer-motion
description: "Expert skill for Motion (formerly Framer Motion) — the React animation library. Use this skill whenever the user asks to animate React components, add transitions, implement gesture interactions (drag, hover, tap), create scroll-linked effects, animate route/component presence, or build shared-element transitions. Also triggers for: page transitions, spring animations, layout animations, AnimatePresence, variants, useMotionValue, useScroll, useTransform, whileHover, whileTap, stagger effects, motion values, or any 'how do I animate X in React' question. Invoke even if the user doesn't mention 'framer-motion' by name — if they want smooth UI animations in React, this skill applies."
---

# Motion for React (Framer Motion) — Expert Skill

Motion (formerly Framer Motion, package: `framer-motion` OR `motion`) is the industry-standard animation library for React. It provides a hybrid engine: hardware-accelerated via Web Animations API with JavaScript fallback for springs, gestures, and layout.

## References in this skill

| File | When to read it |
|------|----------------|
| `references/motion-values.md` | `useMotionValue`, `useTransform`, `useSpring`, `useVelocity`, `useMotionTemplate` |
| `references/layout-animations.md` | `layout`, `layoutId`, `LayoutGroup`, `AnimatePresence`, shared element transitions |
| `references/gestures-and-scroll.md` | `drag`, `whileHover/Tap/Focus`, `useScroll`, scroll-linked animations |
| `references/patterns-and-performance.md` | `LazyMotion`, `MotionConfig`, `useReducedMotion`, `useAnimate`, stagger, orchestration |

---

## 1. Import paths

```tsx
// Standard React projects (framer-motion package)
import { motion, AnimatePresence, MotionConfig } from "framer-motion"

// motion package (newer naming, same API)
import { motion, AnimatePresence } from "motion/react"

// Next.js Server Components — use client-side import
import * as motion from "motion/react-client"

// Bundle optimization (replaces `motion` component)
import * as m from "motion/react-m"
```

> Always check whether the project uses `framer-motion` or `motion`. They share an identical API. The `framer-motion` package is more common in existing codebases.

---

## 2. The `motion` component — foundation of everything

Any HTML or SVG element can be animated by prefixing with `motion.`:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
/>
```

### Key animation props

| Prop | Purpose |
|------|---------|
| `initial` | Starting state (before mount or animation) |
| `animate` | Target animated state |
| `exit` | State when component is removed (requires `AnimatePresence`) |
| `transition` | Controls timing, easing, type (tween/spring) |
| `style` | Supports MotionValues as live style bindings |
| `variants` | Named animation states defined externally |
| `whileHover` | Animate while hovered |
| `whileTap` | Animate while pressed |
| `whileFocus` | Animate while focused |
| `whileDrag` | Animate while dragging |
| `whileInView` | Animate while in viewport |
| `layout` | Auto-animate layout changes |
| `layoutId` | Shared element transition between components |

### Custom components

```tsx
// React 19 — pass ref via props
const MyDiv = (props) => <div ref={props.ref} {...props} />
const MotionMyDiv = motion.create(MyDiv)

// React 18 — forwardRef pattern
const MyDiv = React.forwardRef((props, ref) => <div ref={ref} />)
const MotionMyDiv = motion.create(MyDiv)
```

---

## 3. Transitions

Transitions define *how* values move between states.

```tsx
// Spring (default for physical/interactive feel)
transition={{ type: "spring", stiffness: 300, damping: 30 }}

// Tween (duration-based, predictable)
transition={{ type: "tween", duration: 0.5, ease: "easeInOut" }}

// Spring with visual duration (easier to reason about)
transition={{ type: "spring", visualDuration: 0.4, bounce: 0.25 }}

// Keyframe-specific timing
animate={{ x: [0, 100, 50, 150] }}
transition={{ times: [0, 0.3, 0.6, 1], duration: 1.5 }}

// Delay
transition={{ delay: 0.2, duration: 0.4 }}

// Per-property overrides
transition={{ duration: 1, x: { duration: 2, ease: "linear" } }}
```

### Easing values
Standard: `"linear"`, `"easeIn"`, `"easeOut"`, `"easeInOut"`, `"circIn"`, `"circOut"`, `"backIn"`, `"backOut"`, `"anticipate"`
Custom cubic bezier: `[0.17, 0.67, 0.83, 0.67]`

---

## 4. Variants — declarative state machines for animations

Variants let you define named animation states and propagate them through the component tree automatically. They're the key to orchestrated, staggered animations across multiple elements.

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,       // delay between each child
      delayChildren: 0.2,         // delay before first child starts
      when: "beforeChildren"      // parent animates before children
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
}

// Children inherit "hidden"/"visible" state automatically
<motion.ul
  variants={containerVariants}
  initial="hidden"
  animate="visible"
>
  {items.map(item => (
    <motion.li key={item.id} variants={itemVariants}>
      {item.label}
    </motion.li>
  ))}
</motion.ul>
```

**Dynamic variants** — pass per-element data via `custom` prop:

```tsx
const variants = {
  visible: (delay: number) => ({
    opacity: 1,
    transition: { delay }
  })
}

<motion.li custom={index * 0.1} variants={variants} />
```

---

## 5. AnimatePresence — exit animations

Wrap components that conditionally render to enable `exit` animations:

```tsx
import { AnimatePresence, motion } from "framer-motion"

<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div
      key="modal"                         // key is required
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    />
  )}
</AnimatePresence>
```

### `mode` options
- `"sync"` (default) — enter and exit simultaneously
- `"wait"` — exit finishes before enter starts
- `"popLayout"` — exiting element is removed from layout immediately (useful for lists)

### List with exit animations

```tsx
<AnimatePresence mode="popLayout">
  {items.map(item => (
    <motion.li
      key={item.id}
      layout                              // smooth reordering
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    />
  ))}
</AnimatePresence>
```

---

## 6. whileX gesture props — quick reference

```tsx
<motion.button
  whileHover={{ scale: 1.05, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
  whileTap={{ scale: 0.97 }}
  whileFocus={{ outline: "2px solid #3b82f6" }}
  transition={{ type: "spring", stiffness: 400, damping: 20 }}
/>

// Scroll-triggered
<motion.section
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.6 }}
/>
```

> For drag gestures and advanced gesture event handlers, read `references/gestures-and-scroll.md`.

---

## 7. Layout animations — automatic FLIP

Add `layout` to any `motion` element and it smoothly animates whenever its size or position changes in the DOM.

```tsx
// Accordion that animates open/close
function Accordion({ isOpen, children }) {
  return (
    <motion.div layout className="accordion">
      {isOpen && <motion.div layout>{children}</motion.div>}
    </motion.div>
  )
}

// Shared element transition (magic move between components)
// Both components must have the same layoutId
function List({ items, selectedId, onSelect }) {
  return items.map(item => (
    <motion.li key={item.id} onClick={() => onSelect(item.id)}>
      {selectedId === item.id && (
        <motion.div layoutId="selected-indicator" className="underline" />
      )}
      {item.label}
    </motion.li>
  ))
}
```

> For `LayoutGroup`, `layoutScroll`, `layoutRoot`, and complex shared transitions, read `references/layout-animations.md`.

---

## 8. Scroll-linked animations

```tsx
import { useScroll, useTransform } from "framer-motion"

function ParallaxHero() {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -200])
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])

  return <motion.div style={{ y, opacity }}>Hero content</motion.div>
}

// Scoped to a specific element
function FadeInSection({ children }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0])

  return <motion.div ref={ref} style={{ opacity }}>{children}</motion.div>
}
```

> For `useInView`, `scroll()` function, `useVelocity`, and advanced scroll patterns, read `references/gestures-and-scroll.md`.

---

## 9. Motion Values — reactive animation primitives

Motion values are observable values that drive animations without React re-renders. They're the performance-first approach for complex, interactive animations.

```tsx
import { useMotionValue, useTransform, useSpring } from "framer-motion"

function MagneticButton() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Derive values — no re-renders
  const rotateX = useTransform(y, [-50, 50], [15, -15])
  const rotateY = useTransform(x, [-50, 50], [-15, 15])

  // Spring-smoothed version of x
  const smoothX = useSpring(x, { stiffness: 200, damping: 20 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    x.set(e.clientX - rect.left - rect.width / 2)
    y.set(e.clientY - rect.top - rect.height / 2)
  }

  return (
    <motion.button
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0) }}
      style={{ x: smoothX, rotateX, rotateY, transformPerspective: 500 }}
    />
  )
}
```

> For `useTransform` with multiple inputs, `useMotionTemplate`, `useVelocity`, and `useMotionValueEvent`, read `references/motion-values.md`.

---

## 10. MotionConfig — global animation defaults

```tsx
<MotionConfig
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
  reducedMotion="user"           // respects prefers-reduced-motion
>
  {/* All child motion components use spring by default */}
  <App />
</MotionConfig>
```

---

## 11. Common patterns cheat-sheet

### Page transition (Next.js App Router)
```tsx
// layout.tsx — wrap children
<AnimatePresence mode="wait">
  <motion.main
    key={pathname}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.main>
</AnimatePresence>
```

### Staggered list reveal on mount
```tsx
const list = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }

<motion.ul variants={list} initial="hidden" animate="visible">
  {items.map(i => <motion.li key={i.id} variants={item}>{i.label}</motion.li>)}
</motion.ul>
```

### Skeleton → content swap with `layoutId`
```tsx
// Skeleton card
<motion.div layoutId={`card-${id}`} className="skeleton" />

// Loaded card (same layoutId, animates from skeleton position/size)
<motion.div layoutId={`card-${id}`} className="card">
  {content}
</motion.div>
```

### Drag-to-dismiss
```tsx
<motion.div
  drag="y"
  dragConstraints={{ top: 0 }}
  dragElastic={0.2}
  onDragEnd={(_, info) => {
    if (info.velocity.y > 500 || info.offset.y > 200) onDismiss()
  }}
  exit={{ y: "100%", opacity: 0 }}
/>
```

---

## 12. Quick diagnostics

| Symptom | Likely cause & fix |
|---------|-------------------|
| Exit animation not playing | Missing `AnimatePresence` wrapper or missing `key` prop |
| Layout animation jumpy | Wrap siblings in `LayoutGroup`; add `layoutScroll` to scrollable parents |
| `motion.create()` breaks animations | Called inside render — move to module scope |
| High re-render count during animation | Use `useMotionValue` + `style` prop instead of React state |
| `whileInView` fires on every render | Add `viewport={{ once: true }}` |
| Spring feels wrong | Use `visualDuration` + `bounce` instead of `stiffness`/`damping` — easier to tune |
