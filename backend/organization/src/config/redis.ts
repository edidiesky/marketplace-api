import Redis from "ioredis";

const redisClient = new Redis({
  host:                 process.env.REDIS_HOST ?? "redis",
  port:                 parseInt(process.env.REDIS_PORT ?? "6379", 10),
  password:             process.env.REDIS_PASSWORD,
  retryStrategy:        (times) => Math.min(times * 200, 5_000),
  maxRetriesPerRequest: 3,
  enableReadyCheck:     true,
});

redisClient.on("connect", () =>
  console.info(JSON.stringify({
    event:   "redis_connected",
    service: "authentication-service",
  }))
);
redisClient.on("error", (err) =>
  console.error(JSON.stringify({
    event:   "redis_error",
    service: "authentication-service",
    error:   err.message,
  }))
);
redisClient.on("close", () =>
  console.warn(JSON.stringify({
    event:   "redis_closed",
    service: "authentication-service",
  }))
);

export default redisClient;