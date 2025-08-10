import { Metadata } from 'next';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminNavigation } from '@/components/admin/admin-navigation';
import { CustomBotOrdersHeader } from '@/components/admin/custom-bot-orders-header';
import { CustomBotOrdersStats } from '@/components/admin/custom-bot-orders-stats';
import { CustomBotOrdersTable } from '@/components/admin/custom-bot-orders-table';

export const metadata: Metadata = {
  title: 'Custom Bot Orders - Admin Panel',
  description: 'Manage custom bot orders and development requests',
  robots: {
    index: false,
    follow: false,
  },
};

interface CustomBotOrdersPageProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
    payment_status?: string;
    sort?: string;
  };
}

export default function CustomBotOrdersPage({ searchParams }: CustomBotOrdersPageProps) {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <AdminHeader />
      
      <div className="flex">
        <AdminNavigation />
        
        <main className="flex-1 lg:ml-64">
          <div className="p-6">
            {/* Header */}
            <CustomBotOrdersHeader searchParams={searchParams} />
            
            {/* Stats */}
            <CustomBotOrdersStats />
            
            {/* Orders Table */}
            <div className="mt-8">
              <CustomBotOrdersTable searchParams={searchParams} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}