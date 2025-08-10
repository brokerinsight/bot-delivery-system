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
  private isConnecting = false;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Increased for critical payment scenarios
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private lastPongReceived = Date.now();

  connect(): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.isConnecting = true;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws/admin`;
        
        console.log(`[WebSocket] Connecting to ${wsUrl} (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        
        this.ws = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            console.error('[WebSocket] Connection timeout');
            this.ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 second timeout

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('[WebSocket] ✅ Admin WebSocket connected successfully');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.lastPongReceived = Date.now();
          
          // Send auth token
          const token = localStorage.getItem('admin-session') || document.cookie
            .split('; ')
            .find(row => row.startsWith('admin-session='))
            ?.split('=')[1];
            
          if (token) {
            this.send('auth', { token });
          }
          
          // Start heartbeat
          this.startHeartbeat();
          
          resolve();
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log(`[WebSocket] 🔌 Connection closed (code: ${event.code}, reason: ${event.reason})`);
          this.isConnected = false;
          this.isConnecting = false;
          this.stopHeartbeat();
          
          if (this.shouldReconnect) {
            this.attemptReconnect();
          }
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
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] ❌ Max reconnection attempts reached. WebSocket disabled.');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`[WebSocket] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectAttempts++;
      
      try {
        await this.connect();
        console.log('[WebSocket] ✅ Reconnection successful');
      } catch (error) {
        console.error('[WebSocket] ❌ Reconnection failed:', error);
        this.attemptReconnect(); // Try again
      }
    }, delay);
  }

  private handleMessage(message: { type: string; data: any }) {
    // Handle pong responses for heartbeat
    if (message.type === 'pong') {
      this.lastPongReceived = Date.now();
      if (this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
      }
      return;
    }

    const listeners = this.eventListeners.get(message.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(message.data);
        } catch (error) {
          console.error('[WebSocket] Error in event callback:', error);
        }
      });
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.isConnecting = false;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    
    // Send ping every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping', { timestamp: Date.now() });
        
        // Set timeout for pong response (10 seconds)
        this.heartbeatTimeout = setTimeout(() => {
          console.error('[WebSocket] ❌ Heartbeat timeout - connection appears dead');
          if (this.ws) {
            this.ws.close();
          }
        }, 10000);
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
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
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      lastPongReceived: this.lastPongReceived,
      quality: this.getConnectionQuality()
    };
  }

  public getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'disconnected' {
    if (!this.isConnected) return 'disconnected';
    
    const timeSinceLastPong = Date.now() - this.lastPongReceived;
    
    if (timeSinceLastPong < 35000) return 'excellent'; // Within expected heartbeat + buffer
    if (timeSinceLastPong < 60000) return 'good';      // Slight delay but acceptable
    return 'poor';                                      // Connection may be unstable
  }

  // Force reconnection (useful for manual recovery)
  forceReconnect() {
    console.log('[WebSocket] 🔄 Force reconnection requested');
    this.reconnectAttempts = 0; // Reset attempts
    this.disconnect();
    this.shouldReconnect = true;
    
    // Immediate reconnection attempt
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WebSocket] Force reconnection failed:', error);
      });
    }, 1000);
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

// Hook for connection status
export function useConnectionStatus() {
  const [status, setStatus] = useState(adminWebSocket.getConnectionStatus());

  useEffect(() => {
    const updateStatus = () => {
      setStatus(adminWebSocket.getConnectionStatus());
    };

    const interval = setInterval(updateStatus, 1000);
    
    adminWebSocket.on('connect', updateStatus);
    adminWebSocket.on('disconnect', updateStatus);

    return () => {
      clearInterval(interval);
      adminWebSocket.off('connect', updateStatus);
      adminWebSocket.off('disconnect', updateStatus);
    };
  }, []);

  return status;
}

// Hook for order status updates specifically
export function useOrderStatusUpdates(onUpdate: (order: any) => void) {
  const { connected } = useAdminWebSocket();

  useEffect(() => {
    if (!connected) return;

    adminWebSocket.on('order_updated', onUpdate);
    adminWebSocket.on('payment_confirmed', onUpdate);

    return () => {
      adminWebSocket.off('order_updated', onUpdate);
      adminWebSocket.off('payment_confirmed', onUpdate);
    };
  }, [connected, onUpdate]);
}

// Hook for auto-connection management
export function useAutoConnect() {
  const { connected, reconnecting } = useAdminWebSocket();

  const forceReconnect = useCallback(() => {
    adminWebSocket.forceReconnect();
  }, []);

  return {
    connected,
    reconnecting,
    forceReconnect,
    connectionQuality: connected ? adminWebSocket.getConnectionQuality() : 'disconnected'
  };
}