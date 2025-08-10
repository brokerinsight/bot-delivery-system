'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  EyeIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Mock data - replace with API call
const mockOrders = [
  {
    id: 1,
    item: 'Advanced Martingale Bot',
    ref_code: 'REF001ABC',
    amount: 89.99,
    timestamp: '2024-01-20T10:30:00Z',
    status: 'confirmed',
    payment_method: 'mpesa_till',
    customer_email: 'john@example.com'
  },
  {
    id: 2,
    item: 'Fibonacci Trading Bot',
    ref_code: 'REF002XYZ',
    amount: 149.99,
    timestamp: '2024-01-20T09:15:00Z',
    status: 'pending',
    payment_method: 'crypto_nowpayments',
    customer_email: 'sarah@example.com'
  },
  {
    id: 3,
    item: 'RSI Strategy Bot',
    ref_code: 'REF003DEF',
    amount: 79.99,
    timestamp: '2024-01-20T08:45:00Z',
    status: 'confirmed',
    payment_method: 'mpesa_payhero',
    customer_email: 'mike@example.com'
  },
  {
    id: 4,
    item: 'Scalping Bot Pro',
    ref_code: 'REF004GHI',
    amount: 199.99,
    timestamp: '2024-01-20T07:20:00Z',
    status: 'no payment',
    payment_method: 'mpesa_till',
    customer_email: 'anna@example.com'
  },
  {
    id: 5,
    item: 'Moving Average Bot',
    ref_code: 'REF005JKL',
    amount: 69.99,
    timestamp: '2024-01-19T22:10:00Z',
    status: 'confirmed',
    payment_method: 'crypto_nowpayments',
    customer_email: 'david@example.com'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'pending':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'no payment':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    case 'partial payment':
      return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
    default:
      return 'text-secondary-600 bg-secondary-100 dark:text-secondary-400 dark:bg-secondary-900/30';
  }
};

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'mpesa_till':
      return 'M-Pesa Till';
    case 'mpesa_payhero':
      return 'M-Pesa STK';
    case 'crypto_nowpayments':
      return 'Crypto';
    default:
      return method;
  }
};

export function RecentOrders() {
  const [orders, setOrders] = useState(mockOrders);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200">
          Recent Orders
        </h2>
        <Link
          href="/admin/orders"
          className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors duration-200"
        >
          <span className="text-sm font-medium">View All</span>
          <ChevronRightIcon className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {orders.slice(0, 5).map((order, index) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="flex items-center justify-between p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-200"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="font-medium text-secondary-800 dark:text-secondary-200">
                  {order.item}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-secondary-600 dark:text-secondary-400">
                <span className="flex items-center space-x-1">
                  <span className="font-mono">{order.ref_code}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <CurrencyDollarIcon className="w-4 h-4" />
                  <span>${order.amount}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>{new Date(order.timestamp).toLocaleDateString()}</span>
                </span>
              </div>
              
              <div className="mt-2 text-xs text-secondary-500 dark:text-secondary-500">
                {getPaymentMethodLabel(order.payment_method)} • {order.customer_email}
              </div>
            </div>

            <button className="p-2 hover:bg-secondary-200 dark:hover:bg-secondary-600 rounded-lg transition-colors duration-200">
              <EyeIcon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
            </button>
          </motion.div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <CurrencyDollarIcon className="w-8 h-8 text-secondary-400" />
          </div>
          <p className="text-secondary-600 dark:text-secondary-400">No recent orders</p>
        </div>
      )}
    </motion.div>
  );
}