'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  ClipboardDocumentIcon, 
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import { useRealTimeOrders, useAdminWebSocket } from '@/lib/websocket';

interface CustomBotOrder {
  id: number;
  ref_code: string;
  client_email: string;
  bot_logic: string;
  features: string | null;
  budget_amount: number;
  status: 'pending' | 'completed' | 'refunded';
  payment_status: 'pending' | 'confirmed' | 'failed';
  refund_method: 'mpesa' | 'crypto';
  refund_details: any;
  tracking_number: string;
  created_at: string;
  updated_at: string;
}

interface RefundReason {
  id: number;
  reason: string;
  description: string;
}

interface CustomBotsSectionProps {
  data: any;
  onDataUpdate: (data: any) => void;
}

export function CustomBotsSection({ data, onDataUpdate }: CustomBotsSectionProps) {
  const [customBotOrders, setCustomBotOrders] = useState<CustomBotOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CustomBotOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [customRefundMessage, setCustomRefundMessage] = useState('');
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  const { connected, reconnecting } = useAdminWebSocket();

  const refundReasons = [
    { id: 1, reason: 'technically_impossible', description: 'Trading strategy is technically impossible to implement' },
    { id: 2, reason: 'platform_limitations', description: 'Platform limitations prevent implementation' },
    { id: 3, reason: 'insufficient_details', description: 'Insufficient strategy details provided' },
    { id: 4, reason: 'client_request', description: 'Client requested refund' },
    { id: 5, reason: 'other', description: 'Other reason (specify below)' }
  ];

  useEffect(() => {
    fetchCustomBotOrders();
  }, []);

  // Real-time updates for custom bot orders
  useRealTimeOrders((updatedOrder) => {
    if (updatedOrder.type === 'custom_bot') {
      setCustomBotOrders(prevOrders => {
        const existingIndex = prevOrders.findIndex(order => order.ref_code === updatedOrder.ref_code);
        
        if (existingIndex >= 0) {
          const newOrders = [...prevOrders];
          newOrders[existingIndex] = { ...newOrders[existingIndex], ...updatedOrder };
          return newOrders;
        } else {
          return [updatedOrder, ...prevOrders];
        }
      });
      
      toast.success(`New custom bot order: ${updatedOrder.ref_code}`, {
        duration: 4000,
        icon: '🤖'
      });
    }
  });

  const fetchCustomBotOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/custom-bot/orders');
      const result = await response.json();
      
      if (result.success) {
        setCustomBotOrders(result.data || []);
      } else {
        toast.error('Failed to fetch custom bot orders');
      }
    } catch (error) {
      console.error('Error fetching custom bot orders:', error);
      toast.error('Failed to fetch custom bot orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: 'completed' | 'refunded') => {
    setProcessingOrderId(orderId);
    try {
      const payload: any = { orderId, status: newStatus };
      
      if (newStatus === 'refunded') {
        if (!refundReason) {
          toast.error('Please select a refund reason');
          return;
        }
        payload.refundReason = refundReason;
        payload.customMessage = customRefundMessage;
      }

      const response = await fetch('/api/custom-bot/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Order ${newStatus === 'completed' ? 'completed' : 'refunded'} successfully`);
        
        // Update local state
        setCustomBotOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
        
        setShowRefundModal(false);
        setRefundReason('');
        setCustomRefundMessage('');
        setSelectedOrder(null);
      } else {
        throw new Error(result.error || 'Failed to update order status');
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error(error.message || 'Failed to update order status');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const getStatusColor = (status: string, paymentStatus?: string) => {
    if (paymentStatus === 'pending') return 'text-yellow-600 bg-yellow-100';
    
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'refunded':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string, paymentStatus?: string) => {
    if (paymentStatus === 'pending') return <ClockIcon className="w-4 h-4" />;
    
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'refunded':
        return <XCircleIcon className="w-4 h-4" />;
      case 'pending':
        return <ClockIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const formatRefundDetails = (refundMethod: string, refundDetails: any) => {
    if (!refundDetails) return 'Not provided';
    
    if (refundMethod === 'mpesa') {
      return `${refundDetails.mpesaName} - ${refundDetails.mpesaNumber}`;
    } else {
      return `${refundDetails.cryptoNetwork}: ${refundDetails.cryptoWallet}`;
    }
  };

  const stats = {
    total: customBotOrders.length,
    pending: customBotOrders.filter(o => o.status === 'pending' && o.payment_status === 'confirmed').length,
    completed: customBotOrders.filter(o => o.status === 'completed').length,
    refunded: customBotOrders.filter(o => o.status === 'refunded').length,
    totalRevenue: customBotOrders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.budget_amount, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Custom Bot Orders
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage custom bot development requests
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <WifiIcon className={`w-4 h-4 ${connected ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {reconnecting ? 'Connecting...' : connected ? 'Live Updates' : 'Disconnected'}
            </span>
          </div>
          
          <button
            onClick={fetchCustomBotOrders}
            disabled={loading}
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Orders</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600">{stats.refunded}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Refunded</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Revenue</div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {customBotOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {order.ref_code}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {order.tracking_number}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {order.client_email}
                      </div>
                      <button
                        onClick={() => copyToClipboard(order.client_email, 'Email')}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      ${order.budget_amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status, order.payment_status)}`}>
                        {getStatusIcon(order.status, order.payment_status)}
                        {order.payment_status === 'pending' ? 'Payment Pending' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      
                      {order.payment_status === 'confirmed' && order.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            disabled={processingOrderId === order.id}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                            title="Mark as Completed"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowRefundModal(true);
                            }}
                            disabled={processingOrderId === order.id}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                            title="Issue Refund"
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {customBotOrders.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No custom bot orders found
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Order Details: {selectedOrder.ref_code}
                </h3>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tracking Number
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {selectedOrder.tracking_number}
                      </span>
                      <button
                        onClick={() => copyToClipboard(selectedOrder.tracking_number, 'Tracking Number')}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Budget
                    </label>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      ${selectedOrder.budget_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bot Logic & Strategy
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm text-gray-900 dark:text-gray-100 max-h-40 overflow-y-auto">
                    {selectedOrder.bot_logic}
                  </div>
                </div>
                
                {selectedOrder.features && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Additional Features
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm text-gray-900 dark:text-gray-100">
                      {selectedOrder.features}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Refund Details
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                      <strong>Method:</strong> {selectedOrder.refund_method.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <strong>Details:</strong> {formatRefundDetails(selectedOrder.refund_method, selectedOrder.refund_details)}
                      <button
                        onClick={() => copyToClipboard(formatRefundDetails(selectedOrder.refund_method, selectedOrder.refund_details), 'Refund Details')}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Issue Refund
                </h3>
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundReason('');
                    setCustomRefundMessage('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Refund Reason *
                  </label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    required
                  >
                    <option value="">Select a reason...</option>
                    {refundReasons.map(reason => (
                      <option key={reason.id} value={reason.reason}>
                        {reason.description}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Message (Optional)
                  </label>
                  <textarea
                    value={customRefundMessage}
                    onChange={(e) => setCustomRefundMessage(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    rows={3}
                    placeholder="Additional details for the client..."
                  />
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    This will send an email to the client with refund details and process the refund to their selected method.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRefundModal(false);
                      setRefundReason('');
                      setCustomRefundMessage('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'refunded')}
                    disabled={!refundReason || processingOrderId === selectedOrder.id}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingOrderId === selectedOrder.id ? 'Processing...' : 'Issue Refund'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}