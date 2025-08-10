import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { UrgentMessageModal } from '@/components/ui/urgent-message-modal';
import { DownloadContent } from '@/components/download/download-content';
import { DownloadSecurity } from '@/components/download/download-security';

// Mock token validation - replace with actual API call
async function validateToken(token: string) {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Mock valid tokens
  const validTokens: Record<string, any> = {
    'REFABC123XYZ': {
      orderId: 1,
      files: [
        {
          id: 'file_1',
          name: 'Advanced Martingale Bot',
          filename: 'advanced_martingale.xml',
          size: '2.5 MB',
          downloadUrl: '/api/download/file_1',
        }
      ],
      customerEmail: 'customer@example.com',
      orderDate: '2024-01-20T10:00:00Z',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      used: false,
    }
  };

  return validTokens[token] || null;
}

interface DownloadPageProps {
  params: {
    token: string;
  };
}

export async function generateMetadata({ params }: DownloadPageProps): Promise<Metadata> {
  const tokenData = await validateToken(params.token);

  if (!tokenData) {
    return {
      title: 'Download Not Found - Deriv Bot Store',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: 'Download Your Files - Deriv Bot Store',
    description: 'Access your purchased trading bots securely.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function DownloadPage({ params }: DownloadPageProps) {
  const tokenData = await validateToken(params.token);

  if (!tokenData) {
    notFound();
  }

  // Check if token is expired
  const isExpired = new Date() > new Date(tokenData.expiresAt);
  
  if (isExpired) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <div className="glass-card rounded-3xl p-12">
              <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">⏰</span>
              </div>
              <h1 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
                Download Link Expired
              </h1>
              <p className="text-lg text-secondary-600 dark:text-secondary-300 mb-8">
                This download link has expired. Download links are valid for 24 hours after purchase.
              </p>
              <div className="space-y-4">
                <p className="text-secondary-500 dark:text-secondary-500">
                  Need help? Contact our support team with your order details.
                </p>
                <a
                  href="mailto:support@derivbotstore.com"
                  className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors duration-200"
                >
                  Contact Support
                </a>
              </div>
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
      <UrgentMessageModal />
      
      <main className="pt-16">
        {/* Page Header */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✅</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
              Payment Successful!
            </h1>
            <p className="text-lg text-secondary-600 dark:text-secondary-300 max-w-2xl mx-auto">
              Thank you for your purchase. Your trading bots are ready for download.
            </p>
          </div>

          {/* Download Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Download Files */}
            <div className="lg:col-span-2">
              <DownloadContent tokenData={tokenData} token={params.token} />
            </div>

            {/* Security Info & Instructions */}
            <div className="lg:col-span-1">
              <DownloadSecurity tokenData={tokenData} />
            </div>
          </div>
        </section>

        {/* Next Steps */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="glass-card rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-secondary-800 dark:text-secondary-200 mb-6 text-center">
              What's Next?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📁</span>
                </div>
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Import to Deriv Bot
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Upload the XML file to your Deriv Bot platform and start trading.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📚</span>
                </div>
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Read Documentation
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Check the included guide for setup instructions and best practices.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">
                  Get Support
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Join our community or contact support for any questions.
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