import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { supabase } from '@/shared/lib/supabase'
import { toast } from 'sonner'

const AVATAR_EMOJIS = ['🌱', '🌿', '🍀', '🌸', '🌻', '🌳']

// ── Settings screen ───────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const navigate = useNavigate()
  const { email, cognitiveMode, appMode, avatarId, setAvatarId, setCognitiveMode, setAppMode, signOut } = useStore()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    signOut()
    navigate('/auth', { replace: true })
    toast.success('Signed out')
  }

  return (
    <div className="flex flex-col pb-28">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#E8E8F0' }}>
          Settings ⚙️
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8B8BA7' }}>{email}</p>
      </div>

      {/* Avatar */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#8B8BA7' }}>
          Avatar
        </p>
        <div className="flex gap-3 flex-wrap">
          {AVATAR_EMOJIS.map((emoji, i) => (
            <button
              key={i}
              onClick={() => setAvatarId(i + 1)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200"
              style={{
                background: avatarId === i + 1 ? 'rgba(108, 99, 255, 0.18)' : '#252840',
                border: `2px solid ${avatarId === i + 1 ? '#6C63FF' : 'transparent'}`,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </section>

      {/* App mode */}
      <section className="mx-5 p-4 rounded-2xl mb-4" style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#8B8BA7' }}>
          App Mode
        </p>
        <div className="flex flex-col gap-2">
          {([
            { mode: 'minimal', label: '🎯 Minimal — one task at a time' },
            { mode: 'habit',   label: '🌱 Habit — daily routine builder' },
            { mode: 'system',  label: '🗂️ System — full visibility' },
          ] as const).map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setAppMode(mode)}
              className="text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
              style={{
                background: appMode === mode ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
                border: `1.5px solid ${appMode === mode ? '#6C63FF' : '#2D3150'}`,
                color: appMode === mode ? '#E8E8F0' : '#8B8BA7',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Cognitive mode */}
      <section className="mx-5 p-4 rounded-2xl mb-6" style={{ background: '#1A1D2E', border: '1.5px solid #2D3150' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#8B8BA7' }}>
          Focus Style
        </p>
        <div className="flex gap-2">
          {([
            { mode: 'focused',  label: '🎯 One at a time' },
            { mode: 'overview', label: '🗺️ See everything' },
          ] as const).map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setCognitiveMode(mode)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: cognitiveMode === mode ? 'rgba(108, 99, 255, 0.18)' : '#252840',
                border: `1.5px solid ${cognitiveMode === mode ? '#6C63FF' : '#2D3150'}`,
                color: cognitiveMode === mode ? '#6C63FF' : '#8B8BA7',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Sign out */}
      <div className="px-5">
        <button
          onClick={() => void handleSignOut()}
          className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all duration-200"
          style={{ background: '#1A1D2E', border: '1.5px solid #2D3150', color: '#FF6B6B' }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
