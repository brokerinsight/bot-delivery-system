import { useEffect, useState, useCallback } from 'react';

// Simple WebSocket implementation without socket.io dependency
// For production, consider installing socket.io-client for better features

interface AdminWebSocketEvents {
  new_order: (order: any) => void;
  order_updated: (order: any) => void;
  payment_confirmed: (order: any) => void;
  stats_updated: (stats: any) => void;
  custom_bot_order: (order: any) => void;
  admin_notification: (notification: { type: string; message: string; data?: any }) => void;
}

class AdminWebSocket {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws/admin`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('Admin WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Send auth token
          const token = localStorage.getItem('admin-session') || document.cookie
            .split('; ')
            .find(row => row.startsWith('admin-session='))
            ?.split('=')[1];
            
          if (token) {
            this.send('auth', { token });
          }
          
          resolve();
        };

        this.ws.onclose = () => {
          console.log('Admin WebSocket disconnected');
          this.isConnected = false;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('Admin WebSocket error:', error);
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Failed to connect to admin WebSocket'));
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectTimeout = setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.connect().catch(() => {
          // Reconnection failed, will try again
        });
      }, 1000 * Math.pow(2, this.reconnectAttempts)); // Exponential backoff
    }
  }

  private handleMessage(message: { type: string; data: any }) {
    const listeners = this.eventListeners.get(message.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(message.data);
        } catch (error) {
          console.error('Error in WebSocket event callback:', error);
        }
      });
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback?: Function) {
    if (callback) {
      this.eventListeners.get(event)?.delete(callback);
    } else {
      this.eventListeners.delete(event);
    }
  }

  send(type: string, data?: any) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

export const adminWebSocket = new AdminWebSocket();

// React hook for WebSocket connection
export function useAdminWebSocket() {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        setReconnecting(true);
        await adminWebSocket.connect();
        setConnected(true);
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setConnected(false);
      } finally {
        setReconnecting(false);
      }
    };

    connectWebSocket();

    // Listen for connection status changes
    const handleConnectionChange = () => {
      setConnected(adminWebSocket.getConnectionStatus().connected);
    };

    adminWebSocket.on('connect', handleConnectionChange);
    adminWebSocket.on('disconnect', handleConnectionChange);

    return () => {
      adminWebSocket.off('connect', handleConnectionChange);
      adminWebSocket.off('disconnect', handleConnectionChange);
      adminWebSocket.disconnect();
      setConnected(false);
    };
  }, []);

  return { connected, reconnecting, socket: adminWebSocket };
}

// Hook for real-time orders
export function useRealTimeOrders(onOrderUpdate: (order: any) => void) {
  const { connected } = useAdminWebSocket();

  useEffect(() => {
    if (!connected) return;

    const handleNewOrder = (order: any) => {
      console.log('New order received:', order);
      onOrderUpdate(order);
    };

    const handleOrderUpdate = (order: any) => {
      console.log('Order updated:', order);
      onOrderUpdate(order);
    };

    const handlePaymentConfirmed = (order: any) => {
      console.log('Payment confirmed:', order);
      onOrderUpdate(order);
    };

    adminWebSocket.on('new_order', handleNewOrder);
    adminWebSocket.on('order_updated', handleOrderUpdate);
    adminWebSocket.on('payment_confirmed', handlePaymentConfirmed);

    return () => {
      adminWebSocket.off('new_order', handleNewOrder);
      adminWebSocket.off('order_updated', handleOrderUpdate);
      adminWebSocket.off('payment_confirmed', handlePaymentConfirmed);
    };
  }, [connected, onOrderUpdate]);
}

// Hook for real-time stats
export function useRealTimeStats(onStatsUpdate: (stats: any) => void) {
  const { connected } = useAdminWebSocket();

  useEffect(() => {
    if (!connected) return;

    const handleStatsUpdate = (stats: any) => {
      console.log('Stats updated:', stats);
      onStatsUpdate(stats);
    };

    adminWebSocket.on('stats_updated', handleStatsUpdate);

    return () => {
      adminWebSocket.off('stats_updated', handleStatsUpdate);
    };
  }, [connected, onStatsUpdate]);
}