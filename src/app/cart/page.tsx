import { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartContent } from '@/components/cart/cart-content';
import { CartSummary } from '@/components/cart/cart-summary';
import { RecommendedProducts } from '@/components/cart/recommended-products';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

export const metadata: Metadata = {
  title: 'Shopping Cart - Deriv Bot Store',
  description: 'Review your selected trading bots and proceed to checkout. Secure payment and instant download.',
  robots: {
    index: false, // Don't index cart pages
    follow: true,
  },
};

const breadcrumbItems = [
  { label: 'Home', href: '/' },
  { label: 'Store', href: '/store' },
  { label: 'Cart', href: '/cart' },
];

export default function CartPage() {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-16">
        {/* Breadcrumbs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* Page Header */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
              Shopping Cart
            </h1>
            <p className="text-lg text-secondary-600 dark:text-secondary-300 max-w-2xl mx-auto">
              Review your selected trading bots and proceed to secure checkout for instant download.
            </p>
          </div>

          {/* Cart Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <CartContent />
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <CartSummary />
              </div>
            </div>
          </div>
        </section>

        {/* Recommended Products */}
        <RecommendedProducts />

        {/* Trust Badges */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="glass-card rounded-3xl p-8">
            <h3 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200 text-center mb-6">
              Why Shop With Us?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: '🔒',
                  title: 'Secure Payment',
                  description: 'SSL encrypted transactions',
                },
                {
                  icon: '⚡',
                  title: 'Instant Download',
                  description: 'Access files immediately',
                },
                {
                  icon: '🛡️',
                  title: '30-Day Guarantee',
                  description: 'Money back if not satisfied',
                },
                {
                  icon: '🎯',
                  title: 'Expert Support',
                  description: '24/7 professional assistance',
                },
              ].map((feature, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl mb-3">{feature.icon}</div>
                  <h4 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}