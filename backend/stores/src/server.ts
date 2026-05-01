import http from "http";
import { app } from "./app";
import { bootstrapServer } from "./bootstrap";
import { registerShutdownHooks } from "./shutdown";
import logger from "./utils/logger";
import { trackError } from "./utils/metrics";
import redisClient from "./config/redis";

const PORT = process.env.PORT ?? 4007;
const server = http.createServer(app);

async function start(): Promise<void> {
  await bootstrapServer();

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => resolve());
  });

  registerShutdownHooks(server);

  logger.info("Stores service listening", {
    port: PORT,
    env: process.env.NODE_ENV,
    eventType: "server.started",
  });
}

start().catch(async (err) => {
  trackError("server_initialization_failed", "server_startup", "critical");
  logger.error("Stores service failed to start", {
    error: err instanceof Error ? err.message : String(err),
    eventType: "server.start.failed",
  });
  await redisClient.quit().catch(() => {});
  process.exit(1);
});