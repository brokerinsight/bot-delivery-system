import { Metadata } from 'next';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminNavigation } from '@/components/admin/admin-navigation';
import { OrdersTable } from '@/components/admin/orders-table';
import { OrdersHeader } from '@/components/admin/orders-header';
import { OrdersStats } from '@/components/admin/orders-stats';

export const metadata: Metadata = {
  title: 'Orders Management - Admin Panel',
  description: 'Manage customer orders and track payments.',
  robots: {
    index: false,
    follow: false,
  },
};

interface OrdersPageProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
    payment_method?: string;
    sort?: string;
  };
}

export default function OrdersPage({ searchParams }: OrdersPageProps) {
  const currentPage = parseInt(searchParams.page || '1');
  const searchQuery = searchParams.search || '';
  const statusFilter = searchParams.status || '';
  const paymentMethodFilter = searchParams.payment_method || '';
  const sortBy = searchParams.sort || 'newest';

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <AdminHeader />
      
      <div className="flex">
        <AdminNavigation />
        
        <main className="flex-1 ml-64 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <OrdersHeader />
            
            {/* Orders Stats */}
            <OrdersStats />
            
            {/* Orders Table */}
            <div className="mt-8">
              <OrdersTable
                currentPage={currentPage}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                paymentMethodFilter={paymentMethodFilter}
                sortBy={sortBy}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}