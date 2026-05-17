import http from "http";
import { app }                   from "./app";
import { bootstrapServer }       from "./server/bootstrap";
import { registerShutdownHooks } from "./server/shutdown";
import logger                    from "./utils/logger";
import { trackError }            from "./utils/metrics";
import redisClient               from "./config/redis";
import { SERVICE_NAME }          from "./constants";

const PORT   = process.env.PORT ?? 4006;
const server = http.createServer(app);

async function start(): Promise<void> {
  await bootstrapServer();
  await new Promise<void>((resolve) => {
    server.listen(PORT, () => resolve());
  });
  registerShutdownHooks(server);
  logger.info("notification_service_started", {
    event:   "notification_service_started",
    service: SERVICE_NAME,
    port:    PORT,
    env:     process.env.NODE_ENV,
  });
}

start().catch(async (err) => {
  trackError("server_initialization_failed", "server_startup", "critical");
  logger.error("notification_service_start_failed", {
    event:   "notification_service_start_failed",
    service: SERVICE_NAME,
    error:   err instanceof Error ? err.message : String(err),
  });
  await redisClient.quit().catch(() => {});
  process.exit(1);
});