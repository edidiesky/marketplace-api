import http      from "http";
import mongoose  from "mongoose";
import logger    from "../utils/logger";
import redisClient from "../config/redis";
import { disconnectRabbitMQ }            from "../messaging/connection";
import { trackError, serverHealthGauge } from "../utils/metrics";
import { SERVICE_NAME }                  from "../constants";

async function closeHttpServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

export async function gracefulShutdown(
  server: http.Server,
  signal: string
): Promise<void> {
  logger.info("shutdown_initiated", {
    event:   "shutdown_initiated",
    service: SERVICE_NAME,
    signal,
  });

  try {
    await closeHttpServer(server);

    const steps = [
      { name: "mongoose", fn: async () => { await mongoose.connection.close(); } },
      { name: "rabbitmq", fn: disconnectRabbitMQ },
      { name: "redis",    fn: async () => { await redisClient.quit(); } },
    ];

    for (const step of steps) {
      try {
        await step.fn();
        logger.info("shutdown_step_complete", {
          event:   "shutdown_step_complete",
          service: SERVICE_NAME,
          step:    step.name,
        });
      } catch (err) {
        logger.error("shutdown_step_failed", {
          event:   "shutdown_step_failed",
          service: SERVICE_NAME,
          step:    step.name,
          error:   err instanceof Error ? err.message : String(err),
        });
      }
    }

    serverHealthGauge.set(0);
    logger.info("shutdown_complete", {
      event:   "shutdown_complete",
      service: SERVICE_NAME,
    });
    process.exit(0);
  } catch (err) {
    trackError("graceful_shutdown_failed", "system", "critical");
    logger.error("shutdown_failed", {
      event:   "shutdown_failed",
      service: SERVICE_NAME,
      error:   err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

export function registerShutdownHooks(server: http.Server): void {
  const handler = (signal: string) => () => gracefulShutdown(server, signal);
  process.on("SIGINT",  handler("SIGINT"));
  process.on("SIGTERM", handler("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    trackError("unhandled_promise_rejection", "process", "critical");
    logger.error("unhandled_rejection", {
      event:   "unhandled_rejection",
      service: SERVICE_NAME,
      reason:  String(reason),
    });
    gracefulShutdown(server, "unhandledRejection");
  });
  process.on("uncaughtException", (err) => {
    trackError("uncaught_exception", "process", "critical");
    logger.error("uncaught_exception", {
      event:   "uncaught_exception",
      service: SERVICE_NAME,
      error:   err.message,
    });
    gracefulShutdown(server, "uncaughtException");
  });
}