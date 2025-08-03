const { Redis } = require('@upstash/redis');
const IORedis = require('ioredis');

// Create a flexible Redis client that supports both REST and TCP connections
class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000; // Start with 1 second
    this.connectionType = process.env.UPSTASH_CONNECTION_TYPE || 'REST'; // REST or TCP
    this.initializeClient();
  }

  initializeClient() {
    try {
      if (this.connectionType === 'TCP') {
        this.initializeTCPClient();
      } else {
        this.initializeRESTClient();
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to initialize Redis client:`, error.message);
      this.handleConnectionError(error);
    }
  }

  initializeRESTClient() {
    // Initialize Upstash Redis REST client
    // Using fromEnv() method for automatic environment variable configuration
    this.client = Redis.fromEnv();
    
    // Upstash Redis REST is HTTP-based, so it doesn't maintain persistent connections
    // This means no connection drops!
    this.isConnected = true;
    console.log(`[${new Date().toISOString()}] Upstash Redis REST client initialized successfully`);
    
    // Reset connection attempts on successful initialization
    this.connectionAttempts = 0;
    this.retryDelay = 1000;
  }

  initializeTCPClient() {
    // Initialize TCP client using ioredis for better performance
    const redisUrl = process.env.UPSTASH_REDIS_URL;
    
    if (!redisUrl) {
      throw new Error('UPSTASH_REDIS_URL environment variable is required for TCP connection');
    }

    // Configure ioredis with enhanced options
    this.client = new IORedis(redisUrl, {
      // Connection options
      connectTimeout: 10000,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      
      // Keep-alive options to prevent connection drops
      keepAlive: 30000,
      
      // Reconnection options
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`[${new Date().toISOString()}] Redis TCP reconnecting... attempt ${times}`);
        return delay;
      },
      
      // Error handling
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },
      
      // Connection name for debugging
      connectionName: 'upstash-tcp-client',
      
      // Lazy connect to handle connection errors gracefully
      lazyConnect: true
    });

    // Set up event handlers
    this.client.on('connect', () => {
      console.log(`[${new Date().toISOString()}] Redis TCP client connected`);
      this.isConnected = true;
      this.connectionAttempts = 0;
      this.retryDelay = 1000;
    });

    this.client.on('ready', () => {
      console.log(`[${new Date().toISOString()}] Redis TCP client ready`);
    });

    this.client.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] Redis TCP client error:`, err.message);
    });

    this.client.on('close', () => {
      console.log(`[${new Date().toISOString()}] Redis TCP connection closed`);
      this.isConnected = false;
    });

    this.client.on('reconnecting', (delay) => {
      console.log(`[${new Date().toISOString()}] Redis TCP reconnecting in ${delay}ms`);
    });

    this.client.on('end', () => {
      console.log(`[${new Date().toISOString()}] Redis TCP connection ended`);
      this.isConnected = false;
    });

    // Connect to Redis
    this.client.connect().then(() => {
      this.isConnected = true;
    }).catch((error) => {
      console.error(`[${new Date().toISOString()}] Failed to connect to Redis TCP:`, error.message);
      this.handleConnectionError(error);
    });
  }

  handleConnectionError(error) {
    this.isConnected = false;
    this.connectionAttempts++;

    if (this.connectionAttempts >= this.maxRetries) {
      console.error(`[${new Date().toISOString()}] Max Redis connection retries reached. Using fallback mode.`);
      return;
    }

    // Exponential backoff with jitter
    const jitter = Math.random() * 1000;
    const delay = Math.min(this.retryDelay * Math.pow(2, this.connectionAttempts - 1) + jitter, 30000);

    console.log(`[${new Date().toISOString()}] Retrying Redis connection in ${Math.round(delay / 1000)} seconds... (Attempt ${this.connectionAttempts}/${this.maxRetries})`);

    setTimeout(() => {
      this.initializeClient();
    }, delay);
  }

  // Wrapper method to handle errors gracefully
  async executeCommand(commandName, operation) {
    if (!this.client) {
      console.warn(`[${new Date().toISOString()}] Redis client not initialized. Skipping ${commandName} operation.`);
      return null;
    }

    // For TCP connections, check if connected
    if (this.connectionType === 'TCP' && !this.isConnected) {
      console.warn(`[${new Date().toISOString()}] Redis TCP client not connected. Skipping ${commandName} operation.`);
      return null;
    }

    try {
      const result = await operation();
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Redis ${commandName} error:`, error.message);
      
      // Check if it's a connection error and attempt to reinitialize
      if (this.connectionType === 'REST' && 
          (error.message.includes('UPSTASH_REDIS_REST_URL') || 
           error.message.includes('UPSTASH_REDIS_REST_TOKEN') ||
           error.message.includes('fetch failed'))) {
        this.handleConnectionError(error);
      }
      
      return null;
    }
  }

  // Enhanced set method with automatic retry
  async set(key, value, options = {}) {
    return this.executeCommand('SET', async () => {
      if (this.connectionType === 'TCP') {
        // ioredis format
        if (options.EX) {
          return await this.client.set(key, value, 'EX', options.EX);
        }
        return await this.client.set(key, value);
      } else {
        // Upstash REST format
        if (options.EX) {
          return await this.client.set(key, value, { ex: options.EX });
        }
        return await this.client.set(key, value);
      }
    });
  }

  // Enhanced get method
  async get(key) {
    return this.executeCommand('GET', async () => {
      return await this.client.get(key);
    });
  }

  // Enhanced incr method
  async incr(key) {
    return this.executeCommand('INCR', async () => {
      return await this.client.incr(key);
    });
  }

  // Enhanced delete method
  async del(key) {
    return this.executeCommand('DEL', async () => {
      return await this.client.del(key);
    });
  }

  // Method to check if client is ready
  isReady() {
    if (this.connectionType === 'TCP') {
      return this.client && this.client.status === 'ready';
    }
    return this.isConnected && this.client !== null;
  }

  // Health check method
  async healthCheck() {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Redis health check failed:`, error.message);
      return false;
    }
  }

  // Graceful shutdown
  async disconnect() {
    if (this.connectionType === 'TCP' && this.client) {
      console.log(`[${new Date().toISOString()}] Disconnecting Redis TCP client...`);
      await this.client.quit();
    }
  }
}

// Create and export a singleton instance
const redisClient = new RedisClient();

// Handle process termination gracefully
process.on('SIGINT', async () => {
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await redisClient.disconnect();
  process.exit(0);
});

// Export both the instance and the class for flexibility
module.exports = {
  redisClient,
  RedisClient
};