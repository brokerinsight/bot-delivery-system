import { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { EnhancedFooter } from '@/components/layout/enhanced-footer';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { CheckoutSummary } from '@/components/checkout/checkout-summary';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

export const metadata: Metadata = {
  title: 'Secure Checkout - Deriv Bot Store',
  description: 'Complete your purchase securely with instant access to your trading bots.',
  robots: {
    index: false, // Don't index checkout pages
    follow: false,
  },
};

const breadcrumbItems = [
  { label: 'Home', href: '/' },
  { label: 'Store', href: '/store' },
  { label: 'Cart', href: '/cart' },
  { label: 'Checkout', href: '/checkout' },
];

export default function CheckoutPage() {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-16 pb-16">
        {/* Breadcrumbs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* Page Header */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
              Secure Checkout
            </h1>
            <p className="text-lg text-secondary-600 dark:text-secondary-300 max-w-2xl mx-auto">
              Complete your purchase and get instant access to your trading bots.
            </p>
            
            {/* Security Badges */}
            <div className="flex items-center justify-center space-x-6 mt-6">
              <div className="flex items-center space-x-2 text-sm text-secondary-500 dark:text-secondary-500">
                <span>🔒</span>
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-secondary-500 dark:text-secondary-500">
                <span>⚡</span>
                <span>Instant Access</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-secondary-500 dark:text-secondary-500">
                <span>🛡️</span>
                <span>Money Back Guarantee</span>
              </div>
            </div>
          </div>

          {/* Checkout Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2">
              <CheckoutForm />
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <CheckoutSummary />
              </div>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="glass-card rounded-3xl p-8">
            <h3 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200 text-center mb-8">
              Your Purchase is Protected
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h4 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Secure Payment
                </h4>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Your payment information is encrypted and secure. We never store your payment details.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📧</span>
                </div>
                <h4 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Instant Delivery
                </h4>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Receive your download links immediately via email after successful payment.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🛟</span>
                </div>
                <h4 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Expert Support
                </h4>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Get help from our trading experts 24/7 via live chat, email, or phone.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <EnhancedFooter />
    </div>
  );
}