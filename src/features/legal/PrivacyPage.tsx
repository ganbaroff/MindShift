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

export default function PrivacyPage() {
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
          <h1 className="text-xl font-bold" style={{ color: '#E8E8F0' }}>Privacy Policy</h1>
          <p className="text-xs mt-0.5" style={{ color: '#7B72FF' }}>Last updated: March 9, 2026</p>
        </div>
      </div>

      <div className="flex flex-col gap-7 max-w-2xl">

        {/* Summary box */}
        <div className="p-4 rounded-xl flex flex-col gap-2" style={{ background: '#1E2136', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-semibold" style={{ color: '#E8E8F0' }}>The short version</p>
          <ul className="text-sm flex flex-col gap-1" style={{ color: '#8B8BA7' }}>
            <li>✅ We collect only what's needed to run the app</li>
            <li>✅ We never sell your data</li>
            <li>✅ AI features send only task titles to Anthropic — nothing personal</li>
            <li>✅ You can delete all your data anytime</li>
            <li>✅ No tracking cookies — we use cookieless analytics</li>
          </ul>
        </div>

        <Section title="1. Who We Are">
          <p>
            MindShift is operated by its founding team. For privacy matters, contact us at{' '}
            <a href="mailto:privacy@mindshift.app" style={{ color: '#7B72FF' }}>privacy@mindshift.app</a>.
            We act as the <strong style={{ color: '#E8E8F0' }}>data controller</strong> for personal
            data processed in connection with your use of MindShift.
          </p>
        </Section>

        <Section title="2. What Data We Collect">
          <p>
            We collect the following categories of data:
          </p>
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-lg" style={{ background: '#252840' }}>
              <p className="font-medium mb-1" style={{ color: '#E8E8F0' }}>Account data</p>
              <p>Email address — used for authentication via magic link. We store no passwords.</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: '#252840' }}>
              <p className="font-medium mb-1" style={{ color: '#E8E8F0' }}>App content</p>
              <p>Task titles, focus session durations, energy check-in values (1–5 scale), and
                 onboarding preferences (app mode, cognitive style). This is the core data the
                 app needs to function.</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: '#252840' }}>
              <p className="font-medium mb-1" style={{ color: '#E8E8F0' }}>Usage data</p>
              <p>Session timestamps, feature interactions, XP earned — used to power progress
                 tracking and weekly insights. This data is always associated with your account,
                 never anonymous.</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: '#252840' }}>
              <p className="font-medium mb-1" style={{ color: '#E8E8F0' }}>Consent records</p>
              <p>Timestamp and version of the Terms you accepted, and your age confirmation — stored
                 for legal compliance.</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: '#252840' }}>
              <p className="font-medium mb-1" style={{ color: '#E8E8F0' }}>Device / local storage</p>
              <p>App preferences and an offline task queue stored in your browser's localStorage.
                 This data never leaves your device unless you're online and the sync queue flushes.
                 You can clear it at any time from Settings.</p>
            </div>
          </div>
          <p>
            We do <strong style={{ color: '#E8E8F0' }}>not</strong> collect: location data,
            device identifiers, contacts, payment card details (processed directly by our
            payment provider), or any special category data (health, biometric, etc.).
          </p>
        </Section>

        <Section title="3. How We Use Your Data">
          <p>We process your data for the following purposes:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li><strong style={{ color: '#E8E8F0' }}>Providing the service</strong> — displaying your tasks, running focus sessions, generating AI insights</li>
            <li><strong style={{ color: '#E8E8F0' }}>Account management</strong> — authentication, session management, account deletion</li>
            <li><strong style={{ color: '#E8E8F0' }}>Product improvement</strong> — aggregate analytics to understand which features are used</li>
            <li><strong style={{ color: '#E8E8F0' }}>Legal compliance</strong> — storing consent records, responding to lawful data requests</li>
            <li><strong style={{ color: '#E8E8F0' }}>Communication</strong> — sending magic links, transactional emails (billing receipts, Terms updates). We do not send marketing emails without your explicit opt-in.</li>
          </ul>
          <p>
            The legal basis for processing under GDPR is: <strong style={{ color: '#E8E8F0' }}>contract performance</strong> (operating the service you signed up for), <strong style={{ color: '#E8E8F0' }}>legitimate interests</strong> (product improvement, fraud prevention), and <strong style={{ color: '#E8E8F0' }}>legal obligation</strong> (compliance, consent records).
          </p>
        </Section>

        <Section title="4. AI Processing (Anthropic Claude)">
          <p>
            When you use AI features (task decomposition, recovery messages, weekly insights),
            your <strong style={{ color: '#E8E8F0' }}>task titles and minimal context</strong> are
            sent via our secure backend (Supabase Edge Functions) to Anthropic's API.
          </p>
          <p>
            We do <strong style={{ color: '#E8E8F0' }}>not</strong> send your email address, energy
            levels, or any other personal identifiers to Anthropic. The data sent is limited to
            what is strictly necessary to generate the AI response.
          </p>
          <p>
            Anthropic processes this data subject to their{' '}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer"
               style={{ color: '#7B72FF' }}>Privacy Policy</a>.
            API responses are ephemeral — we do not store the raw AI outputs long-term.
          </p>
        </Section>

        <Section title="5. Data Sharing">
          <p>
            We share personal data only with the following sub-processors, and only to the extent
            necessary to provide the service:
          </p>
          <div className="flex flex-col gap-2">
            <div className="p-3 rounded-lg" style={{ background: '#252840' }}>
              <p className="font-medium" style={{ color: '#E8E8F0' }}>Supabase Inc.</p>
              <p>Database, authentication, and backend infrastructure. Data stored in US (East) region.
                 Supabase is SOC 2 Type II compliant. We have a Data Processing Agreement with Supabase.</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: '#252840' }}>
              <p className="font-medium" style={{ color: '#E8E8F0' }}>Anthropic PBC</p>
              <p>AI inference for task decomposition and insights. Task titles only; no personal identifiers.
                 Anthropic does not use API data to train models (see their API usage policy).</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: '#252840' }}>
              <p className="font-medium" style={{ color: '#E8E8F0' }}>Vercel Inc.</p>
              <p>Hosting and content delivery of the web application. Vercel serves static assets only
                 and does not process your personal data beyond standard web server logs.</p>
            </div>
          </div>
          <p>
            We <strong style={{ color: '#E8E8F0' }}>do not sell</strong> your data.
            We <strong style={{ color: '#E8E8F0' }}>do not share</strong> your data with
            advertisers, data brokers, or any parties not listed above.
          </p>
        </Section>

        <Section title="6. Analytics">
          <p>
            We use <strong style={{ color: '#E8E8F0' }}>cookieless, privacy-respecting analytics</strong>{' '}
            that do not track you across sites, do not use device fingerprinting, and do not store
            any personally identifiable information. We collect only aggregate counts such as
            page views and feature usage.
          </p>
          <p>
            You can block analytics entirely using any standard content blocker (uBlock Origin, etc.)
            without affecting MindShift's functionality.
          </p>
        </Section>

        <Section title="7. Data Retention">
          <p>
            We retain your personal data for as long as your account is active. If you delete
            your account, we delete or anonymise all your personal data within{' '}
            <strong style={{ color: '#E8E8F0' }}>30 days</strong>, except where we are required
            to retain it for longer by applicable law (e.g. billing records for 7 years in some
            jurisdictions).
          </p>
          <p>
            Consent records (terms_accepted_at, terms_version) are retained for the duration
            required by applicable law, even after account deletion.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We implement industry-standard security measures including:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Row-Level Security (RLS) on all database tables — you can only access your own data</li>
            <li>TLS encryption in transit for all data transfers</li>
            <li>Passwordless authentication — no password database to breach</li>
            <li>API keys stored in server-side environment variables, never exposed to the browser</li>
            <li>Rate limiting on all AI-powered endpoints</li>
          </ul>
          <p>
            No security system is perfect. If you discover a security vulnerability, please
            disclose it responsibly to{' '}
            <a href="mailto:security@mindshift.app" style={{ color: '#7B72FF' }}>security@mindshift.app</a>.
          </p>
        </Section>

        <Section title="9. Your Rights">
          <p>
            Depending on your location, you may have the following rights regarding your personal data:
          </p>
          <div className="flex flex-col gap-2">
            <div className="p-3 rounded-lg" style={{ background: '#252840' }}>
              <p className="font-medium" style={{ color: '#E8E8F0' }}>EU/EEA users — GDPR rights</p>
              <ul className="list-disc pl-5 flex flex-col gap-1 mt-1">
                <li><strong style={{ color: '#E8E8F0' }}>Access</strong> — request a copy of your personal data</li>
                <li><strong style={{ color: '#E8E8F0' }}>Rectification</strong> — correct inaccurate data</li>
                <li><strong style={{ color: '#E8E8F0' }}>Erasure</strong> ("right to be forgotten") — request deletion of your data</li>
                <li><strong style={{ color: '#E8E8F0' }}>Portability</strong> — receive your data in a machine-readable format</li>
                <li><strong style={{ color: '#E8E8F0' }}>Restriction</strong> — limit how we process your data</li>
                <li><strong style={{ color: '#E8E8F0' }}>Objection</strong> — object to processing based on legitimate interests</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg" style={{ background: '#252840' }}>
              <p className="font-medium" style={{ color: '#E8E8F0' }}>California users — CCPA rights</p>
              <ul className="list-disc pl-5 flex flex-col gap-1 mt-1">
                <li>Right to <strong style={{ color: '#E8E8F0' }}>know</strong> what personal information we collect and how we use it</li>
                <li>Right to <strong style={{ color: '#E8E8F0' }}>delete</strong> your personal information</li>
                <li>Right to <strong style={{ color: '#E8E8F0' }}>opt out</strong> of sale (we do not sell data)</li>
                <li>Right to <strong style={{ color: '#E8E8F0' }}>non-discrimination</strong> for exercising your rights</li>
              </ul>
            </div>
          </div>
          <p>
            To exercise any of these rights, email{' '}
            <a href="mailto:privacy@mindshift.app" style={{ color: '#7B72FF' }}>privacy@mindshift.app</a>.
            We will respond within 30 days. You may also delete your account directly from
            Settings → Delete account, which triggers immediate data deletion.
          </p>
        </Section>

        <Section title="10. Cookies and Local Storage">
          <p>
            MindShift does <strong style={{ color: '#E8E8F0' }}>not use tracking cookies</strong>.
            We use browser <strong style={{ color: '#E8E8F0' }}>localStorage</strong> for:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>App preferences (theme, audio settings)</li>
            <li>Offline task queue (synced to the server when you reconnect)</li>
            <li>Your consent acknowledgement</li>
            <li>Supabase authentication session token</li>
          </ul>
          <p>
            You can clear all localStorage data at any time via Settings → Clear local data,
            or through your browser's developer tools. See our{' '}
            <a href="/cookie-policy" style={{ color: '#7B72FF' }}>Cookie Policy</a> for details.
          </p>
        </Section>

        <Section title="11. Children's Privacy">
          <p>
            MindShift is not directed at children under the age of 16. We do not knowingly
            collect personal data from anyone under 16. If we become aware that we have collected
            data from someone under 16 without verifiable parental consent, we will delete that
            data promptly.
          </p>
          <p>
            If you believe a minor under 16 has provided us with personal data, please contact
            us at{' '}
            <a href="mailto:privacy@mindshift.app" style={{ color: '#7B72FF' }}>privacy@mindshift.app</a>.
          </p>
        </Section>

        <Section title="12. International Data Transfers">
          <p>
            MindShift stores data in Supabase's US East region. If you are located in the
            EU/EEA, your data is transferred to the United States. Supabase participates in
            the EU-US Data Privacy Framework, providing an adequate level of data protection.
          </p>
          <p>
            Where transfers occur outside of an adequacy decision, we rely on Standard Contractual
            Clauses (SCCs) as the transfer mechanism.
          </p>
        </Section>

        <Section title="13. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we make material changes,
            we will notify you by email and update the date at the top of this page. We will also
            ask for your renewed consent where required by law.
          </p>
        </Section>

        <Section title="14. Contact and Complaints">
          <p>
            For privacy questions or to exercise your rights:{' '}
            <a href="mailto:privacy@mindshift.app" style={{ color: '#7B72FF' }}>privacy@mindshift.app</a>
          </p>
          <p>
            If you are an EU/EEA resident and are not satisfied with our response, you have
            the right to lodge a complaint with your local data protection supervisory authority.
            A list of EU data protection authorities is available at{' '}
            <a href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
               target="_blank" rel="noopener noreferrer" style={{ color: '#7B72FF' }}>
              edpb.europa.eu
            </a>.
          </p>
        </Section>

      </div>
    </div>
  )
}
