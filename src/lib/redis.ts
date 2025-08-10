import { Redis } from '@upstash/redis';

// Create Redis client singleton
class RedisClient {
  private static instance: RedisClient;
  private client: Redis | null = null;
  private isConnected: boolean = false;

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
        console.warn('Upstash Redis environment variables not configured. Running without Redis cache.');
        return;
      }
      
      // Initialize Upstash Redis REST client
      this.client = Redis.fromEnv();
      
      // Test the connection
      try {
        const pingResult = await this.client.ping();
        console.log(`[${new Date().toISOString()}] ✅ Successfully connected to Upstash Redis`);
        console.log(`[${new Date().toISOString()}] 📊 Ping result:`, pingResult);
        this.isConnected = true;
      } catch (pingError) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Redis ping failed:`, pingError);
        this.isConnected = false;
      }
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to initialize Redis:`, error);
      this.isConnected = false;
    }
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