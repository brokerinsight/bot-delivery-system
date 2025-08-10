import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import type { WebSocketMessage, OrderStatusUpdate, ProductUpdate } from '@/types';

interface WebSocketStore {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
  onOrderUpdate: (callback: (update: OrderStatusUpdate) => void) => void;
  onProductUpdate: (callback: (update: ProductUpdate) => void) => void;
  offOrderUpdate: () => void;
  offProductUpdate: () => void;
}

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || window.location.origin, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      set({ isConnected: false });
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  emit: (event: string, data: any) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  },

  onOrderUpdate: (callback: (update: OrderStatusUpdate) => void) => {
    const { socket } = get();
    if (socket) {
      socket.on('order:status_update', callback);
    }
  },

  onProductUpdate: (callback: (update: ProductUpdate) => void) => {
    const { socket } = get();
    if (socket) {
      socket.on('product:update', callback);
    }
  },

  offOrderUpdate: () => {
    const { socket } = get();
    if (socket) {
      socket.off('order:status_update');
    }
  },

  offProductUpdate: () => {
    const { socket } = get();
    if (socket) {
      socket.off('product:update');
    }
  },
}));

// Hook for order status updates
export const useOrderStatusUpdates = (refCode?: string) => {
  const { onOrderUpdate, offOrderUpdate } = useWebSocketStore();
  
  const subscribeToOrderUpdates = (callback: (update: OrderStatusUpdate) => void) => {
    onOrderUpdate((update) => {
      if (!refCode || update.refCode === refCode) {
        callback(update);
      }
    });
  };

  const unsubscribeFromOrderUpdates = () => {
    offOrderUpdate();
  };

  return { subscribeToOrderUpdates, unsubscribeFromOrderUpdates };
};

// Hook for product updates
export const useProductUpdates = () => {
  const { onProductUpdate, offProductUpdate } = useWebSocketStore();
  
  const subscribeToProductUpdates = (callback: (update: ProductUpdate) => void) => {
    onProductUpdate(callback);
  };

  const unsubscribeFromProductUpdates = () => {
    offProductUpdate();
  };

  return { subscribeToProductUpdates, unsubscribeFromProductUpdates };
};

// Real-time connection status
export const useConnectionStatus = () => {
  const isConnected = useWebSocketStore((state) => state.isConnected);
  return isConnected;
};

// Auto-connect hook
export const useAutoConnect = () => {
  const { connect, disconnect } = useWebSocketStore();
  
  const handleConnect = () => {
    if (typeof window !== 'undefined') {
      connect();
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return { connect: handleConnect, disconnect: handleDisconnect };
};