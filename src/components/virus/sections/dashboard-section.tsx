'use client';

import { DashboardStats } from '@/components/admin/dashboard-stats';
import { RecentOrders } from '@/components/admin/recent-orders';
import { RecentProducts } from '@/components/admin/recent-products';

interface DashboardSectionProps {
  data: any;
  onDataUpdate: (updates: any) => void;
  onRefresh: () => void;
}

export function DashboardSection({ data, onDataUpdate, onRefresh }: DashboardSectionProps) {
  return (
    <div>
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
  );
}