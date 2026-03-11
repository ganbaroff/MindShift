import { motion } from 'motion/react'
import { useMotion } from '@/shared/hooks/useMotion'

export function LoadingScreen() {
  const { shouldAnimate } = useMotion()

  return (
    <div className="fixed inset-0 flex items-center justify-center"
         style={{ background: '#0F1117' }}>
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Logo mark */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
             style={{ background: 'rgba(123, 114, 255, 0.15)', border: '1px solid rgba(123, 114, 255, 0.3)' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="12" stroke="#7B72FF" strokeWidth="2"/>
            {/* Reduced-motion: static arc; normal: spinning arc */}
            {shouldAnimate ? (
              <motion.path
                d="M16 4 A12 12 0 0 1 28 16"
                stroke="#7B72FF" strokeWidth="2.5" strokeLinecap="round"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: '16px 16px' }}
              />
            ) : (
              /* Reduced-motion fallback: gentle opacity pulse instead of rotation */
              <motion.path
                d="M16 4 A12 12 0 0 1 28 16"
                stroke="#7B72FF" strokeWidth="2.5" strokeLinecap="round"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '16px 16px' }}
              />
            )}
          </svg>
        </div>
        <p style={{ color: '#8B8BA7', fontSize: 14 }}>Loading MindShift…</p>
      </motion.div>
    </div>
  )
}
