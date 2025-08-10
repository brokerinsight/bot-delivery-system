import { Redis } from '@upstash/redis';

// Create Redis client singleton
class RedisClient {
  private static instance: RedisClient;
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000; // Start with 1 second
  private maxReconnectDelay: number = 30000; // Max 30 seconds

  private constructor() {
    this.initializeClient();
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  private async initializeClient() {
    try {
      console.log(`[${new Date().toISOString()}] Initializing Upstash Redis client...`);
      
      // Check if environment variables are set
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.warn('Upstash Redis environment variables (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) not configured. Running without Redis cache.');
        return;
      }
      
      // Initialize Upstash Redis REST client with retry configuration
      this.client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
        retry: {
          retries: 3,
          backoff: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 5000)
        },
        // Upstash-specific configurations for stability
        automaticDeserialization: false
      });
      
      // Test the connection with multiple attempts
      let connected = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!connected && attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`[${new Date().toISOString()}] Testing Redis connection (attempt ${attempts}/${maxAttempts})...`);
          
          const pingResult = await this.client.ping();
          console.log(`[${new Date().toISOString()}] ✅ Successfully connected to Upstash Redis`);
          console.log(`[${new Date().toISOString()}] 📊 Ping result:`, pingResult);
          
          connected = true;
          this.isConnected = true;
          this.reconnectAttempts = 0; // Reset on successful connection
          
        } catch (pingError) {
          console.warn(`[${new Date().toISOString()}] ⚠️ Redis ping attempt ${attempts} failed:`, pingError.message);
          
          if (attempts < maxAttempts) {
            await this.delay(1000 * attempts); // Progressive delay
          }
        }
      }
      
      if (!connected) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Redis connection failed after ${maxAttempts} attempts, but REST client initialized`);
        // For Upstash REST API, we can still try operations even if ping fails
        this.isConnected = true;
      }
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to initialize Redis:`, error);
      this.isConnected = false;
      await this.scheduleReconnect();
    }
  }

  private async scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[${new Date().toISOString()}] ❌ Max Redis reconnection attempts reached. Running without Redis.`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    console.log(`[${new Date().toISOString()}] 🔄 Scheduling Redis reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      console.log(`[${new Date().toISOString()}] 🔄 Attempting Redis reconnection...`);
      await this.initializeClient();
    }, delay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  public getClient(): Redis | null {
    return this.client;
  }

  // Wrapper methods for common operations
  public async get(key: string): Promise<any> {
    if (!this.isReady()) {
      return null;
    }
    try {
      return await this.client!.get(key);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  public async set(key: string, value: any, options?: { EX?: number }): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }
    try {
      await this.client!.set(key, value, options);
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  public async del(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }
    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  public async incr(key: string): Promise<number | null> {
    if (!this.isReady()) {
      return null;
    }
    try {
      return await this.client!.incr(key);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Redis INCR error for key ${key}:`, error);
      return null;
    }
  }

  // Rate limiting helper
  public async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number }> {
    if (!this.isReady()) {
      return { allowed: true, remaining: limit }; // Allow if Redis is down
    }

    try {
      const requests = await this.get(key);
      const currentCount = requests ? parseInt(requests) : 0;

      if (currentCount >= limit) {
        return { allowed: false, remaining: 0 };
      }

      if (currentCount === 0) {
        await this.set(key, 1, { EX: window });
      } else {
        await this.incr(key);
      }

      return { allowed: true, remaining: limit - currentCount - 1 };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Rate limit check error:`, error);
      return { allowed: true, remaining: limit }; // Allow if error
    }
  }

  // Cache data with TTL
  public async cacheData(key: string, data: any, ttlSeconds: number = 900): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const serializedData = JSON.stringify(data);
      return await this.set(key, serializedData, { EX: ttlSeconds });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Cache data error for key ${key}:`, error);
      return false;
    }
  }

  // Get cached data
  public async getCachedData(key: string): Promise<any> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const cached = await this.get(key);
      if (!cached) return null;

      if (typeof cached === 'string') {
        return JSON.parse(cached);
      } else if (typeof cached === 'object') {
        return cached;
      }
      
      return null;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Get cached data error for key ${key}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const redisClient = RedisClient.getInstance();