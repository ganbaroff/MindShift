import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
      <div className="text-sm leading-relaxed flex flex-col gap-2" style={{ color: 'var(--color-text-muted)' }}>
        {children}
      </div>
    </section>
  )
}

function StorageRow({ name, purpose, duration, type }: {
  name: string; purpose: string; duration: string; type: string
}) {
  return (
    <div className="p-3 rounded-lg flex flex-col gap-1" style={{ background: 'var(--color-surface-raised)' }}>
      <div className="flex items-center justify-between">
        <code className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-surface-card)', color: 'var(--color-primary)' }}>{name}</code>
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-surface-card)', color: 'var(--color-teal)' }}>{type}</span>
      </div>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{purpose}</p>
      <p className="text-xs" style={{ color: '#6B6B8A' }}>Expires: {duration}</p>
    </div>
  )
}

export default function CookiePolicyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen px-5 pb-20" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pt-10 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl"
          style={{ background: 'var(--color-surface-card)', color: 'var(--color-text-muted)' }}
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Cookie Policy</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-primary)' }}>Last updated: March 9, 2026</p>
        </div>
      </div>

      <div className="flex flex-col gap-7 max-w-2xl">

        {/* Quick summary */}
        <div className="p-4 rounded-xl" style={{ background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>The short version</p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            MindShift does <strong style={{ color: 'var(--color-teal)' }}>not use tracking cookies</strong>.
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
            MindShift is a Progressive Web App (PWA). We use <strong style={{ color: 'var(--color-text-primary)' }}>localStorage</strong>{' '}
            and <strong style={{ color: 'var(--color-text-primary)' }}>sessionStorage</strong> (browser APIs, similar
            to cookies but not transmitted to servers with every request) rather than traditional
            HTTP cookies for most functionality.
          </p>
        </Section>

        <Section title="2. HTTP Cookies We Set">
          <p>
            MindShift sets <strong style={{ color: 'var(--color-text-primary)' }}>no third-party tracking cookies</strong>{' '}
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
            This cookie is <strong style={{ color: 'var(--color-text-primary)' }}>essential</strong> — without it,
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
            <li>Do <strong style={{ color: 'var(--color-text-primary)' }}>not</strong> set any cookies</li>
            <li>Do <strong style={{ color: 'var(--color-text-primary)' }}>not</strong> track you across websites</li>
            <li>Do <strong style={{ color: 'var(--color-text-primary)' }}>not</strong> fingerprint your device</li>
            <li>Do <strong style={{ color: 'var(--color-text-primary)' }}>not</strong> collect your IP address</li>
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
              <strong style={{ color: 'var(--color-text-primary)' }}>Supabase</strong> — authentication session cookies
              (essential, as described above)
            </li>
            <li>
              <strong style={{ color: 'var(--color-text-primary)' }}>Vercel</strong> — may set minimal performance
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
            <li><strong style={{ color: 'var(--color-text-primary)' }}>Chrome:</strong> Settings → Privacy and security → Cookies</li>
            <li><strong style={{ color: 'var(--color-text-primary)' }}>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
            <li><strong style={{ color: 'var(--color-text-primary)' }}>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
            <li><strong style={{ color: 'var(--color-text-primary)' }}>Edge:</strong> Settings → Cookies and site permissions</li>
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
            <a href="mailto:privacy@mindshift.app" style={{ color: 'var(--color-primary)' }}>
              privacy@mindshift.app
            </a>
          </p>
        </Section>

      </div>
    </div>
  )
}
