import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { EnhancedFooter } from '@/components/layout/enhanced-footer';
import { UrgentMessageModal } from '@/components/ui/urgent-message-modal';
import { CheckCircleIcon, ClockIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { supabaseAdmin } from '@/lib/supabase';

interface CustomBotSuccessPageProps {
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

export async function generateMetadata({ params }: CustomBotSuccessPageProps): Promise<Metadata> {
  const order = await getCustomBotOrder(params.ref_code);
  
  if (!order) {
    return {
      title: 'Order Not Found',
    };
  }

  return {
    title: `Order Confirmation ${order.ref_code} - Deriv Bot Store`,
    description: `Your custom bot order has been received and is being processed.`,
    robots: 'noindex, nofollow',
  };
}

export default async function CustomBotSuccessPage({ params }: CustomBotSuccessPageProps) {
  const order = await getCustomBotOrder(params.ref_code);

  if (!order) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <Header />
      <UrgentMessageModal />
      
      <main className="pt-16 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircleIcon className="w-12 h-12 text-green-600" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
              Order Received Successfully!
            </h1>
            
            <p className="text-lg text-secondary-600 dark:text-secondary-300">
              Thank you for your custom bot request. We'll get started on your project right away.
            </p>
          </div>

          {/* Order Details */}
          <div className="glass-card rounded-2xl p-8 mb-8">
            <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200 mb-6">
              Order Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary-600 dark:text-secondary-400 mb-1">
                  Order Reference
                </label>
                <div className="text-lg font-mono text-secondary-800 dark:text-secondary-200">
                  {order.ref_code}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-600 dark:text-secondary-400 mb-1">
                  Tracking Number
                </label>
                <div className="text-lg font-mono text-secondary-800 dark:text-secondary-200">
                  {order.tracking_number}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-600 dark:text-secondary-400 mb-1">
                  Development Budget
                </label>
                <div className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
                  ${order.budget_amount.toFixed(2)} USD
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-600 dark:text-secondary-400 mb-1">
                  Email Address
                </label>
                <div className="text-lg text-secondary-800 dark:text-secondary-200">
                  {order.client_email}
                </div>
              </div>
            </div>
          </div>

          {/* What Happens Next Timeline */}
          <div className="glass-card rounded-2xl p-8 mb-8">
            <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200 mb-6">
              What Happens Next?
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-1">
                    Order Confirmed ✓
                  </h3>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    Your custom bot request has been received and is in our development queue.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <ClockIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-1">
                    Development in Progress
                  </h3>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    Our expert developers are analyzing your requirements and building your custom bot.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <EnvelopeIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-1">
                    Delivery (Within 24 Hours)
                  </h3>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    Your completed custom bot will be delivered to your email with setup instructions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="glass-card rounded-2xl p-8 mb-8 bg-blue-50 dark:bg-blue-900/20">
            <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-4">
              📧 Important Information
            </h2>
            
            <div className="space-y-3 text-blue-700 dark:text-blue-400">
              <p className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Check your email (including spam folder) for order confirmation and updates</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Save your tracking number: <strong>{order.tracking_number}</strong> for reference</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>You'll receive your bot within 24 hours or get a full refund if technically impossible</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>7 days of free technical support included with your custom bot</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/store"
              className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors text-center"
            >
              Browse More Bots
            </Link>
            
            <Link
              href="/"
              className="px-8 py-3 border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 font-semibold rounded-xl transition-colors text-center"
            >
              Back to Home
            </Link>
          </div>

          {/* Support Information */}
          <div className="text-center mt-8 text-sm text-secondary-600 dark:text-secondary-400">
            <p>
              Need help? Contact us at{' '}
              <a href="mailto:support@derivbotstore.com" className="text-primary-600 hover:underline">
                support@derivbotstore.com
              </a>
            </p>
          </div>
        </div>
      </main>
      
      <EnhancedFooter />
    </div>
  );
}