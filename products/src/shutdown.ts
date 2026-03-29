import http from "http";
import mongoose from "mongoose";
import logger from "./utils/logger";
import redisClient from "./config/redis";
import { disconnectProducer } from "./messaging/producer";
import { disconnectEsProductSyncConsumer } from "./messaging/consumers/esProductSyncConsumer";
import { stopOutboxPoller } from "./utils/outBoxPoller";
import { trackError } from "./utils/metrics";

async function gracefulShutdown(server: http.Server, signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully`);
  const start = process.hrtime.bigint();

  try {
    await closeHttpServer(server);
    await runShutdownSteps();

    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info("Graceful shutdown complete", { durationMs: ms.toFixed(2) });
    process.exit(0);
  } catch (err) {
    trackError("graceful_shutdown_failed", "system", "critical");
    logger.error("Shutdown error", { error: err });
    process.exit(1);
  }
}

function closeHttpServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function runShutdownSteps(): Promise<void> {
  const steps: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: "mongoose",         fn: async () => { await mongoose.connection.close(); } },
    { name: "kafka_producer",   fn: disconnectProducer },
    { name: "redis",            fn: async () => { await redisClient.quit(); } },
    { name: "es_sync_consumer", fn: disconnectEsProductSyncConsumer },
    { name: "outbox_poller",    fn: async () => { stopOutboxPoller(); } },
  ];

  for (const step of steps) {
    try {
      await step.fn();
      logger.info(`${step.name} disconnected`);
    } catch (err) {
      logger.error(`${step.name} shutdown error`, { error: err });
    }
  }
}
export function registerShutdownHooks(server: http.Server): void {
  const handler = (signal: string) => () => gracefulShutdown(server, signal);

  process.on("SIGINT",  handler("SIGINT"));
  process.on("SIGTERM", handler("SIGTERM"));

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled promise rejection", { promise, reason });
    gracefulShutdown(server, "unhandledRejection");
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err });
    gracefulShutdown(server, "uncaughtException");
  });
}