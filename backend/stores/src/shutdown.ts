import http from "http";
import mongoose from "mongoose";
import logger from "./utils/logger";
import redisClient from "./config/redis";
import { disconnectProducer } from "./messaging/producer";
import { trackError, serverHealthGauge } from "./utils/metrics";

async function closeHttpServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function runShutdownSteps(): Promise<void> {
  const steps: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: "mongoose", fn: async () => { await mongoose.connection.close(); } },
    { name: "kafka_producer", fn: disconnectProducer },
    { name: "redis", fn: async () => { await redisClient.quit(); } },
  ];

  for (const step of steps) {
    try {
      await step.fn();
      logger.info(`${step.name} disconnected`, {
        eventType: "shutdown.step.complete",
      });
    } catch (err) {
      logger.error(`${step.name} shutdown error`, {
        error: err instanceof Error ? err.message : String(err),
        eventType: "shutdown.step.failed",
      });
    }
  }
}

export async function gracefulShutdown(
  server: http.Server,
  signal: string
): Promise<void> {
  logger.info(`${signal} received, shutting down`, {
    signal,
    eventType: "shutdown.initiated",
  });
  const start = process.hrtime.bigint();

  try {
    await closeHttpServer(server);
    await runShutdownSteps();

    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    serverHealthGauge.set(0);
    logger.info("Graceful shutdown complete", {
      durationMs: ms.toFixed(2),
      eventType: "shutdown.complete",
    });
    process.exit(0);
  } catch (err) {
    trackError("graceful_shutdown_failed", "system", "critical");
    logger.error("Shutdown error", {
      error: err instanceof Error ? err.message : String(err),
      eventType: "shutdown.failed",
    });
    process.exit(1);
  }
}

export function registerShutdownHooks(server: http.Server): void {
  const handler = (signal: string) => () => gracefulShutdown(server, signal);

  process.on("SIGINT", handler("SIGINT"));
  process.on("SIGTERM", handler("SIGTERM"));

  process.on("unhandledRejection", (reason, promise) => {
    trackError("unhandled_promise_rejection", "process", "critical");
    logger.error("Unhandled promise rejection", {
      promise: String(promise),
      reason: String(reason),
      eventType: "process.unhandled_rejection",
    });
    gracefulShutdown(server, "unhandledRejection");
  });

  process.on("uncaughtException", (err) => {
    trackError("uncaught_exception", "process", "critical");
    logger.error("Uncaught exception", {
      error: err.message,
      stack: err.stack,
      eventType: "process.uncaught_exception",
    });
    gracefulShutdown(server, "uncaughtException");
  });
}