import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// Terms version — bump this string whenever material changes are made.
// Must match TERMS_VERSION in AuthScreen.tsx.
export const TERMS_VERSION = '2026-03'

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

export default function TermsPage() {
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
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Terms of Service</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-primary)' }}>Version {TERMS_VERSION} · Last updated: March 9, 2026</p>
        </div>
      </div>

      <div className="flex flex-col gap-7 max-w-2xl">

        {/* Intro */}
        <p className="text-sm leading-relaxed p-4 rounded-xl" style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-card)', border: '1px solid rgba(255,255,255,0.06)' }}>
          Please read these Terms carefully before using MindShift. By creating an account or
          using the service, you confirm that you have read, understood, and agree to be bound
          by these Terms and our{' '}
          <a href="/privacy" style={{ color: 'var(--color-primary)' }}>Privacy Policy</a>.
          If you do not agree, do not use MindShift.
        </p>

        <Section title="1. About MindShift">
          <p>
            MindShift is a productivity application designed to support individuals with ADHD and
            other neurodivergent profiles. It provides task management, focus sessions, AI-assisted
            task decomposition, and motivational tools.
          </p>
          <p>
            <strong style={{ color: 'var(--color-text-primary)' }}>MindShift is not a medical device</strong> and does
            not provide medical advice, diagnosis, or treatment of any kind. It is not a substitute
            for professional medical, psychological, or psychiatric care. Always consult a qualified
            healthcare professional regarding ADHD or other conditions.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least <strong style={{ color: 'var(--color-text-primary)' }}>16 years old</strong> to use
            MindShift. By creating an account, you represent that you meet this age requirement.
            If you are under 18, you represent that your parent or legal guardian has reviewed and
            agrees to these Terms on your behalf.
          </p>
          <p>
            MindShift is available only to individuals who can form legally binding contracts under
            applicable law. If you are using MindShift on behalf of an organisation, you represent
            that you are authorised to bind that organisation to these Terms.
          </p>
        </Section>

        <Section title="3. Your Account">
          <p>
            MindShift uses passwordless authentication (magic links sent to your email). You are
            responsible for keeping your email account secure and for all activity that occurs
            under your MindShift account.
          </p>
          <p>
            You agree to provide accurate and complete registration information and to update it
            promptly if it changes. You agree not to share your magic links with anyone. If you
            suspect unauthorised access to your account, contact us immediately at{' '}
            <a href="mailto:hello@mindshift.app" style={{ color: 'var(--color-primary)' }}>hello@mindshift.app</a>.
          </p>
          <p>
            We reserve the right to suspend or terminate accounts that violate these Terms,
            engage in fraudulent activity, or whose continued operation poses a risk to other users
            or our systems.
          </p>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree not to use MindShift to:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Generate, store, or transmit content that is harmful, illegal, abusive, harassing, or threatening</li>
            <li>Violate any applicable law or regulation</li>
            <li>Attempt to gain unauthorised access to any part of the service or its underlying infrastructure</li>
            <li>Reverse-engineer, decompile, or disassemble the application</li>
            <li>Scrape, index, or systematically extract data from the service</li>
            <li>Use automated bots or scripts to interact with the service</li>
            <li>Engage in any activity that disrupts or interferes with the service or its servers</li>
            <li>Misuse or abuse AI features, including attempting to extract training data or bypass content policies</li>
            <li>Impersonate any person or entity</li>
          </ul>
        </Section>

        <Section title="5. Subscriptions and Billing">
          <p>
            MindShift offers a free tier and a paid Pro subscription. Paid subscriptions are billed
            on a recurring monthly or annual basis, depending on the plan selected at checkout.
            All prices are displayed inclusive of any applicable taxes where required by law.
          </p>
          <p>
            Your subscription will automatically renew at the end of each billing period unless you
            cancel before the renewal date. You can cancel at any time through Settings → Subscription
            or by emailing{' '}
            <a href="mailto:billing@mindshift.app" style={{ color: 'var(--color-primary)' }}>billing@mindshift.app</a>.
            Cancellation takes effect at the end of the current billing period — you retain access
            until then.
          </p>
          <p>
            We reserve the right to change pricing with at least 30 days' advance notice sent to
            your registered email address. Continued use of the Pro subscription after a price change
            constitutes acceptance of the new price.
          </p>
        </Section>

        <Section title="6. Free Trial">
          <p>
            We may offer a free trial of the Pro subscription. At the end of the trial period, your
            subscription will not automatically convert to a paid plan — you must actively choose to
            subscribe. No credit card is required for the trial.
          </p>
          <p>
            We reserve the right to modify or discontinue the free trial offer at any time.
          </p>
        </Section>

        <Section title="7. Refund Policy">
          <p>
            If you are not satisfied with MindShift Pro, you may request a full refund within
            <strong style={{ color: 'var(--color-text-primary)' }}> 14 days</strong> of your initial payment by
            contacting{' '}
            <a href="mailto:billing@mindshift.app" style={{ color: 'var(--color-primary)' }}>billing@mindshift.app</a>.
            Refunds for subsequent billing periods are at our discretion and are not generally
            provided for partial months.
          </p>
          <p>
            If you are an EU/EEA consumer, you have a statutory right of withdrawal of 14 days
            from the date of purchase for digital services not yet accessed. By using AI features
            or any Pro feature during the trial, you acknowledge that the service has commenced
            and you may waive this right.
          </p>
        </Section>

        <Section title="8. AI Features">
          <p>
            MindShift uses AI models provided by third parties, including Anthropic (Claude) to
            power task decomposition, recovery messages, and weekly insights.
          </p>
          <p>
            <strong style={{ color: 'var(--color-text-primary)' }}>AI outputs are suggestions only.</strong> They may
            be inaccurate, incomplete, or not appropriate for your specific situation. Never rely on
            AI-generated content as a substitute for professional judgement. MindShift is not
            responsible for decisions made based on AI-generated suggestions.
          </p>
          <p>
            Your task titles and relevant context are sent to our backend and processed by Anthropic's
            API to generate responses. Please review{' '}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer"
               style={{ color: 'var(--color-primary)' }}>Anthropic's Privacy Policy</a>{' '}
            for information on how they handle data.
          </p>
        </Section>

        <Section title="9. Intellectual Property">
          <p>
            MindShift and its original content, features, and functionality are owned by the
            MindShift service operator and are protected by intellectual property laws.
            You may not copy, reproduce, distribute, or create derivative works from any part
            of MindShift without our prior written consent.
          </p>
          <p>
            You retain ownership of all content you create within MindShift (tasks, notes, etc.).
            By using the service, you grant us a limited, non-exclusive licence to process that
            content solely to provide and improve the service.
          </p>
        </Section>

        <Section title="10. Disclaimers">
          <p>
            MindShift is provided <strong style={{ color: 'var(--color-text-primary)' }}>"as is"</strong> and
            <strong style={{ color: 'var(--color-text-primary)' }}> "as available"</strong> without warranty of any
            kind, express or implied, including but not limited to warranties of merchantability,
            fitness for a particular purpose, or non-infringement.
          </p>
          <p>
            We do not warrant that the service will be uninterrupted, error-free, or free of viruses
            or other harmful components. We do not warrant that any defects will be corrected or that
            the service will meet your requirements.
          </p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, MindShift and its operators shall not
            be liable for any indirect, incidental, special, consequential, or punitive damages,
            including but not limited to loss of profits, data, goodwill, or other intangible losses,
            arising from your use of or inability to use the service.
          </p>
          <p>
            Our total liability to you for any claim arising out of or relating to these Terms or
            the service shall not exceed the greater of (a) the total amount you paid for the
            service in the 12 months preceding the claim, or (b) €50.
          </p>
          <p>
            Some jurisdictions do not allow the exclusion of implied warranties or limitation of
            liability for incidental or consequential damages, so some of the above limitations
            may not apply to you.
          </p>
        </Section>

        <Section title="12. Indemnification">
          <p>
            You agree to indemnify, defend, and hold harmless MindShift and its operators from
            any claim, liability, expense, or damage (including reasonable legal fees) arising from
            your violation of these Terms, your use of the service, or your violation of any rights
            of a third party.
          </p>
        </Section>

        <Section title="13. Governing Law and Dispute Resolution">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            jurisdiction in which the service operator is incorporated, without regard to its
            conflict of law provisions.
          </p>
          <p>
            We encourage you to contact us at{' '}
            <a href="mailto:hello@mindshift.app" style={{ color: 'var(--color-primary)' }}>hello@mindshift.app</a>{' '}
            to resolve any dispute informally before initiating formal proceedings.
          </p>
          <p>
            If you are an EU/EEA consumer, you may also use the European Commission's{' '}
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer"
               style={{ color: 'var(--color-primary)' }}>Online Dispute Resolution platform</a>.
          </p>
        </Section>

        <Section title="14. Termination">
          <p>
            You may stop using MindShift and delete your account at any time via Settings →
            Delete account.
          </p>
          <p>
            We may suspend or terminate your access immediately, without prior notice, if you breach
            these Terms or if we determine that continued access poses a risk to the service,
            other users, or third parties. Termination does not relieve you of any obligations
            incurred prior to termination.
          </p>
        </Section>

        <Section title="15. Changes to These Terms">
          <p>
            We may update these Terms from time to time. When we make material changes, we will
            notify you by email and update the version date at the top of this page.
          </p>
          <p>
            If you continue to use MindShift after the effective date of a revised Terms, you
            agree to be bound by the updated version. If you do not agree to the updated Terms,
            you must stop using the service and delete your account.
          </p>
        </Section>

        <Section title="16. Severability">
          <p>
            If any provision of these Terms is found to be invalid, illegal, or unenforceable,
            the remaining provisions will continue in full force and effect. The invalid provision
            will be replaced with a valid provision that most closely achieves the intent of the
            original.
          </p>
        </Section>

        <Section title="17. Contact">
          <p>
            For general questions:{' '}
            <a href="mailto:hello@mindshift.app" style={{ color: 'var(--color-primary)' }}>hello@mindshift.app</a>
          </p>
          <p>
            For privacy or data requests:{' '}
            <a href="mailto:privacy@mindshift.app" style={{ color: 'var(--color-primary)' }}>privacy@mindshift.app</a>
          </p>
          <p>
            For billing questions:{' '}
            <a href="mailto:billing@mindshift.app" style={{ color: 'var(--color-primary)' }}>billing@mindshift.app</a>
          </p>
        </Section>

      </div>
    </div>
  )
}
