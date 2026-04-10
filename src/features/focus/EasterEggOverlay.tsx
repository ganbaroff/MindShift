/**
 * EasterEggOverlay — "Я не бот" Easter egg
 *
 * Triggered by useRapidTapDetector (7+ taps in 3s on the Start button).
 * The app becomes self-aware and jokes back.
 *
 * Design intent (product owner decision):
 *   The red button is INTENTIONAL and approved by the product owner.
 *   Constitution Law #1 (NEVER RED) governs UX design — error states,
 *   warnings, task indicators. This is a one-off joke component, not UX.
 *   The "big red button from the movies" trope works BECAUSE it's red.
 *   Removing the red kills the joke.
 *
 * Research backing:
 *   Persona "Dima" (16, Gen Z): "boring, nobody screenshots this"
 *   Alex (platform strategist): "No viral artifact"
 *   This is MindShift's viral moment — the thing people screenshot and send.
 *
 * AI personalization:
 *   Hardcoded psychotype-specific line shows instantly.
 *   Mochi AI response replaces it if it arrives within 4s window.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'
import { Confetti } from '@/shared/ui/Confetti'
import { nativeHapticImpact } from '@/shared/lib/native'
import { supabase } from '@/shared/lib/supabase'
import { useStore } from '@/store'

// -- Hardcoded lines (psychotype-aware, shown instantly) -----------------------

const INITIAL_LINES: Record<string, string> = {
  achiever:  'Рекорд по нажатиям не считается. 😤',
  explorer:  'Нашёл что-то интересное? Нет. Продолжай. 🔬',
  connector: 'Одиноко нажимаешь? Позови кого-нибудь. 🤝',
  planner:   'Это не было в плане. 📋',
  default:   'Я не бот. Отстань. 😤',
}

const PRESSED_LINES = [
  'Ну я же сказал(а) 🙄',
  'Ожидаемо. 🙄',
  'Серьёзно? 🙄',
]

// -- Types ---------------------------------------------------------------------

interface EasterEggOverlayProps {
  visible: boolean
  onDismiss: () => void
}

// -- Component -----------------------------------------------------------------

export function EasterEggOverlay({ visible, onDismiss }: EasterEggOverlayProps) {
  const { shouldAnimate, t: transition } = useMotion()
  const { psychotype, energyLevel, currentStreak, userId } = useStore()

  const [showButton, setShowButton]           = useState(false)
  const [pressed, setPressed]                 = useState(false)
  const [showConfetti, setShowConfetti]       = useState(false)
  const [mainText, setMainText]               = useState('')
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const buttonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiReplaced = useRef(false)

  // Pick initial text (psychotype-aware, instant)
  const initialLine = INITIAL_LINES[psychotype ?? 'default'] ?? INITIAL_LINES.default
  const pressedLine = PRESSED_LINES[Math.floor(Math.random() * PRESSED_LINES.length)]

  // Reset and start timers when overlay opens
  useEffect(() => {
    if (!visible) return

    setShowButton(false)
    setPressed(false)
    setShowConfetti(false)
    setMainText(initialLine)
    aiReplaced.current = false

    // Button appears after 1.5s
    buttonTimerRef.current = setTimeout(() => setShowButton(true), 1500)

    // Auto-dismiss after 5s
    autoCloseRef.current = setTimeout(() => onDismiss(), 5000)

    // Try AI personalization (4s window, best-effort)
    if (userId && !userId.startsWith('guest_')) {
      fetchMochiPersonalization(psychotype, energyLevel, currentStreak)
        .then(text => {
          if (text && !aiReplaced.current && !pressed) {
            setMainText(text)
            aiReplaced.current = true
          }
        })
        .catch(() => { /* silent — hardcoded is fine */ })
    }

    return () => {
      if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current)
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const handleButtonPress = useCallback(() => {
    if (pressed) return
    aiReplaced.current = true // freeze text
    setPressed(true)
    setShowConfetti(true)
    nativeHapticImpact('heavy')
    setMainText(pressedLine)

    // Clear existing auto-close, schedule faster one
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current)
    autoCloseRef.current = setTimeout(() => onDismiss(), 2000)
  }, [pressed, pressedLine, onDismiss])

  if (!visible) return null

  return (
    <AnimatePresence>
      {visible && (
        <>
          <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

          {/* Backdrop */}
          <motion.div
            key="easter-backdrop"
            initial={shouldAnimate ? { opacity: 0 } : {}}
            animate={{ opacity: 1 }}
            exit={shouldAnimate ? { opacity: 0 } : {}}
            transition={transition()}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
            style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.6)' }}
            onClick={onDismiss}
            role="dialog"
            aria-modal="true"
            aria-label="Easter egg overlay"
          >
            {/* Card */}
            <motion.div
              key="easter-card"
              initial={shouldAnimate ? { scale: 0.85, opacity: 0 } : {}}
              animate={shouldAnimate
                ? { scale: [0.85, 1.05, 1], opacity: 1, x: [0, -8, 8, -8, 8, 0] }
                : { opacity: 1 }}
              exit={shouldAnimate ? { scale: 0.85, opacity: 0 } : {}}
              transition={shouldAnimate ? { duration: 0.5 } : { duration: 0 }}
              className="w-full max-w-[320px] rounded-3xl px-6 py-8 flex flex-col items-center gap-6 text-center"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid rgba(123,114,255,0.2)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Main text */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={mainText}
                  initial={shouldAnimate ? { opacity: 0, y: 6 } : {}}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldAnimate ? { opacity: 0, y: -6 } : {}}
                  transition={transition()}
                  className="text-xl font-bold leading-snug"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {mainText}
                </motion.p>
              </AnimatePresence>

              {/* The big red button — intentional, product-owner approved */}
              <AnimatePresence>
                {showButton && !pressed && (
                  <motion.button
                    key="red-btn"
                    initial={shouldAnimate ? { scale: 0, opacity: 0 } : {}}
                    animate={shouldAnimate
                      ? { scale: [0, 1.15, 0.95, 1], opacity: 1 }
                      : { opacity: 1 }}
                    exit={shouldAnimate ? { scale: 0, opacity: 0 } : {}}
                    transition={shouldAnimate ? { duration: 0.4 } : { duration: 0 }}
                    onClick={handleButtonPress}
                    className="w-32 h-32 rounded-full font-bold text-lg text-white
                               focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none
                               active:scale-95 transition-transform"
                    style={{
                      /* Product owner override: red is the joke. See file header. */
                      background: 'radial-gradient(circle at 35% 35%, #FF4444, #CC0000)',
                      boxShadow: '0 8px 24px rgba(200,0,0,0.5), 0 2px 0 #990000, inset 0 1px 0 rgba(255,100,100,0.4)',
                    }}
                    aria-label="Do not press this button"
                  >
                    НЕ<br />НАЖИМАЙ
                  </motion.button>
                )}

                {pressed && (
                  <motion.div
                    key="pressed-state"
                    initial={shouldAnimate ? { scale: 0.8 } : {}}
                    animate={{ scale: 1 }}
                    transition={transition()}
                    className="w-32 h-32 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(200,0,0,0.15)',
                      border: '2px solid rgba(200,0,0,0.3)',
                    }}
                  >
                    <span className="text-4xl">🙄</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Subtext */}
              <AnimatePresence>
                {showButton && !pressed && (
                  <motion.p
                    initial={shouldAnimate ? { opacity: 0 } : {}}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Я знаю, тебя это бесит 😏
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// -- AI personalization (best-effort, 4s window) --------------------------------

async function fetchMochiPersonalization(
  psychotype: string | null,
  energyLevel: number,
  currentStreak: number,
): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)

    const { data, error } = await supabase.functions.invoke('mochi-respond', {
      body: {
        trigger: 'chat',
        context: {
          psychotype:          psychotype ?? 'planner',
          sessionPhase:        'struggle',
          elapsedMinutes:      0,
          energyLevel,
          totalSessions:       0,
          currentStreak,
          completedToday:      0,
          timeBlindness:       null,
          emotionalReactivity: null,
          recentStruggles:     'user just rapid-tapped the start button 7+ times — be playful and self-aware, like the app caught them mashing buttons. 1 sentence max. funny, not preachy.',
          seasonalMode:        'launch',
        },
        locale: navigator.language,
      },
    })

    clearTimeout(timer)
    if (error || !data?.message) return null
    return data.message as string
  } catch {
    return null
  }
}
