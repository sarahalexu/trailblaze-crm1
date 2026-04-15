// src/app/(public)/legal/privacy/page.tsx
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>TB</div>
            <span className="text-sm font-medium text-gray-900">TrailBlaze CRM</span>
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-medium text-gray-900 mb-2">Privacy policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: April 2026</p>

        <div className="prose prose-sm prose-gray max-w-none space-y-6 text-gray-700 text-sm leading-relaxed">
          <p>TrailBlaze Africa Ltd ("Company," "we," "us") operates TrailBlaze CRM. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our Service.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">1. Information we collect</h2>
          <p><strong>Account information:</strong> When you sign up, we collect your name, email address, phone number, organization name, and industry. This information is necessary to create and manage your account.</p>
          <p><strong>Business data you provide:</strong> This includes accounts, contacts, interactions, health scores, deals, playbook data, and any other content you input into the CRM. This is Your Data and you retain full ownership of it.</p>
          <p><strong>Usage data:</strong> We automatically collect data about how you use the Service, including pages visited, features used, session duration, device type, browser, IP address, and interaction patterns. This helps us improve the Service.</p>
          <p><strong>WhatsApp data:</strong> If you enable WhatsApp integration, we process WhatsApp messages sent and received through our platform. We store message content, delivery status, and timestamps to provide the Service. We do not access your personal WhatsApp account — only messages sent through the TrailBlaze CRM WhatsApp Business integration.</p>
          <p><strong>Payment information:</strong> Payment processing is handled by third-party payment providers (such as Paystack). We do not store credit card numbers or bank account details on our servers.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">2. How we use your information</h2>
          <p>We use your information to: provide, maintain, and improve the Service; process transactions and send billing notifications; send service-related communications (account updates, security alerts, feature announcements); provide AI-powered features (risk detection, message suggestions) by processing your account and interaction data; provide customer support; monitor and analyse usage patterns to improve the Service; comply with legal obligations; and protect against fraud and unauthorized access.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">3. AI data processing</h2>
          <p>Our AI features process your account data, interaction history, and health scores to generate risk alerts, message drafts, and recommendations. This processing occurs on secure servers. We do not use Your Data to train AI models for other customers or for any purpose other than providing the Service to you. AI-generated suggestions are never sent to your clients automatically — they always require your review and approval.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">4. Data sharing</h2>
          <p>We do not sell, rent, or trade your personal information. We share data only in these limited circumstances: with service providers who help us operate the Service (hosting, email delivery, analytics), under contractual obligations to protect your data; with payment processors to handle billing; when required by law, regulation, or legal process; to protect the rights, safety, or property of TrailBlaze Africa, our users, or the public; and with your explicit consent.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">5. Data storage and security</h2>
          <p>Your data is stored on Supabase infrastructure with servers in secure data centres. We implement the following security measures: encryption in transit using TLS/SSL; encryption at rest using AES-256; Row Level Security ensuring complete data isolation between organizations; encrypted storage of sensitive credentials (API keys, tokens); rate limiting on all API endpoints; full audit trail of all data access and modifications; regular security reviews and updates; and access controls with role-based permissions.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">6. Data retention</h2>
          <p>We retain your data for as long as your account is active. When you delete your account, we permanently delete all Your Data within 30 days. Some data may be retained in encrypted backups for up to 90 days, after which it is permanently destroyed. Audit logs are retained for 12 months for security purposes. Anonymized, aggregated usage statistics that cannot identify you may be retained indefinitely.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">7. Your rights</h2>
          <p>You have the right to: access all personal data we hold about you; correct inaccurate personal data; export Your Data at any time in CSV or JSON format; delete your account and all associated data; restrict processing of your data in certain circumstances; object to processing of your data for specific purposes; and withdraw consent at any time where processing is based on consent. To exercise these rights, use the Settings page in your account or contact us at privacy@trailblazeafrica.com.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">8. Cookies</h2>
          <p>We use essential cookies to maintain your login session and remember your preferences. We use analytics cookies (Google Analytics) to understand how the Service is used. We do not use advertising cookies or tracking cookies from third-party advertisers. You can disable non-essential cookies in your browser settings.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">9. Children's privacy</h2>
          <p>The Service is not intended for anyone under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will delete it promptly.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">10. International data transfers</h2>
          <p>Your data may be processed in countries outside Nigeria where our service providers operate. When this occurs, we ensure appropriate safeguards are in place to protect your data in accordance with this policy and applicable data protection laws, including the Nigeria Data Protection Act 2023 (NDPA).</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">11. Changes to this policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-app notification at least 14 days before the changes take effect.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">12. Contact us</h2>
          <p>For questions about this Privacy Policy or to exercise your data rights, contact our Data Protection Officer at <a href="mailto:privacy@trailblazeafrica.com" className="text-purple-700 hover:underline">privacy@trailblazeafrica.com</a> or write to: TrailBlaze Africa Ltd, Lagos, Nigeria.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">13. Regulatory compliance</h2>
          <p>This policy is designed to comply with the Nigeria Data Protection Act 2023 (NDPA), the Nigeria Data Protection Regulation (NDPR), and applicable provisions of the General Data Protection Regulation (GDPR) where relevant to our users. We are committed to transparent and lawful data processing.</p>
        </div>
      </article>
    </div>
  )
}
