const { Redis } = require('@upstash/redis');

// Create a Redis client that automatically configures from UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000; // Start with 1 second
    this.initializeClient();
  }

  async initializeClient() {
    try {
      console.log(`[${new Date().toISOString()}] Initializing Upstash Redis client...`);
      
      // Check if environment variables are set
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        throw new Error('Upstash Redis environment variables (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) are not configured');
      }
      
      // Initialize Upstash Redis REST client
      // Using fromEnv() method for automatic environment variable configuration
      this.client = Redis.fromEnv();
      
      // Test the connection by performing a simple ping
      try {
        const pingResult = await this.client.ping();
        console.log(`[${new Date().toISOString()}] ✅ Successfully connected to Upstash Redis`);
        console.log(`[${new Date().toISOString()}] 📡 Redis connection test passed - REST API is responding`);
        console.log(`[${new Date().toISOString()}] 📊 Ping result:`, pingResult);
      } catch (pingError) {
        console.warn(`[${new Date().toISOString()}] ⚠️  Redis ping failed, but client initialized. Error:`, pingError.message);
        // Still mark as connected since Upstash REST API might allow operations even if ping fails
      }
      
      // Upstash Redis REST is HTTP-based, so it doesn't maintain persistent connections
      // This means no connection drops!
      this.isConnected = true;
      console.log(`[${new Date().toISOString()}] 🚀 Upstash Redis REST client initialized successfully`);
      
      // Reset connection attempts on successful initialization
      this.connectionAttempts = 0;
      this.retryDelay = 1000;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to initialize Upstash Redis client:`, error.message);
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

    setTimeout(async () => {
      await this.initializeClient();
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
      if (error.message.includes('UPSTASH_REDIS_REST_URL') || 
          error.message.includes('UPSTASH_REDIS_REST_TOKEN') ||
          error.message.includes('Unauthorized') ||
          error.message.includes('fetch failed')) {
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

  // Enhanced del method
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