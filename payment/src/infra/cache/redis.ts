import Redis from "ioredis";
import dotenv from "dotenv";
import logger from "../../utils/logger";

dotenv.config();

const IO_REDIS_URL = process.env.IO_REDIS_URL;

if (!IO_REDIS_URL) {
  logger.error("IO_REDIS_URL is not defined — cannot start payment service");
  process.exit(1);
}

class RedisClient {
  private client: Redis;
  private isConnected: boolean = false;
  private readonly CACHE_TTL: number = 300;

  constructor() {
    this.client = new Redis(IO_REDIS_URL!, {
      retryStrategy(times) {
        const delay = Math.min(times * 500, 2000);
        logger.warn(`Redis reconnect attempt ${times} — retrying in ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.client.on("ready", () => {
      this.isConnected = true;
      logger.info("Redis connected");
    });

    this.client.on("error", (err) => {
      this.isConnected = false;
      logger.error("Redis error", { message: err.message });
    });

    this.client.on("close", () => {
      this.isConnected = false;
      logger.warn("Redis connection closed");
    });

    this.client.on("reconnecting", () => {
      logger.warn("Redis reconnecting...");
    });
  }

  //  Connection 

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info("Redis disconnected");
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }

  // Returns the raw ioredis client.
  // Only use this when you need commands not wrapped here (e.g. Lua scripts).
  getClient(): Redis {
    return this.client;
  }

  //  Core Operations 

  /**
   * Get a value by key.
   * Returns null if key does not exist or Redis is unreachable.
   * PaymentRepository calls this directly: redisClient.get(key)
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.warn("Redis GET failed", {
        key,
        error: error instanceof Error ? error.message : error,
      });
      return null;
    }
  }

  /**
   * Set a key with the default CACHE_TTL (300s).
   * PaymentRepository calls this as redisClient.setValue(key, json)
   * Previously this was fire-and-forget (no await on setex) — now correctly awaited.
   */
  async setValue(key: string, value: string, ttl?: number): Promise<void> {
    try {
      await this.client.setex(key, ttl ?? this.CACHE_TTL, value);
    } catch (error) {
      logger.warn("Redis SETEX failed", {
        key,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Set a key with explicit TTL.
   * Alias kept for clarity at call sites.
   */
  async set(key: string, value: string, mode?: "EX", ttl?: number): Promise<void> {
    try {
      if (mode === "EX" && ttl !== undefined) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.warn("Redis SET failed", {
        key,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Delete one or more keys.
   * PaymentRepository calls redisClient.del(key) in invalidateCache.
   */
  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch (error) {
      logger.warn("Redis DEL failed", {
        keys,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Check if a key exists.
   * Returns true if the key exists in Redis.
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.warn("Redis EXISTS failed", {
        key,
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  /**
   * Set a key only if it does NOT already exist (NX flag).
   * Used for distributed locks and idempotency keys.
   * Returns true if the key was set, false if it already existed.
   */
  async setNX(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.client.set(key, value, "EX", ttlSeconds, "NX");
      return result === "OK";
    } catch (error) {
      logger.warn("Redis SETNX failed", {
        key,
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  /**
   * Increment a counter key atomically.
   * Returns the new value after increment.
   * Used for rate limiting counters.
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.warn("Redis INCR failed", {
        key,
        error: error instanceof Error ? error.message : error,
      });
      return 0;
    }
  }

  /**
   * Set expiry on an existing key.
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      logger.warn("Redis EXPIRE failed", {
        key,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Get TTL remaining on a key in seconds.
   * Returns -1 if no TTL set, -2 if key does not exist.
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.warn("Redis TTL failed", {
        key,
        error: error instanceof Error ? error.message : error,
      });
      return -2;
    }
  }
}

export const redisClient = new RedisClient();