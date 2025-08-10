import { Suspense } from 'react';
import { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { EnhancedFooter } from '@/components/layout/enhanced-footer';
import { UrgentMessageModal } from '@/components/ui/urgent-message-modal';
import { StoreHeader } from '@/components/store/store-header';
import { ProductGrid } from '@/components/store/product-grid';
import { StoreSidebar } from '@/components/store/store-sidebar';
import { ProductFilters } from '@/components/store/product-filters';
import { SearchParams } from '@/types';

export const metadata: Metadata = {
  title: 'Trading Bots Store - Browse Premium Automated Strategies',
  description: 'Explore our extensive collection of premium trading bots for Deriv. Find the perfect automated strategy for binary options and forex trading.',
  keywords: ['trading bots store', 'deriv bots', 'automated trading', 'forex bots', 'binary options'],
};

interface StorePageProps {
  searchParams: SearchParams;
}

export default function StorePage({ searchParams }: StorePageProps) {
  return (
    <div className="min-h-screen">
      <Header />
      <UrgentMessageModal />
      
      <main className="pt-16">
        {/* Store Header */}
        <StoreHeader />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="sticky top-24">
                <StoreSidebar />
              </div>
            </aside>
            
            {/* Main Content */}
            <div className="flex-1">
              {/* Filters */}
              <ProductFilters searchParams={searchParams} />
              
              {/* Product Grid */}
              <Suspense fallback={<ProductGridSkeleton />}>
                <ProductGrid searchParams={searchParams} />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
      
      <EnhancedFooter />
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
          <div className="aspect-video bg-secondary-200 dark:bg-secondary-700 rounded-xl mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-3/4" />
            <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-full" />
            <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-2/3" />
            <div className="flex justify-between items-center pt-2">
              <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded w-20" />
              <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}