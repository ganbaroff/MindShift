/**
 * MindShift Design Tokens
 *
 * Single source of truth for all visual values.
 * Previously these were hardcoded as hex literals throughout the codebase.
 *
 * Usage:
 *   import { tokens } from '@/shared/lib/tokens'
 *   style={{ color: tokens.color.textPrimary }}
 *
 * Migration path:
 *   1. New components: use tokens directly
 *   2. Existing components: migrate opportunistically in future passes
 *   3. Long-term: move to CSS custom properties via Tailwind v4 @theme
 */

// ── Color ─────────────────────────────────────────────────────────────────────

export const color = {
  // Brand
  primary:       '#7B72FF',  // Indigo — CTA, FAB, focus arc (struggle), primary accent
  primaryAlpha15: '#7B72FF26', // 15% alpha — button ghost bg

  // Semantic (Research #8: teal/indigo/gold, NO RED)
  teal:          '#4ECDC4',  // Easy tasks, release/flow phase, complete actions
  tealAlpha15:   '#4ECDC4' + '26', // 15% alpha
  gold:          '#F59E0B',  // Hard tasks, carry-over badge, recovery phase (warm amber)
  goldAlpha20:   '#F59E0B' + '33', // 20% alpha

  // Surfaces (dark navy family)
  surface:        '#1E2136', // Card background (darkest)
  surfaceRaised:  '#252840', // Input bg, disabled states, arc track
  surfaceOverlay: '#2D3150', // Slightly lighter than raised

  // Text
  textPrimary:    '#E8E8F0', // Body text, headings
  textMuted:      '#8B8BA7', // Secondary, placeholder, labels
  textInverse:    '#FFFFFF',

  // Borders
  borderSubtle:   'rgba(255,255,255,0.06)', // Default card borders
  borderAccent:   'rgba(123,114,255,0.35)', // InstallBanner border

  // Phase colors (FocusScreen ArcTimer)
  phaseIdle:      '#252840',
  phaseStruggle:  '#7B72FF', // Same as primary — indigo
  phaseRelease:   '#4ECDC4', // Same as teal
  phaseFlow:      '#4ECDC4', // Same as teal
  phaseRecovery:  '#F59E0B', // Same as gold

  // Functional
  error:          '#F59E0B', // We use gold for warnings (no red = ADHD principle)
  success:        '#4ECDC4', // Teal for positive states
  overlay:        'rgba(0,0,0,0.6)', // Modal/recovery backdrop

  // App background
  bg:             '#131525', // Root background (darkest navy)
} as const

// ── Typography ────────────────────────────────────────────────────────────────

export const typography = {
  // Font stack (system fonts — no custom fonts for PWA performance)
  fontFamily:     '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontMono:       'ui-monospace, "SF Mono", Menlo, monospace',

  // Scale (rem)
  sizeXs:   '0.75rem',   // 12px — labels, badges, metadata
  sizeSm:   '0.875rem',  // 14px — secondary text
  sizeBase:  '1rem',      // 16px — body
  sizeLg:   '1.125rem',  // 18px — card titles
  sizeXl:   '1.25rem',   // 20px — screen headings
  size2xl:  '1.5rem',    // 24px — hero numbers
  size3xl:  '2rem',      // 32px — large stats

  // Weights
  weightNormal:    '400',
  weightMedium:    '500',
  weightSemibold:  '600',
  weightBold:      '700',

  // Line heights
  lineHeightTight:    '1.2',
  lineHeightNormal:   '1.5',
  lineHeightRelaxed:  '1.75',

  // Letter spacing
  trackingWider:  '0.05em',
  trackingWidest: '0.1em',
} as const

// ── Spacing ───────────────────────────────────────────────────────────────────

export const spacing = {
  // Base 4px scale (Tailwind compatible)
  0:    '0',
  1:    '0.25rem',  // 4px
  2:    '0.5rem',   // 8px
  3:    '0.75rem',  // 12px
  4:    '1rem',     // 16px
  5:    '1.25rem',  // 20px
  6:    '1.5rem',   // 24px
  8:    '2rem',     // 32px
  10:   '2.5rem',   // 40px
  12:   '3rem',     // 48px
  16:   '4rem',     // 64px
  20:   '5rem',     // 80px
  24:   '6rem',     // 96px

  // Semantic aliases
  cardPadding:    '1rem',     // p-4
  screenPadding:  '1.25rem',  // px-5
  sectionGap:     '1rem',     // gap-4
  cardGap:        '0.75rem',  // gap-3
  safeBottom:     'env(safe-area-inset-bottom)',
} as const

// ── Borders ───────────────────────────────────────────────────────────────────

export const border = {
  radiusSm:   '0.5rem',   // rounded-lg
  radiusMd:   '0.75rem',  // rounded-xl
  radiusLg:   '1rem',     // rounded-2xl
  radiusFull: '9999px',   // rounded-full (avatars, pills)

  widthDefault: '1px',
  widthThick:   '2px',
  widthAccent:  '3px',    // Difficulty accent on TaskCard left border
} as const

// ── Shadows ───────────────────────────────────────────────────────────────────

export const shadow = {
  card:   '0 2px 8px rgba(0,0,0,0.25)',
  banner: '0 8px 32px rgba(0,0,0,0.45)',
  focus:  '0 0 0 2px #7B72FF',           // Focus ring
} as const

// ── Motion ────────────────────────────────────────────────────────────────────

export const motion = {
  // Durations
  instant:  0,
  fast:     150,  // ms
  normal:   200,  // ms — most button transitions
  slow:     500,  // ms — fade in/out
  xslow:    1200, // ms — arc timer shrink between phases

  // Spring presets (Framer Motion)
  springBouncy:  { type: 'spring', damping: 18, stiffness: 350 },
  springSmooth:  { type: 'spring', damping: 24, stiffness: 260 },
  springStiff:   { type: 'spring', damping: 32, stiffness: 400 },
} as const

// ── Touch targets ─────────────────────────────────────────────────────────────

export const touch = {
  minTarget: 44,   // px — WCAG 2.1 AA + iOS HIG minimum
  fabSize:   56,   // px — Floating Action Button
} as const

// ── Z-index ───────────────────────────────────────────────────────────────────

export const zIndex = {
  base:      0,
  card:      10,
  stickyHeader: 20,
  nav:       30,   // BottomNav
  banner:    40,   // InstallBanner, ContextRestore
  overlay:   50,   // CookieBanner, RecoveryProtocol, modals
} as const

// ── Aggregate export ──────────────────────────────────────────────────────────

export const tokens = {
  color,
  typography,
  spacing,
  border,
  shadow,
  motion,
  touch,
  zIndex,
} as const

export type Tokens = typeof tokens
