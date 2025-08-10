import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { EnhancedFooter } from '@/components/layout/enhanced-footer';
import { UrgentMessageModal } from '@/components/ui/urgent-message-modal';
import { CustomBotPaymentForm } from '@/components/custom-bot/custom-bot-payment-form';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { supabaseAdmin } from '@/lib/supabase';

interface CustomBotPaymentPageProps {
  params: {
    ref_code: string;
  };
}

async function getCustomBotOrder(refCode: string) {
  try {
    const { data: order, error } = await supabaseAdmin
      .from('custom_bot_orders')
      .select('*')
      .eq('ref_code', refCode)
      .single();

    if (error || !order) {
      return null;
    }

    return order;
  } catch (error) {
    console.error('Error fetching custom bot order:', error);
    return null;
  }
}

export async function generateMetadata({ params }: CustomBotPaymentPageProps): Promise<Metadata> {
  const order = await getCustomBotOrder(params.ref_code);
  
  if (!order) {
    return {
      title: 'Payment Not Found',
    };
  }

  return {
    title: `Payment for Custom Bot Order ${order.ref_code} - Deriv Bot Store`,
    description: `Complete payment for your custom trading bot development request.`,
    robots: 'noindex, nofollow', // Don't index payment pages
  };
}

export default async function CustomBotPaymentPage({ params }: CustomBotPaymentPageProps) {
  const order = await getCustomBotOrder(params.ref_code);

  if (!order) {
    notFound();
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Custom Bot', href: '/custom-bot' },
    { label: 'Payment', href: `/custom-bot/payment/${params.ref_code}` },
  ];

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
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
              Complete Your Payment
            </h1>
            <p className="text-lg text-secondary-600 dark:text-secondary-300">
              Secure payment for your custom bot development
            </p>
          </div>

          {/* Order Summary */}
          <div className="glass-card rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
              Order Summary
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-secondary-600 dark:text-secondary-400">Order Reference:</span>
                <span className="font-medium text-secondary-800 dark:text-secondary-200">{order.ref_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600 dark:text-secondary-400">Tracking Number:</span>
                <span className="font-medium text-secondary-800 dark:text-secondary-200">{order.tracking_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600 dark:text-secondary-400">Development Budget:</span>
                <span className="font-medium text-secondary-800 dark:text-secondary-200">${order.budget_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600 dark:text-secondary-400">Email:</span>
                <span className="font-medium text-secondary-800 dark:text-secondary-200">{order.client_email}</span>
              </div>
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span className="text-secondary-800 dark:text-secondary-200">Total Amount:</span>
                  <span className="text-primary-600">${order.budget_amount.toFixed(2)} USD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <CustomBotPaymentForm order={order} />

          {/* What Happens Next */}
          <div className="glass-card rounded-2xl p-6 mt-8">
            <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
              What Happens Next?
            </h3>
            
            <div className="space-y-3 text-secondary-600 dark:text-secondary-400">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-green-600 text-sm font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-secondary-800 dark:text-secondary-200">Payment Confirmation</p>
                  <p className="text-sm">You'll receive an email confirmation once payment is processed</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-blue-600 text-sm font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-secondary-800 dark:text-secondary-200">Development Begins</p>
                  <p className="text-sm">Our team will analyze your requirements and start development immediately</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-purple-600 text-sm font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-secondary-800 dark:text-secondary-200">Delivery within 24 Hours</p>
                  <p className="text-sm">Your custom bot will be delivered to your email within 24 hours</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-orange-600 text-sm font-bold">4</span>
                </div>
                <div>
                  <p className="font-medium text-secondary-800 dark:text-secondary-200">Support Included</p>
                  <p className="text-sm">7 days of technical support for setup and basic assistance</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="glass-card rounded-2xl p-6 mt-8 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-start gap-3">
              <div className="text-green-600 mt-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                  🔒 Secure Payment Processing
                </h4>
                <p className="text-sm text-green-700 dark:text-green-400">
                  All payments are processed securely. If your custom bot requirements cannot be technically 
                  implemented, you will receive a full refund to your selected refund method within 1-3 business days.
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