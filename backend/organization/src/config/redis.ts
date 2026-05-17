import Redis from "ioredis";
import logger from "../utils/logger";

const redisClient = new Redis({
  host:                 process.env.REDIS_HOST ?? "redis",
  port:                 parseInt(process.env.REDIS_PORT ?? "6379", 10),
  password:             process.env.REDIS_PASSWORD,
  retryStrategy:        (times) => Math.min(times * 200, 5_000),
  maxRetriesPerRequest: 3,
  enableReadyCheck:     true,
});

redisClient.on("connect", () =>
  logger.info("redis_connected", {
    event:   "redis_connected",
    service: process.env.OTEL_SERVICE_NAME ?? "service",
  })
);

redisClient.on("error", (err) =>
  logger.error("redis_error", {
    event:   "redis_error",
    service: process.env.OTEL_SERVICE_NAME ?? "service",
    error:   err.message,
  })
);

redisClient.on("close", () =>
  logger.warn("redis_closed", {
    event:   "redis_closed",
    service: process.env.OTEL_SERVICE_NAME ?? "service",
  })
);

export default redisClient;