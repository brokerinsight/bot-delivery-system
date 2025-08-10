import { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { EnhancedFooter } from '@/components/layout/enhanced-footer';
import { UrgentMessageModal } from '@/components/ui/urgent-message-modal';
import { CustomBotRequestForm } from '@/components/custom-bot/custom-bot-request-form';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

export const metadata: Metadata = {
  title: 'Request Custom Trading Bot - Deriv Bot Store',
  description: 'Get a custom trading bot built specifically for your needs. Professional development with 24-hour delivery guarantee.',
  keywords: 'custom trading bot, forex bot development, automated trading, deriv bot custom',
};

const breadcrumbItems = [
  { label: 'Home', href: '/' },
  { label: 'Store', href: '/store' },
  { label: 'Request Custom Bot', href: '/custom-bot' },
];

export default function CustomBotPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <UrgentMessageModal />
      
      <main className="pt-16 pb-16">
        {/* Breadcrumbs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-secondary-800 dark:text-secondary-200 mb-6">
              Request Your 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600">
                {" "}Custom Trading Bot
              </span>
            </h1>
            <p className="text-xl text-secondary-600 dark:text-secondary-300 max-w-3xl mx-auto mb-8">
              Get a personalized trading bot built specifically for your strategy. 
              Professional development with expert support and 24-hour delivery guarantee.
            </p>
            
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
              <div className="glass-card rounded-2xl p-6">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Fast Delivery
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                  Your custom bot delivered within 24 hours or full refund guaranteed
                </p>
              </div>
              
              <div className="glass-card rounded-2xl p-6">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Your Strategy
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                  Built exactly to your specifications and trading requirements
                </p>
              </div>
              
              <div className="glass-card rounded-2xl p-6">
                <div className="text-3xl mb-3">🛡️</div>
                <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Money Back
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                  If technically impossible, full refund to your preferred method
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Request Form */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <CustomBotRequestForm />
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200 text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-3">
                How long does development take?
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400">
                Most custom bots are delivered within 24 hours. Complex strategies may take longer, 
                but we'll inform you immediately if that's the case.
              </p>
            </div>
            
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-3">
                What if my strategy is too complex?
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400">
                If your trading logic isn't technically feasible with current tools, 
                we'll provide a full refund to your preferred payment method.
              </p>
            </div>
            
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-3">
                What payment methods do you accept?
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400">
                We accept M-Pesa and various cryptocurrencies. The same payment methods 
                are available for refunds if needed.
              </p>
            </div>
            
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-3">
                Do you provide support after delivery?
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400">
                Yes! We provide setup assistance and basic support to ensure your bot works correctly. 
                Extended support packages are also available.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <EnhancedFooter />
    </div>
  );
}