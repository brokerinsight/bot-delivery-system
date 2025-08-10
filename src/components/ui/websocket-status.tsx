'use client';

import { useState, useEffect } from 'react';
import { adminWebSocket } from '@/lib/websocket';

interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  reconnectAttempts: number;
  lastPongReceived: number;
  quality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

export function WebSocketStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    connecting: false,
    reconnectAttempts: 0,
    lastPongReceived: Date.now(),
    quality: 'disconnected'
  });

  useEffect(() => {
    const updateStatus = () => {
      setStatus(adminWebSocket.getConnectionStatus());
    };

    // Initial status
    updateStatus();

    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    // Listen for WebSocket events
    adminWebSocket.on('connect', updateStatus);
    adminWebSocket.on('disconnect', updateStatus);
    adminWebSocket.on('error', updateStatus);

    return () => {
      clearInterval(interval);
      adminWebSocket.off('connect', updateStatus);
      adminWebSocket.off('disconnect', updateStatus);
      adminWebSocket.off('error', updateStatus);
    };
  }, []);

  const getStatusColor = () => {
    if (status.connecting) return 'bg-yellow-500';
    
    switch (status.quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-green-400';
      case 'poor': return 'bg-orange-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    if (status.connecting) return 'Connecting...';
    
    switch (status.quality) {
      case 'excellent': return 'Connected';
      case 'good': return 'Connected (Good)';
      case 'poor': return 'Connected (Poor)';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  const handleForceReconnect = () => {
    adminWebSocket.forceReconnect();
  };

  const timeSinceLastPong = Date.now() - status.lastPongReceived;
  const showReconnectAttempts = status.reconnectAttempts > 0 || !status.connected;

  return (
    <div className="flex items-center space-x-3 text-sm">
      {/* Status Indicator */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${
          status.connecting ? 'animate-pulse' : ''
        }`} />
        <span className="text-gray-700 dark:text-gray-300">
          {getStatusText()}
        </span>
      </div>

      {/* Connection Quality Details */}
      {status.connected && (
        <div className="text-xs text-gray-500">
          Last ping: {Math.floor(timeSinceLastPong / 1000)}s ago
        </div>
      )}

      {/* Reconnection Info */}
      {showReconnectAttempts && status.reconnectAttempts > 0 && (
        <div className="text-xs text-orange-600">
          Attempts: {status.reconnectAttempts}
        </div>
      )}

      {/* Force Reconnect Button */}
      {(!status.connected || status.quality === 'poor') && (
        <button
          onClick={handleForceReconnect}
          className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          title="Force reconnection"
        >
          Reconnect
        </button>
      )}

      {/* Critical Warning for Payment Processing */}
      {!status.connected && (
        <div className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
          ⚠️ Real-time updates disabled
        </div>
      )}
    </div>
  );
}