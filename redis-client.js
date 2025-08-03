const { Redis } = require('@upstash/redis');

// Create a Redis client that automatically configures from REDIS_URL
class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000; // Start with 1 second
    this.initializeClient();
  }

  initializeClient() {
    try {
      // Parse the REDIS_URL to extract REST API credentials
      const redisUrl = process.env.REDIS_URL;
      
      if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is required');
      }

      // Extract password and endpoint from the Redis URL
      // Format: rediss://default:password@endpoint:port
      const urlPattern = /rediss?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)/;
      const match = redisUrl.match(urlPattern);
      
      if (!match) {
        throw new Error('Invalid REDIS_URL format');
      }

      const [, username, password, endpoint, port] = match;
      
      // Convert to Upstash REST API format
      // The endpoint for REST API is https://[endpoint].upstash.io
      const restUrl = `https://${endpoint}`;
      const restToken = password;

      // Initialize Upstash Redis REST client
      this.client = new Redis({
        url: restUrl,
        token: restToken
      });
      
      // Upstash Redis REST is HTTP-based, so it doesn't maintain persistent connections
      // This means no connection drops!
      this.isConnected = true;
      console.log(`[${new Date().toISOString()}] Upstash Redis client initialized successfully`);
      
      // Reset connection attempts on successful initialization
      this.connectionAttempts = 0;
      this.retryDelay = 1000;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to initialize Upstash Redis client:`, error.message);
      this.handleConnectionError(error);
    }
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

    try {
      const result = await operation();
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Redis ${commandName} error:`, error.message);
      
      // Check if it's a connection error and attempt to reinitialize
      if (error.message.includes('Unauthorized') || 
          error.message.includes('fetch failed') ||
          error.message.includes('REDIS_URL')) {
        this.handleConnectionError(error);
      }
      
      return null;
    }
  }

  // Enhanced set method with automatic retry
  async set(key, value, options = {}) {
    return this.executeCommand('SET', async () => {
      if (options.EX) {
        // Upstash uses 'ex' (lowercase) for expiration in seconds
        return await this.client.set(key, value, { ex: options.EX });
      }
      return await this.client.set(key, value);
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
}

// Create and export a singleton instance
const redisClient = new RedisClient();

// Export both the instance and the class for flexibility
module.exports = {
  redisClient,
  RedisClient
};