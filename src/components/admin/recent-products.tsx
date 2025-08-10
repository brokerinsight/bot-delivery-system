'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { 
  EyeIcon,
  PencilIcon,
  ChevronRightIcon,
  CubeIcon,
  TagIcon
} from '@heroicons/react/24/outline';

// Mock data - replace with API call
const mockProducts = [
  {
    item: 'ADV_MART_001',
    name: 'Advanced Martingale Bot',
    price: 89.99,
    category: 'Martingale',
    image: '/api/placeholder/80/80',
    isNew: true,
    isArchived: false,
    created_at: '2024-01-20T10:00:00Z'
  },
  {
    item: 'FIB_TRADE_002',
    name: 'Fibonacci Trading Bot',
    price: 149.99,
    category: 'Fibonacci',
    image: '/api/placeholder/80/80',
    isNew: false,
    isArchived: false,
    created_at: '2024-01-19T15:30:00Z'
  },
  {
    item: 'RSI_STRAT_003',
    name: 'RSI Strategy Bot',
    price: 79.99,
    category: 'Oscillator',
    image: '/api/placeholder/80/80',
    isNew: false,
    isArchived: false,
    created_at: '2024-01-18T09:20:00Z'
  },
  {
    item: 'SCALP_PRO_004',
    name: 'Scalping Bot Pro',
    price: 199.99,
    category: 'Scalping',
    image: '/api/placeholder/80/80',
    isNew: true,
    isArchived: false,
    created_at: '2024-01-17T14:45:00Z'
  },
  {
    item: 'MA_BOT_005',
    name: 'Moving Average Bot',
    price: 69.99,
    category: 'Moving Average',
    image: '/api/placeholder/80/80',
    isNew: false,
    isArchived: true,
    created_at: '2024-01-16T11:10:00Z'
  }
];

export function RecentProducts() {
  const [products, setProducts] = useState(mockProducts);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200">
          Recent Products
        </h2>
        <Link
          href="/admin/products"
          className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors duration-200"
        >
          <span className="text-sm font-medium">View All</span>
          <ChevronRightIcon className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {products.slice(0, 5).map((product, index) => (
          <motion.div
            key={product.item}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="flex items-center space-x-4 p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-200"
          >
            {/* Product Image */}
            <div className="w-16 h-16 bg-secondary-200 dark:bg-secondary-700 rounded-lg overflow-hidden flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <CubeIcon className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-secondary-800 dark:text-secondary-200 truncate">
                  {product.name}
                </h3>
                {product.isNew && (
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                    NEW
                  </span>
                )}
                {product.isArchived && (
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                    ARCHIVED
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-3 text-sm text-secondary-600 dark:text-secondary-400">
                <span className="font-mono text-xs">{product.item}</span>
                <span className="flex items-center space-x-1">
                  <TagIcon className="w-3 h-3" />
                  <span>{product.category}</span>
                </span>
                <span className="font-semibold">${product.price}</span>
              </div>
              
              <div className="mt-1 text-xs text-secondary-500 dark:text-secondary-500">
                Added {new Date(product.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button 
                className="p-2 hover:bg-secondary-200 dark:hover:bg-secondary-600 rounded-lg transition-colors duration-200"
                title="View Product"
              >
                <EyeIcon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              </button>
              <button 
                className="p-2 hover:bg-secondary-200 dark:hover:bg-secondary-600 rounded-lg transition-colors duration-200"
                title="Edit Product"
              >
                <PencilIcon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <CubeIcon className="w-8 h-8 text-secondary-400" />
          </div>
          <p className="text-secondary-600 dark:text-secondary-400">No products yet</p>
          <Link
            href="/admin/products"
            className="mt-2 inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
          >
            Add First Product
          </Link>
        </div>
      )}
    </motion.div>
  );
}