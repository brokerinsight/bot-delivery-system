'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export function StoreHeader() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.get('query') || '';
    setSearchQuery(query);
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    
    if (searchQuery.trim()) {
      params.set('query', searchQuery.trim());
    } else {
      params.delete('query');
    }
    
    params.delete('page'); // Reset to first page on new search
    router.push(`/store?${params.toString()}`);
  };

  return (
    <section className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-secondary-800 dark:to-secondary-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-800 dark:text-secondary-200 mb-4">
            Trading Bots <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">Store</span>
          </h1>
          <p className="text-lg text-secondary-600 dark:text-secondary-300 mb-8 max-w-3xl mx-auto">
            Discover premium automated trading strategies designed by professionals. 
            Find the perfect bot for your trading style and market preferences.
          </p>

          {/* Search Bar */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto"
          >
            <div className="relative glass-card rounded-2xl p-2">
              <div className="flex items-center">
                <MagnifyingGlassIcon className="w-5 h-5 text-secondary-400 ml-4 mr-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search trading bots, strategies, or categories..."
                  className="flex-1 bg-transparent border-none outline-none text-secondary-800 dark:text-secondary-200 placeholder-secondary-400 text-lg py-3"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold rounded-xl transition-all duration-300 mr-2"
                >
                  Search
                </button>
              </div>
            </div>
          </motion.form>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center space-x-8 mt-8 text-sm text-secondary-500 dark:text-secondary-400"
          >
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>150+ Active Bots</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span>95% Success Rate</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              <span>10K+ Downloads</span>
            </div>
          </motion.div>

          {/* Custom Bot Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-6"
          >
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-xl px-6 py-3">
              <span className="text-green-600 dark:text-green-400">🎯</span>
              <span className="text-sm text-secondary-700 dark:text-secondary-300">
                Can't find what you need?
              </span>
              <a
                href="/custom-bot"
                className="text-sm font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 underline underline-offset-2 transition-colors"
              >
                Request Custom Bot →
              </a>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}