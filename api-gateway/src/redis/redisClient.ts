import Redis from "ioredis";
import dotenv from "dotenv";
import logger from "../utils/logger";
dotenv.config();

const IO_REDIS_URL = process.env.IO_REDIS_URL;
if (!IO_REDIS_URL) {
  throw new Error("IO_REDIS_URL variable was not being defined!");
}

class RedisClient {
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Redis(IO_REDIS_URL!, {
      retryStrategy(times) {
        if (times > 10) {
          logger.error(`Max Redis retry attempts (${times}) reached`);
          return null;
        }
        const delay = Math.min(times * 500, 2000);
        logger.error(`Retrying Redis connection (${times})...`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.client.on("reconnecting", () => {
      logger.info("Redis client is connecting");
    });

    this.client.on("error", (err) => {
      this.isConnected = false;
      logger.error("Redis Client Error:", err.message);
    });

    this.client.on("close", () => {
      this.isConnected = false;
      logger.info("Redis client has closed");
    });

    this.client.on("connect", () => {
      logger.info("Redis client connection fine");
    });

    this.client.on("ready", () => {
      this.isConnected = true;
      logger.info("Redis client has been connected to the Redis Server");
    });
  }

  async waitForConnection(timeoutMs: number = 10000) {
    if (this.isConnected) {
      logger.info(
        "No need waiting for connection since Redis has already been connected!",
      );
      return;
    }

    const startTime = Date.now();

    while (!this.isConnected && Date.now() - startTime < timeoutMs) {
      try {
        await this.client.ping();
        this.isConnected = true;
        logger.info("Redis connection verified via ping");
        return;
      } catch (error) {
        logger.debug("Waiting for Redis connection...");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!this.isConnected) {
      throw new Error(`Redis connection timeout after ${timeoutMs}ms`);
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info("Redis has been disconnected!");
    }
  }

  
  getClient() {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

export const redisClient = new RedisClient();
