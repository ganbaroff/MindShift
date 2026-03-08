/**
 * QuickFocusWidget — CBT behavioural activation ("Just 5 Minutes").
 * Research: Task initiation paradox — lowest-resistance entry reduces Primode.
 */
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { hapticTap } from '@/shared/lib/haptic'

export function QuickFocusWidget() {
  const { startSession, setPhase, focusAnchor } = useStore()
  const navigate = useNavigate()

  const handleStart = () => {
    hapticTap()
    startSession(null, 5, focusAnchor ?? 'brown')
    setPhase('struggle')
    navigate('/focus?quick=1')
  }

  return (
    <motion.button
      onClick={handleStart}
      whileTap={{ scale: 0.97 }}
      className="w-full flex items-center gap-4 text-left"
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: 'rgba(78,205,196,0.2)' }}
      >
        ⚡
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold" style={{ color: '#4ECDC4' }}>
          Just 5 minutes
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#8B8BA7' }}>
          Can't start? One tap. No decisions. Just begin.
        </p>
      </div>

      <motion.span
        animate={{ x: [0, 4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ color: '#4ECDC4', fontSize: 18 }}
      >
        →
      </motion.span>
    </motion.button>
  )
}
