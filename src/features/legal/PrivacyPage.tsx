import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen px-5 pb-16" style={{ background: '#0F1117' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pt-10 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl"
          style={{ background: '#1A1D2E', color: '#8B8BA7' }}
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#E8E8F0' }}>Privacy Policy</h1>
      </div>

      <div className="flex flex-col gap-6 max-w-2xl" style={{ color: '#8B8BA7' }}>
        <p className="text-xs" style={{ color: '#6C63FF' }}>Last updated: March 2025</p>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold" style={{ color: '#E8E8F0' }}>What we collect</h2>
          <p className="text-sm leading-relaxed">
            MindShift collects only what's necessary to provide the service: your email address
            (for sign-in), task titles and focus session data you create, and energy check-in
            values (1–5 scale). We do not sell your data. We do not share it with third parties
            except as required by law.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold" style={{ color: '#E8E8F0' }}>AI processing</h2>
          <p className="text-sm leading-relaxed">
            When you use AI task decomposition or recovery features, your task titles are sent to
            our backend (Supabase Edge Functions) and processed by Claude (Anthropic). We do not
            store your task content with Anthropic. Edge Function responses are ephemeral.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold" style={{ color: '#E8E8F0' }}>Analytics</h2>
          <p className="text-sm leading-relaxed">
            We use privacy-respecting analytics that do not use cookies, do not track you across
            sites, and do not identify you personally. Aggregate page-view counts help us understand
            which features are used. You can block this using any standard content blocker.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold" style={{ color: '#E8E8F0' }}>Data storage</h2>
          <p className="text-sm leading-relaxed">
            Your data is stored in Supabase (US region) with row-level security — meaning only you
            can read or write your own records. Local device storage (localStorage) is used for
            offline queuing and app preferences. You can clear this at any time from Settings.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold" style={{ color: '#E8E8F0' }}>Your rights</h2>
          <p className="text-sm leading-relaxed">
            You can request deletion of all your data at any time by emailing us or using the
            "Delete account" option in Settings. We will process your request within 30 days.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold" style={{ color: '#E8E8F0' }}>Contact</h2>
          <p className="text-sm leading-relaxed">
            Questions? Email us at{' '}
            <a
              href="mailto:privacy@mindshift.app"
              style={{ color: '#6C63FF' }}
            >
              privacy@mindshift.app
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
