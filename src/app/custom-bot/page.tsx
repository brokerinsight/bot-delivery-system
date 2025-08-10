import { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CustomBotForm } from '@/components/custom-bot/custom-bot-form';
import { CustomBotInfo } from '@/components/custom-bot/custom-bot-info';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Request Custom Trading Bot',
  description: 'Order a custom trading bot tailored to your specific strategy and requirements. Professional development with 24-hour delivery.',
  keywords: ['custom trading bot', 'bespoke bot development', 'personalized trading strategy', 'deriv custom bot']
});

export default function CustomBotPage() {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-hero font-bold text-secondary-800 dark:text-secondary-200 mb-6">
              Request Your Custom Trading Bot
            </h1>
            <p className="text-xl text-secondary-600 dark:text-secondary-400 max-w-3xl mx-auto mb-8">
              Get a personalized trading bot designed specifically for your strategy. 
              Our expert developers will create a custom solution tailored to your exact requirements.
            </p>
            
            {/* Key Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="glass-card rounded-2xl p-6">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Fast Delivery
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Receive your custom bot within 24 hours
                </p>
              </div>
              
              <div className="glass-card rounded-2xl p-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Tailored Strategy
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Built exactly to your specifications
                </p>
              </div>
              
              <div className="glass-card rounded-2xl p-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Money-Back Guarantee
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Full refund if technically impossible
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2">
              <CustomBotForm />
            </div>
            
            {/* Info Sidebar */}
            <div className="lg:col-span-1">
              <CustomBotInfo />
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="glass-card rounded-3xl p-8 lg:p-12">
            <h2 className="text-section font-bold text-secondary-800 dark:text-secondary-200 mb-8 text-center">
              How It Works
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Submit Request
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Fill out the form with your bot requirements and strategy details
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Make Payment
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Complete payment via M-Pesa or cryptocurrency
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Development
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Our experts develop your custom bot according to specifications
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">4</span>
                </div>
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Delivery
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Receive your completed bot via email with setup instructions
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="glass-card rounded-3xl p-8 lg:p-12">
            <h2 className="text-section font-bold text-secondary-800 dark:text-secondary-200 mb-8 text-center">
              Frequently Asked Questions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  What's the minimum budget?
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  The minimum order amount is $10. Complex strategies may require higher budgets.
                </p>
                
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  How long does development take?
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  Most custom bots are completed within 24 hours. Complex requirements may take up to 5 business days.
                </p>
                
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  What if my strategy can't be implemented?
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400">
                  If your requirements are technically impossible, we'll provide a full refund to your chosen refund method.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  What payment methods do you accept?
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  We accept M-Pesa and various cryptocurrencies. Choose your preferred method during checkout.
                </p>
                
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Do I get the source code?
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                  You receive the XML file compatible with Deriv Bot. Source code remains our property, but you get full usage rights.
                </p>
                
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Is there ongoing support?
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400">
                  We provide 7 days of support for technical issues and setup assistance.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}