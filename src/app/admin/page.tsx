import { Metadata } from 'next';
import { AdminHeader } from '@/components/admin/admin-header';
import { DashboardStats } from '@/components/admin/dashboard-stats';
import { RecentOrders } from '@/components/admin/recent-orders';
import { RecentProducts } from '@/components/admin/recent-products';
import { AdminNavigation } from '@/components/admin/admin-navigation';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Deriv Bot Store',
  description: 'Manage your trading bot store efficiently.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <AdminHeader />
      
      <div className="flex">
        {/* Sidebar Navigation */}
        <AdminNavigation />
        
        {/* Main Content */}
        <main className="flex-1 ml-64 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">
                Dashboard Overview
              </h1>
              <p className="text-secondary-600 dark:text-secondary-400">
                Welcome back! Here's what's happening with your store today.
              </p>
            </div>

            {/* Dashboard Stats */}
            <DashboardStats />

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {/* Recent Orders */}
              <RecentOrders />
              
              {/* Recent Products */}
              <RecentProducts />
            </div>

            {/* Performance Charts */}
            <div className="mt-8">
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200 mb-6">
                  Sales Performance
                </h2>
                <div className="h-64 bg-secondary-100 dark:bg-secondary-800 rounded-xl flex items-center justify-center">
                  <p className="text-secondary-500 dark:text-secondary-500">
                    Chart component would go here (Chart.js or similar)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}