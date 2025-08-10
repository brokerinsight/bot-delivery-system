'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Bars3Icon, 
  Squares2X2Icon, 
  AdjustmentsHorizontalIcon 
} from '@heroicons/react/24/outline';
import { SearchParams } from '@/types';

interface ProductFiltersProps {
  searchParams: SearchParams;
}

const sortOptions = [
  { value: '', label: 'Relevance' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
];

export function ProductFilters({ searchParams }: ProductFiltersProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();

  const updateSort = (sortValue: string) => {
    const params = new URLSearchParams(urlSearchParams);
    
    if (sortValue) {
      params.set('sort', sortValue);
    } else {
      params.delete('sort');
    }
    
    params.delete('page'); // Reset to first page
    router.push(`/store?${params.toString()}`);
  };

  const currentSort = searchParams.sort || '';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 p-4 glass-card rounded-2xl">
      {/* Results Info */}
      <div className="flex items-center space-x-4">
        <span className="text-secondary-600 dark:text-secondary-400">
          Showing <span className="font-semibold">1-12</span> of{' '}
          <span className="font-semibold">150</span> results
        </span>
        
        {/* Active Filters */}
        {(searchParams.query || searchParams.category) && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-secondary-500 dark:text-secondary-500">Filtered by:</span>
            {searchParams.query && (
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm rounded-full">
                "{searchParams.query}"
              </span>
            )}
            {searchParams.category && (
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm rounded-full">
                {searchParams.category}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-4">
        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={currentSort}
            onChange={(e) => updateSort(e.target.value)}
            className="appearance-none bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg px-4 py-2 pr-10 text-secondary-800 dark:text-secondary-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <AdjustmentsHorizontalIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400 pointer-events-none" />
        </div>

        {/* View Toggle */}
        <div className="hidden sm:flex items-center space-x-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
          <button
            className="p-2 rounded-md bg-white dark:bg-secondary-700 shadow-sm transition-colors duration-200"
            title="Grid View"
          >
            <Squares2X2Icon className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
          </button>
          <button
            className="p-2 rounded-md hover:bg-white dark:hover:bg-secondary-700 transition-colors duration-200"
            title="List View"
          >
            <Bars3Icon className="w-4 h-4 text-secondary-400 dark:text-secondary-500" />
          </button>
        </div>
      </div>
    </div>
  );
}