import { Metadata } from 'next';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminNavigation } from '@/components/admin/admin-navigation';
import { AdminContent } from '@/components/virus/admin-content';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Deriv Bot Store',
  description: 'Manage your trading bot store efficiently.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function VirusAdminDashboard() {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <AdminHeader />
      
      <div className="flex">
        {/* Sidebar Navigation */}
        <AdminNavigation />
        
        {/* Main Content */}
        <main className="flex-1 ml-64">
          <AdminContent />
        </main>
      </div>
    </div>
  );
}