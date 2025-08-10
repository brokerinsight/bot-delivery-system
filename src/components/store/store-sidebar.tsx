'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  FunnelIcon, 
  XMarkIcon,
  StarIcon,
  CurrencyDollarIcon 
} from '@heroicons/react/24/outline';

const categories = [
  { name: 'All Categories', value: '', count: 150 },
  { name: 'Martingale', value: 'martingale', count: 45 },
  { name: 'Scalping', value: 'scalping', count: 32 },
  { name: 'AI Trading', value: 'ai-trading', count: 28 },
  { name: 'Grid Trading', value: 'grid-trading', count: 22 },
  { name: 'Trend Following', value: 'trend-following', count: 18 },
  { name: 'Mean Reversion', value: 'mean-reversion', count: 15 },
];

const priceRanges = [
  { label: 'Under $100', min: 0, max: 100 },
  { label: '$100 - $200', min: 100, max: 200 },
  { label: '$200 - $300', min: 200, max: 300 },
  { label: '$300 - $500', min: 300, max: 500 },
  { label: 'Over $500', min: 500, max: 99999 },
];

const ratings = [
  { stars: 5, label: '5 Stars', count: 120 },
  { stars: 4, label: '4+ Stars', count: 95 },
  { stars: 3, label: '3+ Stars', count: 67 },
];

export function StoreSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    params.delete('page'); // Reset to first page
    router.push(`/store?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/store');
  };

  const currentCategory = searchParams.get('category') || '';
  const hasActiveFilters = Array.from(searchParams.keys()).some(key => 
    ['category', 'min_price', 'max_price', 'rating'].includes(key)
  );

  const sidebarContent = (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 flex items-center">
          <FunnelIcon className="w-5 h-5 mr-2" />
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="glass-card rounded-2xl p-4">
        <h4 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
          Categories
        </h4>
        <div className="space-y-2">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => updateFilter('category', category.value)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 flex items-center justify-between ${
                currentCategory === category.value
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-600 dark:text-secondary-400'
              }`}
            >
              <span>{category.name}</span>
              <span className="text-xs bg-secondary-200 dark:bg-secondary-700 px-2 py-1 rounded-full">
                {category.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="glass-card rounded-2xl p-4">
        <h4 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-4 flex items-center">
          <CurrencyDollarIcon className="w-4 h-4 mr-2" />
          Price Range
        </h4>
        <div className="space-y-2">
          {priceRanges.map((range) => (
            <button
              key={range.label}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('min_price', range.min.toString());
                params.set('max_price', range.max.toString());
                params.delete('page');
                router.push(`/store?${params.toString()}`);
              }}
              className="w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-600 dark:text-secondary-400"
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rating Filter */}
      <div className="glass-card rounded-2xl p-4">
        <h4 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-4 flex items-center">
          <StarIcon className="w-4 h-4 mr-2" />
          Rating
        </h4>
        <div className="space-y-2">
          {ratings.map((rating) => (
            <button
              key={rating.stars}
              onClick={() => updateFilter('rating', rating.stars.toString())}
              className="w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-600 dark:text-secondary-400 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      className={`w-4 h-4 ${
                        i < rating.stars
                          ? 'text-yellow-400 fill-current'
                          : 'text-secondary-300 dark:text-secondary-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-2">{rating.label}</span>
              </div>
              <span className="text-xs bg-secondary-200 dark:bg-secondary-700 px-2 py-1 rounded-full">
                {rating.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="glass-card rounded-2xl p-4">
        <h4 className="font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
          Features
        </h4>
        <div className="space-y-3">
          {[
            { id: 'new', label: 'New Releases', count: 12 },
            { id: 'bestseller', label: 'Best Sellers', count: 25 },
            { id: 'featured', label: 'Featured', count: 8 },
            { id: 'ai_powered', label: 'AI Powered', count: 15 },
          ].map((feature) => (
            <label key={feature.id} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                onChange={(e) => {
                  // Handle feature filter logic here
                }}
              />
              <div className="w-4 h-4 border-2 border-secondary-300 dark:border-secondary-600 rounded mr-3 flex items-center justify-center">
                <div className="w-2 h-2 bg-primary-600 rounded-sm opacity-0" />
              </div>
              <span className="text-secondary-600 dark:text-secondary-400 flex-1">
                {feature.label}
              </span>
              <span className="text-xs bg-secondary-200 dark:bg-secondary-700 px-2 py-1 rounded-full">
                {feature.count}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200"
        >
          <FunnelIcon className="w-4 h-4 mr-2" />
          Filters
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="relative w-80 max-w-sm bg-white dark:bg-secondary-900 h-full overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
                  Filters
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-lg transition-colors duration-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              {sidebarContent}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}