// src/app/(public)/legal/terms/page.tsx
import Link from 'next/link'

export default function TermsPage() {
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
        <h1 className="text-2xl font-medium text-gray-900 mb-2">Terms of use</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: April 2026</p>

        <div className="prose prose-sm prose-gray max-w-none space-y-6 text-gray-700 text-sm leading-relaxed">
          <p>Welcome to TrailBlaze CRM, a product of TrailBlaze Africa Ltd ("Company," "we," "us," or "our"). By accessing or using our platform at app.trailblazecrm.com (the "Service"), you agree to be bound by these Terms of Use. If you do not agree, do not use the Service.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">1. Acceptance of terms</h2>
          <p>By creating an account, accessing, or using TrailBlaze CRM, you confirm that you are at least 18 years old and have the legal authority to enter into these terms on behalf of yourself or the organization you represent. Your continued use of the Service constitutes acceptance of any updates to these terms.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">2. Description of service</h2>
          <p>TrailBlaze CRM is a cloud-based account management platform that provides customer relationship management tools, including account health scoring, pipeline management, WhatsApp integration, AI-powered automation, and playbook workflows. The Service is provided on a subscription basis with various plan tiers.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">3. Accounts and registration</h2>
          <p>You must provide accurate, complete, and current information when creating an account. You are responsible for maintaining the security of your account credentials and for all activity under your account. You must notify us immediately of any unauthorized access. We reserve the right to suspend or terminate accounts that violate these terms.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">4. Your data</h2>
          <p>You retain full ownership of all data you input into TrailBlaze CRM, including accounts, contacts, interactions, health scores, and any other content ("Your Data"). We do not claim ownership of Your Data. You grant us a limited license to process, store, and display Your Data solely for the purpose of providing and improving the Service. You can export Your Data at any time in CSV or JSON format. Upon account deletion, Your Data will be permanently removed within 30 days.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">5. Acceptable use</h2>
          <p>You agree not to: use the Service for any unlawful purpose or in violation of Nigerian or international laws; transmit malware, spam, or malicious content; attempt to access other users' data or accounts; reverse-engineer, decompile, or disassemble any part of the Service; use the Service to store or transmit material that infringes intellectual property rights; misrepresent your identity or affiliation; use automated tools to scrape or extract data from the Service beyond authorized API access; or resell or sublicense access to the Service without our written consent.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">6. Payment and billing</h2>
          <p>Paid plans are billed monthly or annually as selected. Prices are denominated in Nigerian Naira (NGN). All fees are non-refundable except as required by law. We may change pricing with 30 days' written notice. If payment fails, your account may be downgraded to the Starter plan until payment is resolved. There are no automatic annual renewals without your explicit consent — we will never lock you into a contract you did not agree to.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">7. WhatsApp integration</h2>
          <p>The WhatsApp integration feature uses Meta's WhatsApp Cloud API. By using this feature, you agree to comply with Meta's Business Messaging Policy and WhatsApp Business Terms of Service. You are solely responsible for the content of messages sent through the platform and for obtaining any necessary consent from recipients. We are not responsible for delivery failures, policy violations, or account restrictions imposed by Meta.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">8. AI features</h2>
          <p>AI-powered features (risk detection, message drafting, next-best-action suggestions) are provided for informational and productivity purposes. AI-generated content should be reviewed by a human before being sent to clients. We do not guarantee the accuracy of AI outputs. You are responsible for the final content of any communication sent from your account.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">9. Service availability</h2>
          <p>We strive for 99.9% uptime but do not guarantee uninterrupted access. Scheduled maintenance will be communicated in advance. We are not liable for downtime caused by factors beyond our control, including internet service providers, hosting infrastructure, or force majeure events.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">10. Intellectual property</h2>
          <p>The Service, including its design, code, KEEP Framework, playbook content, and branding, is owned by TrailBlaze Africa Ltd and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written consent. The KEEP Framework is proprietary methodology of TrailBlaze Africa.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">11. Limitation of liability</h2>
          <p>To the maximum extent permitted by law, TrailBlaze Africa Ltd shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of the Service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">12. Termination</h2>
          <p>You may terminate your account at any time through the Settings page. We may suspend or terminate accounts that violate these terms with reasonable notice. Upon termination, you will retain access to export Your Data for 30 days. After 30 days, all data will be permanently deleted.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">13. Governing law</h2>
          <p>These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved through arbitration in Lagos, Nigeria, in accordance with the Arbitration and Mediation Act 2023.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">14. Changes to terms</h2>
          <p>We may update these terms from time to time. Material changes will be communicated via email or in-app notification at least 30 days before taking effect. Continued use after the effective date constitutes acceptance.</p>

          <h2 className="text-base font-medium text-gray-900 mt-8">15. Contact</h2>
          <p>For questions about these terms, contact us at <a href="mailto:legal@trailblazeafrica.com" className="text-purple-700 hover:underline">legal@trailblazeafrica.com</a> or write to: TrailBlaze Africa Ltd, Lagos, Nigeria.</p>
        </div>
      </article>
    </div>
  )
}
