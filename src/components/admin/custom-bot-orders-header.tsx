'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

interface CustomBotOrdersHeaderProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
    payment_status?: string;
    sort?: string;
  };
}

export function CustomBotOrdersHeader({ searchParams }: CustomBotOrdersHeaderProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.search || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(currentSearchParams);
    
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    } else {
      params.delete('search');
    }
    
    params.delete('page'); // Reset to first page on new search
    router.push(`/admin/custom-bots?${params.toString()}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    params.delete('page'); // Reset to first page on filter change
    router.push(`/admin/custom-bots?${params.toString()}`);
  };

  const clearAllFilters = () => {
    router.push('/admin/custom-bots');
  };

  const hasActiveFilters = searchParams.search || 
    (searchParams.status && searchParams.status !== 'all') ||
    (searchParams.payment_status && searchParams.payment_status !== 'all') ||
    (searchParams.sort && searchParams.sort !== 'newest');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            Custom Bot Orders
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            Manage custom bot development requests and orders
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors">
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-secondary-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg leading-5 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 focus:outline-none focus:placeholder-secondary-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Search by email, tracking number, or order ID..."
            />
          </div>
        </form>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          {/* Status Filter */}
          <select
            value={searchParams.status || 'all'}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="border border-secondary-300 dark:border-secondary-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={searchParams.payment_status || 'all'}
            onChange={(e) => handleFilterChange('payment_status', e.target.value)}
            className="border border-secondary-300 dark:border-secondary-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Payments</option>
            <option value="pending">Payment Pending</option>
            <option value="paid">Payment Confirmed</option>
            <option value="failed">Payment Failed</option>
          </select>

          {/* Sort */}
          <select
            value={searchParams.sort || 'newest'}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="border border-secondary-300 dark:border-secondary-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount_high">Highest Amount</option>
            <option value="amount_low">Lowest Amount</option>
            <option value="status">By Status</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4 mr-1" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center space-x-2 text-sm">
          <FunnelIcon className="w-4 h-4 text-secondary-500" />
          <span className="text-secondary-600 dark:text-secondary-400">Active filters:</span>
          {searchParams.search && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200">
              Search: {searchParams.search}
            </span>
          )}
          {searchParams.status && searchParams.status !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
              Status: {searchParams.status}
            </span>
          )}
          {searchParams.payment_status && searchParams.payment_status !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
              Payment: {searchParams.payment_status}
            </span>
          )}
        </div>
      )}
    </div>
  );
}