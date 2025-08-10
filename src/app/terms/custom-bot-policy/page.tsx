import { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { EnhancedFooter } from '@/components/layout/enhanced-footer';
import { UrgentMessageModal } from '@/components/ui/urgent-message-modal';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

export const metadata: Metadata = {
  title: 'Custom Bot Terms & Conditions - Deriv Bot Store',
  description: 'Terms and conditions for custom trading bot development services.',
};

const breadcrumbItems = [
  { label: 'Home', href: '/' },
  { label: 'Terms', href: '/terms' },
  { label: 'Custom Bot Policy', href: '/terms/custom-bot-policy' },
];

export default function CustomBotPolicyPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <UrgentMessageModal />
      
      <main className="pt-16 pb-16">
        {/* Breadcrumbs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <article className="prose prose-lg max-w-none">
            <h1 className="text-4xl font-bold text-secondary-800 dark:text-secondary-200 mb-8">
              Custom Bot Terms & Conditions
            </h1>
            
            <p className="text-lg text-secondary-600 dark:text-secondary-400 mb-8">
              Last updated: December 2024
            </p>

            <div className="glass-card rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                Service Description
              </h2>
              <p className="text-secondary-700 dark:text-secondary-300 mb-4">
                Our Custom Bot Development service creates personalized trading bots based on your specific 
                requirements and trading strategies. Each bot is uniquely designed according to your provided 
                specifications.
              </p>
            </div>

            <div className="space-y-8">
              <section className="glass-card rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                  1. Service Terms
                </h2>
                <ul className="space-y-3 text-secondary-700 dark:text-secondary-300">
                  <li><strong>Delivery Time:</strong> Standard delivery is within 24 hours of payment confirmation.</li>
                  <li><strong>Minimum Budget:</strong> $10 USD minimum order amount.</li>
                  <li><strong>Maximum Budget:</strong> $10,000 USD maximum order amount.</li>
                  <li><strong>Scope:</strong> Development includes bot logic implementation, basic testing, and delivery.</li>
                  <li><strong>Support:</strong> 7 days of technical support included for setup and basic issues.</li>
                </ul>
              </section>

              <section className="glass-card rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                  2. Development Process
                </h2>
                <ol className="space-y-3 text-secondary-700 dark:text-secondary-300 list-decimal list-inside">
                  <li>You submit your bot requirements and strategy details</li>
                  <li>Payment is processed and order is confirmed</li>
                  <li>Our developers analyze your requirements for technical feasibility</li>
                  <li>If feasible, development begins immediately</li>
                  <li>Completed bot is delivered via email within 24 hours</li>
                  <li>Support period begins upon delivery</li>
                </ol>
              </section>

              <section className="glass-card rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                  3. Refund Policy
                </h2>
                <div className="space-y-4 text-secondary-700 dark:text-secondary-300">
                  <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
                    Full Refund Conditions:
                  </h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Your trading strategy is technically impossible to implement</li>
                    <li>Required indicators or conditions are not available in our development environment</li>
                    <li>Technical limitations prevent bot creation</li>
                    <li>We fail to deliver within 48 hours (unless extension is agreed upon)</li>
                  </ul>
                  
                  <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mt-6">
                    Refund Process:
                  </h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Refunds are processed to your chosen refund method (M-Pesa or Crypto)</li>
                    <li>Processing time: 1-3 business days for M-Pesa, 1-24 hours for Crypto</li>
                    <li>You will receive email confirmation when refund is initiated</li>
                  </ul>
                </div>
              </section>

              <section className="glass-card rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                  4. Intellectual Property
                </h2>
                <ul className="space-y-3 text-secondary-700 dark:text-secondary-300">
                  <li><strong>Bot Ownership:</strong> You receive full usage rights to your custom bot</li>
                  <li><strong>Source Code:</strong> Proprietary development methods remain our intellectual property</li>
                  <li><strong>Modifications:</strong> You may request modifications within 7 days (additional fees may apply)</li>
                  <li><strong>Distribution:</strong> You may not redistribute or resell the bot to third parties</li>
                </ul>
              </section>

              <section className="glass-card rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                  5. Limitations & Disclaimers
                </h2>
                <div className="space-y-4 text-secondary-700 dark:text-secondary-300">
                  <ul className="space-y-3 list-disc list-inside">
                    <li><strong>Trading Risks:</strong> All trading involves risk. We do not guarantee profits or trading success</li>
                    <li><strong>Market Conditions:</strong> Bot performance depends on market conditions and may vary</li>
                    <li><strong>Platform Compatibility:</strong> Bots are designed for Deriv Bot platform specifically</li>
                    <li><strong>Testing:</strong> You are responsible for testing the bot in demo mode before live trading</li>
                    <li><strong>Liability:</strong> We are not liable for trading losses or market-related damages</li>
                  </ul>
                  
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mt-6">
                    <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                      ⚠️ Important Notice
                    </h4>
                    <p className="text-amber-700 dark:text-amber-400 text-sm">
                      Trading with automated systems involves significant risk. Past performance does not guarantee 
                      future results. Only trade with money you can afford to lose.
                    </p>
                  </div>
                </div>
              </section>

              <section className="glass-card rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                  6. Support Terms
                </h2>
                <ul className="space-y-3 text-secondary-700 dark:text-secondary-300">
                  <li><strong>Duration:</strong> 7 days from delivery date</li>
                  <li><strong>Scope:</strong> Technical issues, setup assistance, bug fixes</li>
                  <li><strong>Response Time:</strong> Within 24 hours during business days</li>
                  <li><strong>Extended Support:</strong> Available for purchase after initial period</li>
                  <li><strong>Exclusions:</strong> Strategy modifications, market-related issues, user error</li>
                </ul>
              </section>

              <section className="glass-card rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                  7. Payment Terms
                </h2>
                <ul className="space-y-3 text-secondary-700 dark:text-secondary-300">
                  <li><strong>Payment Methods:</strong> M-Pesa, Cryptocurrency</li>
                  <li><strong>Processing:</strong> Development begins after payment confirmation</li>
                  <li><strong>Currency:</strong> All prices in USD, converted at current rates for local payments</li>
                  <li><strong>Fees:</strong> Payment processing fees may apply depending on method</li>
                </ul>
              </section>

              <section className="glass-card rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                  8. Contact Information
                </h2>
                <div className="text-secondary-700 dark:text-secondary-300">
                  <p className="mb-4">
                    For questions about our Custom Bot service or these terms:
                  </p>
                  <ul className="space-y-2">
                    <li><strong>Email:</strong> support@derivbotstore.com</li>
                    <li><strong>Response Time:</strong> Within 24 hours</li>
                    <li><strong>Business Hours:</strong> Monday - Friday, 9 AM - 6 PM EAT</li>
                  </ul>
                </div>
              </section>

              <section className="glass-card rounded-2xl p-8 bg-green-50 dark:bg-green-900/20">
                <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-4">
                  Agreement
                </h2>
                <p className="text-green-700 dark:text-green-400">
                  By using our Custom Bot service, you acknowledge that you have read, understood, and agree 
                  to these terms and conditions. These terms may be updated periodically, and continued use 
                  constitutes acceptance of any changes.
                </p>
              </section>
            </div>
          </article>
        </div>
      </main>
      
      <EnhancedFooter />
    </div>
  );
}