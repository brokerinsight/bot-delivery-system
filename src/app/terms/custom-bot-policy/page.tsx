import { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Custom Bot Development Policy',
  description: 'Terms and conditions for custom trading bot development services at Deriv Bot Store.',
  noIndex: true
});

export default function CustomBotPolicyPage() {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="glass-card rounded-3xl p-8 lg:p-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-secondary-800 dark:text-secondary-200 mb-8 text-center">
              Custom Bot Development Policy
            </h1>
            
            <div className="space-y-8 text-secondary-700 dark:text-secondary-300">
              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  1. Service Overview
                </h2>
                <p className="mb-4">
                  Deriv Bot Store offers custom trading bot development services for the Deriv platform. 
                  Our team creates personalized automated trading solutions based on your specific requirements, 
                  trading strategies, and budget considerations.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Custom bot development typically takes 1-5 business days</li>
                  <li>All bots are developed specifically for the Deriv trading platform</li>
                  <li>Bots are delivered as XML files compatible with Deriv Bot</li>
                  <li>We provide basic setup instructions with each custom bot</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  2. Pricing and Payment
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Minimum order amount: $10 USD</li>
                  <li>Pricing depends on complexity and features requested</li>
                  <li>Payment must be completed before development begins</li>
                  <li>We accept M-Pesa and cryptocurrency payments</li>
                  <li>All prices are quoted in USD</li>
                  <li>No additional fees for standard delivery (24 hours)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  3. Development Process
                </h2>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Submit your custom bot request with detailed requirements</li>
                  <li>Complete payment through your preferred method</li>
                  <li>Receive order confirmation and tracking number via email</li>
                  <li>Our team reviews your requirements and begins development</li>
                  <li>Bot testing and quality assurance</li>
                  <li>Delivery via email within 24 hours (typically sooner)</li>
                  <li>Receive completion confirmation and setup instructions</li>
                </ol>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  4. Technical Feasibility
                </h2>
                <p className="mb-4">
                  While we strive to accommodate all requests, some trading strategies may not be 
                  technically feasible due to platform limitations or regulatory constraints.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We will assess technical feasibility during the review process</li>
                  <li>If requirements cannot be met, a full refund will be issued</li>
                  <li>Alternative solutions may be suggested when possible</li>
                  <li>Complex strategies may require additional development time</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  5. Refund Policy
                </h2>
                <p className="mb-4">
                  We offer refunds in the following circumstances:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Technical requirements cannot be implemented</li>
                  <li>Platform limitations prevent strategy implementation</li>
                  <li>Failure to deliver within 48 hours (excluding weekends)</li>
                  <li>Bot does not meet specified requirements (within 7 days)</li>
                </ul>
                <p className="mt-4 text-sm">
                  Refunds are processed to your specified refund method within 3-5 business days.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  6. Intellectual Property
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Custom bots are licensed for personal use only</li>
                  <li>Redistribution or resale is strictly prohibited</li>
                  <li>Source code remains property of Deriv Bot Store</li>
                  <li>Client receives usage rights, not ownership</li>
                  <li>Reverse engineering is not permitted</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  7. Risk Disclaimer
                </h2>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    ⚠️ Important Risk Warning
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-yellow-700 dark:text-yellow-300">
                    <li>Trading involves substantial risk of loss</li>
                    <li>Past performance does not guarantee future results</li>
                    <li>Only trade with money you can afford to lose</li>
                    <li>We do not guarantee profits or trading success</li>
                    <li>Users are responsible for their trading decisions</li>
                    <li>Test bots on demo accounts before live trading</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  8. Support and Warranty
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>7-day warranty against technical defects</li>
                  <li>Basic setup support included</li>
                  <li>Email support available for technical issues</li>
                  <li>No ongoing maintenance or updates after delivery</li>
                  <li>Platform updates may require bot modifications (additional cost)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  9. Privacy and Data Protection
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your trading strategy details are kept confidential</li>
                  <li>Email addresses are used only for order communication</li>
                  <li>No personal trading data is collected or stored</li>
                  <li>Refund details are securely encrypted and protected</li>
                  <li>Order information is retained for 1 year for support purposes</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  10. Limitation of Liability
                </h2>
                <p className="mb-4">
                  Deriv Bot Store's liability is limited to the amount paid for the custom bot service. 
                  We are not responsible for trading losses, missed opportunities, or any consequential damages 
                  arising from bot usage.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
                  11. Contact Information
                </h2>
                <p>
                  For questions about this policy or your custom bot order, please contact us at:
                </p>
                <div className="mt-4 space-y-2">
                  <p><strong>Email:</strong> support@derivbotstore.com</p>
                  <p><strong>Response Time:</strong> 24-48 hours</p>
                </div>
              </section>

              <section className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
                <p className="text-sm text-secondary-500 dark:text-secondary-500">
                  <strong>Last Updated:</strong> January 2024<br />
                  This policy may be updated periodically. Continued use of our service constitutes acceptance of any changes.
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