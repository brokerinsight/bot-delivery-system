'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOrderStatusUpdates } from '@/lib/websocket';
import { 
  EyeIcon, 
  PencilIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Mock data - replace with API calls
const mockOrders = Array.from({ length: 147 }, (_, i) => ({
  id: i + 1,
  item: `Bot ${String(i + 1).padStart(3, '0')}`,
  ref_code: `REF${String(i + 1).padStart(3, '0')}ABC`,
  amount: Math.floor(Math.random() * 200) + 50,
  timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  status: ['confirmed', 'pending', 'no payment', 'partial payment'][Math.floor(Math.random() * 4)],
  downloaded: Math.random() > 0.7,
  payment_method: ['mpesa_till', 'mpesa_payhero', 'crypto_nowpayments'][Math.floor(Math.random() * 3)],
  customer_email: `customer${i + 1}@example.com`,
  mpesa_receipt_number: Math.random() > 0.5 ? `REQ${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null,
  notes: Math.random() > 0.8 ? 'Customer requested refund' : null
}));

const ORDERS_PER_PAGE = 20;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'pending':
      return 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'no payment':
      return 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    case 'partial payment':
      return 'text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
    default:
      return 'text-secondary-700 bg-secondary-100 dark:text-secondary-400 dark:bg-secondary-800';
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

interface OrdersTableProps {
  currentPage: number;
  searchQuery: string;
  statusFilter: string;
  paymentMethodFilter: string;
  sortBy: string;
}

export function OrdersTable({
  currentPage,
  searchQuery,
  statusFilter,
  paymentMethodFilter,
  sortBy
}: OrdersTableProps) {
  const [orders, setOrders] = useState(mockOrders);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Listen for real-time order updates
  useOrderStatusUpdates((update) => {
    setOrders(prev => prev.map(order => 
      order.ref_code === update.ref_code 
        ? { ...order, status: update.status }
        : order
    ));
    toast.success(`Order ${update.ref_code} status updated to ${update.status}`);
  });

  // Filter and sort orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.ref_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesPaymentMethod = !paymentMethodFilter || order.payment_method === paymentMethodFilter;
    
    return matchesSearch && matchesStatus && matchesPaymentMethod;
  });

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      case 'oldest':
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      case 'amount_high':
        return b.amount - a.amount;
      case 'amount_low':
        return a.amount - b.amount;
      case 'ref_code':
        return a.ref_code.localeCompare(b.ref_code);
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedOrders.length / ORDERS_PER_PAGE);
  const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);

  const handleStatusUpdate = async (refCode: string, newStatus: string) => {
    setUpdatingStatus(refCode);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setOrders(prev => prev.map(order => 
        order.ref_code === refCode 
          ? { ...order, status: newStatus }
          : order
      ));
      
      toast.success(`Order ${refCode} updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const refreshOrders = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Orders refreshed');
    } catch (error) {
      toast.error('Failed to refresh orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass-card rounded-2xl overflow-hidden"
    >
      {/* Table Header */}
      <div className="p-6 border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-200">
            Orders ({filteredOrders.length})
          </h2>
          <button
            onClick={refreshOrders}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg transition-colors duration-200"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary-50 dark:bg-secondary-800">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Ref Code
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Downloaded
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-secondary-900 divide-y divide-secondary-200 dark:divide-secondary-700">
            {paginatedOrders.map((order, index) => (
              <motion.tr
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors duration-200"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                      {order.item}
                    </div>
                    <div className="text-sm text-secondary-500 dark:text-secondary-400">
                      {order.customer_email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-mono text-sm text-secondary-900 dark:text-secondary-100">
                    {order.ref_code}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-semibold text-secondary-900 dark:text-secondary-100">
                    ${order.amount}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-secondary-900 dark:text-secondary-100">
                    {new Date(order.timestamp).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-secondary-500 dark:text-secondary-400">
                    {new Date(order.timestamp).toLocaleTimeString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusUpdate(order.ref_code, e.target.value)}
                    disabled={updatingStatus === order.ref_code}
                    className={`px-3 py-1 text-xs font-medium rounded-full border-0 focus:ring-2 focus:ring-primary-500 ${getStatusColor(order.status)}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="no payment">No Payment</option>
                    <option value="partial payment">Partial Payment</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-secondary-900 dark:text-secondary-100">
                    {getPaymentMethodLabel(order.payment_method)}
                  </div>
                  {order.mpesa_receipt_number && (
                    <div className="text-xs text-secondary-500 dark:text-secondary-400 font-mono">
                      {order.mpesa_receipt_number}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    order.downloaded 
                      ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
                      : 'text-secondary-700 bg-secondary-100 dark:text-secondary-400 dark:bg-secondary-800'
                  }`}>
                    {order.downloaded ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-secondary-200 dark:hover:bg-secondary-700 rounded transition-colors duration-200">
                      <EyeIcon className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                    </button>
                    <button className="p-1 hover:bg-secondary-200 dark:hover:bg-secondary-700 rounded transition-colors duration-200">
                      <PencilIcon className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-secondary-600 dark:text-secondary-400">
              Showing {startIndex + 1} to {Math.min(startIndex + ORDERS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage === 1}
                className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
              >
                <ChevronLeftIcon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage > totalPages - 3) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors duration-200 ${
                        pageNum === currentPage
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-600 dark:text-secondary-400'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                disabled={currentPage === totalPages}
                className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
              >
                <ChevronRightIcon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {paginatedOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-secondary-400" />
          </div>
          <p className="text-secondary-600 dark:text-secondary-400">No orders found</p>
          <p className="text-sm text-secondary-500 dark:text-secondary-500 mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </motion.div>
  );
}