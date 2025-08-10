import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { verify } from 'jsonwebtoken';

interface AuthenticatedWebSocket extends WebSocket {
  isAuthenticated?: boolean;
  userId?: string;
}

export class AdminWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<AuthenticatedWebSocket> = new Set();

  initialize(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/api/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('[WebSocket] Admin WebSocket server initialized');
  }

  private verifyClient(info: { req: IncomingMessage }) {
    // Extract session/token from cookies or headers
    const cookies = this.parseCookies(info.req.headers.cookie || '');
    const sessionId = cookies['admin-session'];
    
    // Basic session validation (you can enhance this)
    return !!sessionId;
  }

  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.split('=').map(s => s.trim());
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    return cookies;
  }

  private handleConnection(ws: AuthenticatedWebSocket, req: IncomingMessage) {
    console.log('[WebSocket] New admin connection');
    
    ws.isAuthenticated = true; // Set after verification
    this.clients.add(ws);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('[WebSocket] Invalid message format:', error);
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Admin disconnected');
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.clients.delete(ws);
    });

    // Send initial connection success
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      timestamp: new Date().toISOString()
    }));
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: any) {
    const { type, data } = message;

    switch (type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
      
      case 'subscribe':
        // Handle subscription to specific data types
        this.handleSubscription(ws, data);
        break;
      
      default:
        console.log('[WebSocket] Unknown message type:', type);
    }
  }

  private handleSubscription(ws: AuthenticatedWebSocket, data: any) {
    const { channel } = data;
    
    // Send current data for the subscribed channel
    switch (channel) {
      case 'orders':
        this.sendOrdersUpdate(ws);
        break;
      case 'products':
        this.sendProductsUpdate(ws);
        break;
      case 'stats':
        this.sendStatsUpdate(ws);
        break;
    }
  }

  // Public methods to broadcast updates
  public broadcastOrderUpdate(orderData: any) {
    this.broadcast({
      type: 'orderUpdate',
      data: orderData,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastProductUpdate(productData: any) {
    this.broadcast({
      type: 'productUpdate', 
      data: productData,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastStatsUpdate(statsData: any) {
    this.broadcast({
      type: 'statsUpdate',
      data: statsData,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastCustomBotUpdate(customBotData: any) {
    this.broadcast({
      type: 'customBotUpdate',
      data: customBotData,
      timestamp: new Date().toISOString()
    });
  }

  private broadcast(message: any) {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.isAuthenticated) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('[WebSocket] Error sending message:', error);
          this.clients.delete(client);
        }
      }
    });
  }

  private async sendOrdersUpdate(ws: AuthenticatedWebSocket) {
    // Fetch current orders and send
    try {
      // This would fetch from your database
      ws.send(JSON.stringify({
        type: 'ordersData',
        data: [], // Replace with actual orders
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('[WebSocket] Error sending orders update:', error);
    }
  }

  private async sendProductsUpdate(ws: AuthenticatedWebSocket) {
    try {
      ws.send(JSON.stringify({
        type: 'productsData',
        data: [], // Replace with actual products
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('[WebSocket] Error sending products update:', error);
    }
  }

  private async sendStatsUpdate(ws: AuthenticatedWebSocket) {
    try {
      ws.send(JSON.stringify({
        type: 'statsData',
        data: {
          totalOrders: 0,
          totalRevenue: 0,
          totalProducts: 0,
          pendingOrders: 0
        },
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('[WebSocket] Error sending stats update:', error);
    }
  }

  public getClientCount(): number {
    return this.clients.size;
  }
}

// Singleton instance
export const adminWebSocket = new AdminWebSocketServer();