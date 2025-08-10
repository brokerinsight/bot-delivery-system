'use client';

import { useEffect } from 'react';
import { adminWebSocket } from '@/lib/websocket';

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  useEffect(() => {
    // Connect to WebSocket when component mounts
    adminWebSocket.connect();

    // Cleanup on unmount
    return () => {
      adminWebSocket.disconnect();
    };
  }, []);

  return <>{children}</>;
}