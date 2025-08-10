import { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Privacy Policy',
  description: 'Privacy policy for Deriv Bot Store services, including custom bot development.',
  noIndex: true
});

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="glass-card rounded-3xl p-8 lg:p-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-secondary-800 dark:text-secondary-200 mb-8 text-center">
              Privacy Policy
            </h1>
            
            <div className="space-y-8 text-secondary-700 dark:text-secondary-300">
              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  1. Information We Collect
                </h2>
                <p className="mb-4">
                  We collect information you provide directly to us when using our services:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Contact Information:</strong> Email addresses for order communication</li>
                  <li><strong>Order Details:</strong> Custom bot requirements, features, and specifications</li>
                  <li><strong>Payment Information:</strong> Payment method preferences and transaction details</li>
                  <li><strong>Refund Information:</strong> Cryptocurrency wallet addresses or M-Pesa details for refunds</li>
                  <li><strong>Communication Records:</strong> Support emails and order correspondence</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  2. How We Use Your Information
                </h2>
                <p className="mb-4">
                  We use the collected information for the following purposes:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Processing and fulfilling custom bot orders</li>
                  <li>Sending order confirmations and tracking information</li>
                  <li>Providing customer support and responding to inquiries</li>
                  <li>Processing payments and refunds</li>
                  <li>Delivering completed custom bots via email</li>
                  <li>Maintaining order records for support purposes</li>
                  <li>Improving our services and customer experience</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  3. Information Sharing and Disclosure
                </h2>
                <p className="mb-4">
                  We do not sell, trade, or otherwise transfer your personal information to third parties, except:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Payment Processors:</strong> To process payments and refunds</li>
                  <li><strong>Email Services:</strong> To send order confirmations and bot deliveries</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                  <li><strong>Service Providers:</strong> Trusted partners who assist in operating our website</li>
                </ul>
                <p className="mt-4 font-semibold">
                  Your custom bot requirements and trading strategies are kept strictly confidential.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  4. Data Security
                </h2>
                <p className="mb-4">
                  We implement appropriate security measures to protect your personal information:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encrypted data transmission using SSL/TLS</li>
                  <li>Secure database storage with access controls</li>
                  <li>Regular security audits and updates</li>
                  <li>Limited access to personal information by authorized personnel only</li>
                  <li>Secure payment processing through trusted providers</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  5. Data Retention
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Order Information:</strong> Retained for 1 year for support and warranty purposes</li>
                  <li><strong>Payment Records:</strong> Retained for 3 years for accounting and tax purposes</li>
                  <li><strong>Support Communications:</strong> Retained for 2 years for quality assurance</li>
                  <li><strong>Custom Bot Files:</strong> Backed up for 6 months in case of re-delivery needs</li>
                  <li><strong>Email Addresses:</strong> Removed from active systems after order completion unless needed for ongoing support</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  6. Your Rights
                </h2>
                <p className="mb-4">
                  You have the following rights regarding your personal information:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate personal information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal obligations)</li>
                  <li><strong>Portability:</strong> Request transfer of your data to another service provider</li>
                  <li><strong>Withdrawal:</strong> Withdraw consent for processing (may affect service delivery)</li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, please contact us at support@derivbotstore.com
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  7. Cookies and Tracking
                </h2>
                <p className="mb-4">
                  Our website uses cookies and similar technologies to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Remember your preferences and settings</li>
                  <li>Analyze website traffic and usage patterns</li>
                  <li>Improve website functionality and user experience</li>
                  <li>Prevent fraud and enhance security</li>
                </ul>
                <p className="mt-4">
                  You can control cookies through your browser settings, but some website features may not function properly if cookies are disabled.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  8. Third-Party Services
                </h2>
                <p className="mb-4">
                  We use the following third-party services that may collect information:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Supabase:</strong> Database hosting and management</li>
                  <li><strong>Payment Providers:</strong> M-Pesa and cryptocurrency payment processing</li>
                  <li><strong>Email Services:</strong> Transactional email delivery</li>
                  <li><strong>Analytics:</strong> Website usage analysis (if enabled)</li>
                </ul>
                <p className="mt-4">
                  These services have their own privacy policies, and we encourage you to review them.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  9. International Data Transfers
                </h2>
                <p className="mb-4">
                  Your information may be processed and stored in countries other than your own. 
                  We ensure appropriate safeguards are in place to protect your personal information 
                  during international transfers.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  10. Children's Privacy
                </h2>
                <p>
                  Our services are not intended for individuals under 18 years of age. 
                  We do not knowingly collect personal information from children under 18. 
                  If you become aware that a child has provided us with personal information, 
                  please contact us immediately.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  11. Changes to This Privacy Policy
                </h2>
                <p className="mb-4">
                  We may update this privacy policy from time to time. We will notify you of any 
                  significant changes by posting the new privacy policy on this page and updating 
                  the "Last Updated" date.
                </p>
                <p>
                  Your continued use of our services after any changes constitutes acceptance 
                  of the updated privacy policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  12. Contact Us
                </h2>
                <p className="mb-4">
                  If you have any questions about this privacy policy or our data practices, please contact us:
                </p>
                <div className="space-y-2">
                  <p><strong>Email:</strong> support@derivbotstore.com</p>
                  <p><strong>Subject Line:</strong> Privacy Policy Inquiry</p>
                  <p><strong>Response Time:</strong> 48 hours</p>
                </div>
              </section>

              <section className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
                <p className="text-sm text-secondary-500 dark:text-secondary-500">
                  <strong>Last Updated:</strong> January 2024<br />
                  <strong>Effective Date:</strong> January 2024
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}