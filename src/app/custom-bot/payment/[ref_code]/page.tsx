import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CustomBotPaymentForm } from '@/components/custom-bot/custom-bot-payment-form';
import { CustomBotOrderSummary } from '@/components/custom-bot/custom-bot-order-summary';
import { getCustomBotOrder } from '@/lib/custom-bot';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Custom Bot Payment',
  description: 'Complete payment for your custom trading bot order.',
  noIndex: true
});

interface CustomBotPaymentPageProps {
  params: {
    ref_code: string;
  };
}

export default async function CustomBotPaymentPage({ params }: CustomBotPaymentPageProps) {
  const { ref_code } = params;
  
  // Fetch order details
  const orderResult = await getCustomBotOrder(ref_code);
  
  if (!orderResult.success || !orderResult.data) {
    notFound();
  }

  const order = orderResult.data;

  // If payment is already completed, show success message
  if (order.payment_status === 'paid') {
    return (
      <div className="min-h-screen">
        <Header />
        
        <main className="pt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="glass-card rounded-3xl p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">✅</span>
              </div>
              
              <h1 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                Payment Completed
              </h1>
              
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                Your payment has been processed successfully. We'll start working on your custom bot immediately.
              </p>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
                <p className="font-semibold text-green-800 dark:text-green-200 mb-2">
                  Order Details
                </p>
                <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                  <p><strong>Tracking Number:</strong> {order.tracking_number}</p>
                  <p><strong>Order ID:</strong> {order.ref_code}</p>
                  <p><strong>Email:</strong> {order.client_email}</p>
                  <p><strong>Amount:</strong> ${order.budget_amount}</p>
                </div>
              </div>
              
              <p className="text-sm text-secondary-500 dark:text-secondary-500">
                You'll receive your custom bot within 24 hours via email. 
                If you have any questions, please contact our support team.
              </p>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
              Complete Your Payment
            </h1>
            <p className="text-lg text-secondary-600 dark:text-secondary-400">
              Secure payment for your custom trading bot
            </p>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Payment Form */}
            <div className="lg:col-span-2">
              <CustomBotPaymentForm order={order} />
            </div>
            
            {/* Order Summary */}
            <div className="lg:col-span-1">
              <CustomBotOrderSummary order={order} />
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-12">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400">🔒</span>
                </div>
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200">
                  Secure Payment
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-secondary-600 dark:text-secondary-400">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>SSL Encrypted</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>PCI Compliant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Money Back Guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}