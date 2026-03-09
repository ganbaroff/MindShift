import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold" style={{ color: '#E8E8F0' }}>{title}</h2>
      <div className="text-sm leading-relaxed flex flex-col gap-2" style={{ color: '#8B8BA7' }}>
        {children}
      </div>
    </section>
  )
}

function StorageRow({ name, purpose, duration, type }: {
  name: string; purpose: string; duration: string; type: string
}) {
  return (
    <div className="p-3 rounded-lg flex flex-col gap-1" style={{ background: '#252840' }}>
      <div className="flex items-center justify-between">
        <code className="text-xs px-2 py-0.5 rounded" style={{ background: '#1E2136', color: '#7B72FF' }}>{name}</code>
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1E2136', color: '#4ECDC4' }}>{type}</span>
      </div>
      <p className="text-xs" style={{ color: '#8B8BA7' }}>{purpose}</p>
      <p className="text-xs" style={{ color: '#6B6B8A' }}>Expires: {duration}</p>
    </div>
  )
}

export default function CookiePolicyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen px-5 pb-20" style={{ background: '#0F1117' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pt-10 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl"
          style={{ background: '#1E2136', color: '#8B8BA7' }}
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#E8E8F0' }}>Cookie Policy</h1>
          <p className="text-xs mt-0.5" style={{ color: '#7B72FF' }}>Last updated: March 9, 2026</p>
        </div>
      </div>

      <div className="flex flex-col gap-7 max-w-2xl">

        {/* Quick summary */}
        <div className="p-4 rounded-xl" style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: '#E8E8F0' }}>The short version</p>
          <p className="text-sm" style={{ color: '#8B8BA7' }}>
            MindShift does <strong style={{ color: '#4ECDC4' }}>not use tracking cookies</strong>.
            We use your browser's localStorage to make the app work offline and remember your
            preferences. We use cookieless analytics that never identify you personally.
          </p>
        </div>

        <Section title="1. What Are Cookies?">
          <p>
            Cookies are small text files placed on your device by websites you visit. They are
            widely used to make websites work, remember your preferences, and provide analytics.
          </p>
          <p>
            MindShift is a Progressive Web App (PWA). We use <strong style={{ color: '#E8E8F0' }}>localStorage</strong>{' '}
            and <strong style={{ color: '#E8E8F0' }}>sessionStorage</strong> (browser APIs, similar
            to cookies but not transmitted to servers with every request) rather than traditional
            HTTP cookies for most functionality.
          </p>
        </Section>

        <Section title="2. HTTP Cookies We Set">
          <p>
            MindShift sets <strong style={{ color: '#E8E8F0' }}>no third-party tracking cookies</strong>{' '}
            of any kind. The only HTTP cookies that may be set are:
          </p>
          <div className="flex flex-col gap-2">
            <StorageRow
              name="sb-*"
              purpose="Supabase authentication session. Required for you to stay signed in."
              duration="7 days (rolling)"
              type="Essential"
            />
          </div>
          <p>
            This cookie is <strong style={{ color: '#E8E8F0' }}>essential</strong> — without it,
            you cannot use MindShift. It cannot be disabled while using the app.
          </p>
        </Section>

        <Section title="3. localStorage We Use">
          <p>
            The following items are stored in your browser's localStorage. This data stays on
            your device and is not transmitted to our servers except where explicitly noted.
          </p>
          <div className="flex flex-col gap-2">
            <StorageRow
              name="ms_offline_queue"
              purpose="Stores tasks created while you were offline, ready to sync when you reconnect."
              duration="Until synced or cleared"
              type="Functional"
            />
            <StorageRow
              name="ms_cookie_consent"
              purpose="Remembers that you acknowledged this cookie notice."
              duration="1 year"
              type="Functional"
            />
            <StorageRow
              name="ms_recovery_shown"
              purpose="Remembers whether the guilt-free recovery screen was shown on this device."
              duration="Session"
              type="Functional"
            />
            <StorageRow
              name="ms_last_session"
              purpose="Stores the timestamp of your last session for recovery protocol detection."
              duration="Until updated"
              type="Functional"
            />
          </div>
        </Section>

        <Section title="4. Analytics">
          <p>
            We use cookieless, privacy-first analytics to understand how MindShift is used
            in aggregate. Our analytics:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Do <strong style={{ color: '#E8E8F0' }}>not</strong> set any cookies</li>
            <li>Do <strong style={{ color: '#E8E8F0' }}>not</strong> track you across websites</li>
            <li>Do <strong style={{ color: '#E8E8F0' }}>not</strong> fingerprint your device</li>
            <li>Do <strong style={{ color: '#E8E8F0' }}>not</strong> collect your IP address</li>
            <li>Collect only aggregate counts (page views, feature usage)</li>
            <li>Are fully blockable with any content blocker (uBlock Origin, AdGuard, etc.)</li>
          </ul>
          <p>
            Because our analytics do not use cookies or personal data, they do not require
            consent under GDPR or ePrivacy Directive.
          </p>
        </Section>

        <Section title="5. Third-Party Services">
          <p>
            We use a limited number of third-party services that may set their own storage.
            We have selected providers committed to privacy:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>
              <strong style={{ color: '#E8E8F0' }}>Supabase</strong> — authentication session cookies
              (essential, as described above)
            </li>
            <li>
              <strong style={{ color: '#E8E8F0' }}>Vercel</strong> — may set minimal performance
              cookies for CDN routing. These are technical/essential cookies with no tracking purpose.
            </li>
          </ul>
          <p>
            We do not integrate any advertising networks, social media trackers, or third-party
            analytics that use cookies.
          </p>
        </Section>

        <Section title="6. How to Manage Cookies and localStorage">
          <p>
            You can control cookies and localStorage in your browser settings:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li><strong style={{ color: '#E8E8F0' }}>Chrome:</strong> Settings → Privacy and security → Cookies</li>
            <li><strong style={{ color: '#E8E8F0' }}>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
            <li><strong style={{ color: '#E8E8F0' }}>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
            <li><strong style={{ color: '#E8E8F0' }}>Edge:</strong> Settings → Cookies and site permissions</li>
          </ul>
          <p>
            You can also clear MindShift's localStorage from within the app: Settings → Clear local data.
          </p>
          <p>
            Note: disabling the Supabase authentication cookie will sign you out of MindShift.
          </p>
        </Section>

        <Section title="7. Contact">
          <p>
            Questions about cookies or data storage?{' '}
            <a href="mailto:privacy@mindshift.app" style={{ color: '#7B72FF' }}>
              privacy@mindshift.app
            </a>
          </p>
        </Section>

      </div>
    </div>
  )
}
