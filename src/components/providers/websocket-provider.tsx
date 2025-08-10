'use client';

import { useEffect } from 'react';
import { useAutoConnect } from '@/lib/websocket';

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { connect, disconnect } = useAutoConnect();

  useEffect(() => {
    // Connect to WebSocket when component mounts
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return <>{children}</>;
}