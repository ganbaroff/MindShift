import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Sparkles } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { Button } from '@/shared/ui/Button'
import { toast } from 'sonner'

type Step = 'email' | 'check'

export default function AuthScreen() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendLink = async () => {
    if (!email.trim()) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    setLoading(false)
    if (error) {
      toast.error('Something went wrong. Please try again.')
      return
    }
    setStep('check')
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6"
         style={{ background: '#0F1117' }}>

      {/* Logo */}
      <motion.div
        className="flex flex-col items-center mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
             style={{ background: 'rgba(108, 99, 255, 0.15)', border: '1.5px solid rgba(108, 99, 255, 0.4)' }}>
          <Sparkles size={32} color="#6C63FF" />
        </div>
        <h1 className="text-3xl font-bold" style={{ color: '#E8E8F0' }}>MindShift</h1>
        <p className="text-sm mt-1.5" style={{ color: '#8B8BA7' }}>Focus made kind ✨</p>
      </motion.div>

      {/* Card */}
      <motion.div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#1A1D2E', border: '1px solid #2D3150' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {step === 'email' ? (
          <>
            <h2 className="text-lg font-semibold mb-1" style={{ color: '#E8E8F0' }}>
              Sign in with email
            </h2>
            <p className="text-sm mb-5" style={{ color: '#8B8BA7' }}>
              No password needed — we'll send you a magic link.
            </p>
            <div className="relative mb-4">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2" size={16} color="#8B8BA7" />
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendLink()}
                className="w-full pl-9 pr-4 h-12 rounded-xl text-sm outline-none focus:ring-2"
                style={{
                  background: '#252840',
                  color: '#E8E8F0',
                  border: '1px solid #2D3150',
                }}
                autoFocus
                autoComplete="email"
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleSendLink}
              loading={loading}
              disabled={!email.trim()}
            >
              Send magic link →
            </Button>
            <p className="text-center text-xs mt-4" style={{ color: '#8B8BA7' }}>
              No account yet? We'll create one automatically.
            </p>
          </>
        ) : (
          <motion.div
            className="flex flex-col items-center text-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-4xl">📬</div>
            <h2 className="text-lg font-semibold" style={{ color: '#E8E8F0' }}>Check your inbox</h2>
            <p className="text-sm" style={{ color: '#8B8BA7' }}>
              We sent a link to <strong style={{ color: '#E8E8F0' }}>{email}</strong>.
              <br />Tap it to sign in — no password needed.
            </p>
            <button
              className="text-xs mt-2 underline"
              style={{ color: '#6C63FF' }}
              onClick={() => setStep('email')}
            >
              Use a different email
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
