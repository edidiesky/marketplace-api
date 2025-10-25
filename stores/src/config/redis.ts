import Redis from "ioredis";
import dotenv from "dotenv";
import logger from "../utils/logger";


dotenv.config();


const IO_REDIS_URL = process.env.IO_REDIS_URL || "redis://localhost:6379";


if (!IO_REDIS_URL) {
  logger.error("Error: IO_REDIS_URL is missing and no fallback provided.");
  process.exit(1);
}

const redisClient = new Redis(IO_REDIS_URL, {
  retryStrategy(times) {
    const delay = Math.min(times * 500, 2000);
    logger.error(`Retrying Redis connection (${times})...`);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Handling connection errors
redisClient.on("error", (err) => {
  logger.error("Redis Client Error:", err.message);
});

// Log successful connection
redisClient.on("connect", () => {
  logger.info("Successfully connected to Redis at", IO_REDIS_URL);
});

export default redisClient;