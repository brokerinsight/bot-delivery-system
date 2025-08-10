import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { WebSocketProvider } from '@/components/providers/websocket-provider';
import { generateWebsiteStructuredData, generateOrganizationStructuredData } from '@/lib/seo';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Deriv Bot Store - Premium Trading Bots & Strategies',
    template: '%s | Deriv Bot Store',
  },
  description: 'Discover premium trading bots and automated strategies for Deriv. Professional-grade tools for binary options and forex trading with proven results.',
  keywords: [
    'trading bots',
    'Deriv',
    'automation',
    'Binary trading',
    'Deriv Bots',
    'Deriv strategies',
    'forex trading',
    'binary options',
    'automated trading',
    'algorithmic trading',
  ],
  authors: [{ name: 'Deriv Bot Store' }],
  creator: 'Deriv Bot Store',
  publisher: 'Deriv Bot Store',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://botblitz.store'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Deriv Bot Store - Premium Trading Bots & Strategies',
    description: 'Discover premium trading bots and automated strategies for Deriv. Professional-grade tools for binary options and forex trading with proven results.',
    siteName: 'Deriv Bot Store',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Deriv Bot Store - Premium Trading Bots',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deriv Bot Store - Premium Trading Bots & Strategies',
    description: 'Discover premium trading bots and automated strategies for Deriv. Professional-grade tools for binary options and forex trading with proven results.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_VERIFICATION,
  },
  other: {
    'theme-color': '#16a34a',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#16a34a" />
        <meta name="msapplication-TileColor" content="#16a34a" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateWebsiteStructuredData())
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateOrganizationStructuredData())
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WebSocketProvider>
            <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900">
              {children}
            </div>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#1f2937',
                },
                success: {
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#ffffff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#ffffff',
                  },
                },
              }}
            />
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}