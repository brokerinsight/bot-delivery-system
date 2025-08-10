'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';

export function OrdersHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    params.set('page', '1'); // Reset to first page
    router.push(`/admin/orders?${params.toString()}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset to first page
    router.push(`/admin/orders?${params.toString()}`);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">
            Orders Management
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            Monitor and manage customer orders in real-time
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card rounded-2xl p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search orders, ref codes, emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </form>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={searchParams.get('status') || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="no payment">No Payment</option>
              <option value="partial payment">Partial Payment</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={searchParams.get('payment_method') || ''}
              onChange={(e) => handleFilterChange('payment_method', e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Payment Methods</option>
              <option value="mpesa_till">M-Pesa Till</option>
              <option value="mpesa_payhero">M-Pesa STK</option>
              <option value="crypto_nowpayments">Crypto</option>
            </select>
          </div>
        </div>

        {/* Sort Options */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <ArrowsUpDownIcon className="w-5 h-5 text-secondary-500" />
            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Sort by:</span>
          </div>
          <select
            value={searchParams.get('sort') || 'newest'}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="px-3 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount_high">Amount (High to Low)</option>
            <option value="amount_low">Amount (Low to High)</option>
            <option value="ref_code">Ref Code</option>
          </select>
        </div>

        {/* Active Filters */}
        {(searchParams.get('search') || searchParams.get('status') || searchParams.get('payment_method')) && (
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Active filters:</span>
            {searchParams.get('search') && (
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm rounded-full">
                Search: "{searchParams.get('search')}"
              </span>
            )}
            {searchParams.get('status') && (
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm rounded-full">
                Status: {searchParams.get('status')}
              </span>
            )}
            {searchParams.get('payment_method') && (
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm rounded-full">
                Payment: {searchParams.get('payment_method')}
              </span>
            )}
            <button
              onClick={() => router.push('/admin/orders')}
              className="px-3 py-1 bg-secondary-200 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 text-sm rounded-full hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors duration-200"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}