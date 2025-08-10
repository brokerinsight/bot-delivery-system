'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RefreshIcon, WifiIcon } from '@heroicons/react/24/outline';
import { useRealTimeOrders, useAdminWebSocket } from '@/lib/websocket';

interface OrdersSectionProps {
  data: any;
  onDataUpdate: (updates: any) => void;
  onFetchOrders: () => Promise<void>;
}

interface Order {
  id: number;
  item: string;
  ref_code: string;
  amount: number;
  status: string;
  downloaded: boolean;
  payment_method: string;
  timestamp: string;
  created_at: string;
  notes?: string;
}

export function OrdersSection({ data, onDataUpdate, onFetchOrders }: OrdersSectionProps) {
  const [orders, setOrders] = useState<Order[]>(data.orders || []);
  const [loading, setLoading] = useState(false);
  const { connected, reconnecting } = useAdminWebSocket();

  useEffect(() => {
    setOrders(data.orders || []);
  }, [data.orders]);

  // Real-time order updates via WebSocket
  useRealTimeOrders((updatedOrder) => {
    setOrders(prevOrders => {
      const existingIndex = prevOrders.findIndex(
        order => order.ref_code === updatedOrder.ref_code && order.item === updatedOrder.item
      );
      
      if (existingIndex >= 0) {
        // Update existing order
        const newOrders = [...prevOrders];
        newOrders[existingIndex] = { ...newOrders[existingIndex], ...updatedOrder };
        onDataUpdate({ orders: newOrders });
        return newOrders;
      } else {
        // Add new order
        const newOrders = [updatedOrder, ...prevOrders];
        onDataUpdate({ orders: newOrders });
        return newOrders;
      }
    });
    
    // Show notification for new orders
    if (!orders.find(o => o.ref_code === updatedOrder.ref_code && o.item === updatedOrder.item)) {
      toast.success(`New order received: ${updatedOrder.ref_code}`, {
        duration: 4000,
        icon: '🎉'
      });
    }
  });

  const updateOrderStatus = async (refCode: string, item: string, newStatus: string) => {
    try {
      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          refCode, 
          item, 
          status: newStatus 
        }),
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        // Update local orders
        const updatedOrders = orders.map(order => 
          order.ref_code === refCode && order.item === item
            ? { ...order, status: newStatus }
            : order
        );
        setOrders(updatedOrders);
        onDataUpdate({ orders: updatedOrders });
        
        toast.success(`Order status updated to "${newStatus}"`);
        
        // Refresh orders to get latest data
        await onFetchOrders();
      } else {
        toast.error(result.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const refreshOrders = async () => {
    setLoading(true);
    try {
      await onFetchOrders();
      toast.success('Orders refreshed');
    } catch (error) {
      toast.error('Failed to refresh orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'confirmed_server_stk':
      case 'confirmed_nowpayments':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'pending_stk_push':
      case 'pending_nowpayments':
        return 'text-yellow-600 bg-yellow-100';
      case 'no payment':
      case 'failed_stk_initiation':
      case 'failed_stk_cb_timeout':
      case 'failed_amount_mismatch':
      case 'failed_nowpayments':
        return 'text-red-600 bg-red-100';
      case 'partial payment':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const sortedOrders = orders.sort((a, b) => 
    new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime()
  );

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-secondary-800 dark:text-secondary-200 mb-2">
              Manage Orders
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400">
              View and manage all customer orders.
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
              onClick={refreshOrders}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Manual Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Orders Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Orders</h3>
          <p className="text-3xl font-bold text-blue-600">{orders.length}</p>
        </div>
        
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmed</h3>
          <p className="text-3xl font-bold text-green-600">
            {orders.filter(o => o.status.includes('confirmed')).length}
          </p>
        </div>
        
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {orders.filter(o => o.status.includes('pending')).length}
          </p>
        </div>
        
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Downloaded</h3>
          <p className="text-3xl font-bold text-purple-600">
            {orders.filter(o => o.downloaded).length}
          </p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Orders ({sortedOrders.length})
        </h3>
        
        {sortedOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No orders found</p>
            <p className="text-gray-400">Orders will appear here when customers make purchases</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-medium text-gray-700">Item</th>
                  <th className="text-left p-3 font-medium text-gray-700">Ref Code</th>
                  <th className="text-left p-3 font-medium text-gray-700">Amount</th>
                  <th className="text-left p-3 font-medium text-gray-700">Status</th>
                  <th className="text-left p-3 font-medium text-gray-700">Downloaded</th>
                  <th className="text-left p-3 font-medium text-gray-700">Payment Method</th>
                  <th className="text-left p-3 font-medium text-gray-700">Date</th>
                  <th className="text-left p-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((order) => (
                  <tr key={`${order.ref_code}-${order.item}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <span className="font-medium text-gray-900">{order.item}</span>
                    </td>
                    
                    <td className="p-3">
                      <span className="font-mono text-sm text-gray-600">{order.ref_code}</span>
                    </td>
                    
                    <td className="p-3">
                      <span className="font-semibold text-green-600">
                        KES {parseFloat(order.amount.toString()).toFixed(2)}
                      </span>
                    </td>
                    
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.downloaded 
                          ? 'text-green-600 bg-green-100' 
                          : 'text-gray-600 bg-gray-100'
                      }`}>
                        {order.downloaded ? 'Yes' : 'No'}
                      </span>
                    </td>
                    
                    <td className="p-3">
                      <span className="text-sm text-gray-600 capitalize">
                        {order.payment_method?.replace('_', ' ') || 'mpesa till'}
                      </span>
                    </td>
                    
                    <td className="p-3">
                      <span className="text-sm text-gray-600">
                        {formatDate(order.created_at || order.timestamp)}
                      </span>
                    </td>
                    
                    <td className="p-3">
                      <select
                        className="text-sm border rounded p-1 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            updateOrderStatus(order.ref_code, order.item, e.target.value);
                            e.target.value = ''; // Reset select
                          }
                        }}
                      >
                        <option value="" disabled>Update Status</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="confirmed_server_stk">Confirmed STK</option>
                        <option value="no payment">No Payment</option>
                        <option value="partial payment">Partial Payment</option>
                        <option value="pending">Pending</option>
                        <option value="failed_amount_mismatch">Failed - Amount Mismatch</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}