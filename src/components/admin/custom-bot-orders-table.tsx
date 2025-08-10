'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ClipboardDocumentCheckIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CustomBotOrder } from '@/types';
import toast from 'react-hot-toast';

interface CustomBotOrdersTableProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
    payment_status?: string;
    sort?: string;
  };
}

// Mock data - in production, fetch from API
const mockOrders: CustomBotOrder[] = [
  {
    id: 1,
    tracking_number: 'CB1704567890ABC1',
    client_email: 'john.doe@example.com',
    bot_description: 'I need a martingale bot that doubles the stake after each loss. Should have RSI indicator with levels at 30/70. When RSI is below 30, place a buy order.',
    bot_features: 'Martingale strategy, RSI indicator, stop-loss after 3 consecutive losses, auto-restart feature',
    budget_amount: 75,
    payment_method: 'mpesa',
    refund_method: 'mpesa',
    refund_mpesa_number: '254712345678',
    refund_mpesa_name: 'John Doe',
    status: 'pending',
    payment_status: 'paid',
    ref_code: 'ABC123DEF456',
    mpesa_receipt_number: 'QHH7XYZ123',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T11:00:00Z'
  },
  {
    id: 2,
    tracking_number: 'CB1704567890ABC2',
    client_email: 'sarah.wilson@example.com',
    bot_description: 'Need a scalping bot for binary options using moving averages. Should trade every 1-minute candle with quick entry/exit.',
    bot_features: 'Moving average crossover, 1-minute scalping, risk management, profit target settings',
    budget_amount: 120,
    payment_method: 'crypto',
    refund_method: 'crypto',
    refund_crypto_wallet: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    refund_crypto_network: 'Bitcoin (BTC)',
    status: 'completed',
    payment_status: 'paid',
    ref_code: 'XYZ789GHI012',
    payment_id: 'CRYPTO_1704567890123',
    created_at: '2024-01-14T08:15:00Z',
    updated_at: '2024-01-14T20:45:00Z',
    completed_at: '2024-01-14T20:45:00Z'
  }
];

const refundReasons = [
  'Bot requirements too complex',
  'Insufficient budget provided',
  'Technical limitations',
  'Customer request',
  'Payment processing failed',
  'Duplicate order',
  'Policy violation',
  'Other'
];

export function CustomBotOrdersTable({ searchParams }: CustomBotOrdersTableProps) {
  const [orders, setOrders] = useState<CustomBotOrder[]>(mockOrders);
  const [selectedOrder, setSelectedOrder] = useState<CustomBotOrder | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [customRefundMessage, setCustomRefundMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Pagination
  const page = parseInt(searchParams.page || '1');
  const itemsPerPage = 20;
  const totalItems = orders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = orders.slice(startIndex, endIndex);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const updateOrderStatus = async (orderId: number, status: 'pending' | 'completed' | 'refunded') => {
    setIsProcessing(true);
    
    try {
      // In production, call your API
      // const response = await fetch(`/api/admin/custom-bot-orders/${orderId}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status })
      // });

      // Mock update
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                status, 
                updated_at: new Date().toISOString(),
                completed_at: status === 'completed' ? new Date().toISOString() : order.completed_at,
                refunded_at: status === 'refunded' ? new Date().toISOString() : order.refunded_at
              }
            : order
        )
      );

      toast.success(`Order status updated to ${status}`);
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedOrder || !refundReason) {
      toast.error('Please select a refund reason');
      return;
    }

    setIsProcessing(true);

    try {
      // In production, call your API
      // const response = await fetch(`/api/admin/custom-bot-orders/${selectedOrder.id}/refund`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ reason: refundReason, custom_message: customRefundMessage })
      // });

      // Mock refund
      await updateOrderStatus(selectedOrder.id, 'refunded');
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === selectedOrder.id 
            ? { 
                ...order, 
                refund_reason: refundReason,
                custom_refund_message: customRefundMessage || undefined
              }
            : order
        )
      );

      setShowRefundModal(false);
      setRefundReason('');
      setCustomRefundMessage('');
      setSelectedOrder(null);
      
      toast.success('Refund processed successfully');
    } catch (error) {
      toast.error('Failed to process refund');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string, paymentStatus?: string) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          Completed
        </span>
      );
    }
    
    if (status === 'refunded') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200">
          <XCircleIcon className="w-3 h-3 mr-1" />
          Refunded
        </span>
      );
    }

    if (paymentStatus === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
          <ClockIcon className="w-3 h-3 mr-1" />
          Payment Pending
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
        <ClockIcon className="w-3 h-3 mr-1" />
        In Development
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
            <thead className="bg-secondary-50 dark:bg-secondary-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                  Amount & Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
              {currentOrders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50"
                >
                  {/* Order Details */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-secondary-900 dark:text-secondary-100 font-mono">
                          {order.tracking_number}
                        </span>
                        <button
                          onClick={() => copyToClipboard(order.tracking_number, 'Tracking number')}
                          className="text-secondary-400 hover:text-primary-600 transition-colors"
                        >
                          <ClipboardDocumentCheckIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-secondary-500 dark:text-secondary-400 font-mono">
                        {order.ref_code}
                      </div>
                      <div className="text-xs text-secondary-600 dark:text-secondary-400 max-w-xs truncate">
                        {order.bot_description}
                      </div>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-secondary-900 dark:text-secondary-100">
                        {order.client_email}
                      </span>
                      <button
                        onClick={() => copyToClipboard(order.client_email, 'Email')}
                        className="text-secondary-400 hover:text-primary-600 transition-colors"
                      >
                        <ClipboardDocumentCheckIcon className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Refund Info */}
                    <div className="mt-2 text-xs text-secondary-500 dark:text-secondary-400">
                      <div className="font-medium">Refund: {order.refund_method === 'mpesa' ? 'M-Pesa' : 'Crypto'}</div>
                      {order.refund_method === 'mpesa' ? (
                        <div className="flex items-center space-x-1">
                          <span>{order.refund_mpesa_number}</span>
                          <button
                            onClick={() => copyToClipboard(order.refund_mpesa_number!, 'M-Pesa number')}
                            className="text-secondary-400 hover:text-primary-600 transition-colors"
                          >
                            <ClipboardDocumentCheckIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <span className="truncate max-w-[100px]">
                            {order.refund_crypto_wallet?.substring(0, 8)}...
                          </span>
                          <button
                            onClick={() => copyToClipboard(order.refund_crypto_wallet!, 'Wallet address')}
                            className="text-secondary-400 hover:text-primary-600 transition-colors"
                          >
                            <ClipboardDocumentCheckIcon className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Amount & Payment */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                        ${order.budget_amount}
                      </div>
                      <div className="text-xs text-secondary-500 dark:text-secondary-400">
                        {order.payment_method === 'mpesa' ? 'M-Pesa' : 'Crypto'}
                      </div>
                      {order.mpesa_receipt_number && (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-mono text-secondary-600 dark:text-secondary-400">
                            {order.mpesa_receipt_number}
                          </span>
                          <button
                            onClick={() => copyToClipboard(order.mpesa_receipt_number!, 'Receipt number')}
                            className="text-secondary-400 hover:text-primary-600 transition-colors"
                          >
                            <ClipboardDocumentCheckIcon className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      {getStatusBadge(order.status, order.payment_status)}
                      
                      {/* Status Switch */}
                      {order.payment_status === 'paid' && order.status === 'pending' && (
                        <div className="space-y-1">
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            disabled={isProcessing}
                            className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
                          >
                            Mark Complete
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowRefundModal(true);
                            }}
                            disabled={isProcessing}
                            className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 ml-1"
                          >
                            Refund
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Created */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 dark:text-secondary-400">
                    {formatDate(order.created_at)}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <a
                        href={`mailto:${order.client_email}`}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        <EnvelopeIcon className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-secondary-800 px-4 py-3 flex items-center justify-between border-t border-secondary-200 dark:border-secondary-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                disabled={page <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-secondary-300 dark:border-secondary-600 text-sm font-medium rounded-md text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-secondary-300 dark:border-secondary-600 text-sm font-medium rounded-md text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-secondary-700 dark:text-secondary-300">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
                  <span className="font-medium">{totalItems}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    disabled={page <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm font-medium text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === page
                          ? 'z-10 bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    disabled={page >= totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm font-medium text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Refund Modal */}
      {showRefundModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
              Process Refund
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Order: {selectedOrder.tracking_number}
                </label>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Amount: ${selectedOrder.budget_amount} • Customer: {selectedOrder.client_email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Refund Reason *
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select reason...</option>
                  {refundReasons.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Custom Message (Optional)
                </label>
                <textarea
                  value={customRefundMessage}
                  onChange={(e) => setCustomRefundMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Additional message to send to customer..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundReason('');
                    setCustomRefundMessage('');
                    setSelectedOrder(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefund}
                  disabled={!refundReason || isProcessing}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Process Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}