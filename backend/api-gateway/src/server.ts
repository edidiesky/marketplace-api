import "./utils/otel";
import http      from "http";
import mongoose  from "mongoose";

import { app }                           from "./app";
import { redisClient }                   from "./redis/redisClient";
import { rulesEngine }                   from "./rules/engine";
import { rulesSyncPubSub }               from "./rules/rulesSync";
import { connectMongoDB }                from "./utils/connectDB";
import { trackError, serverHealthGauge } from "./utils/metrics";
import logger                            from "./utils/logger";
import { SERVICE_NAME }                  from "./constants";

const PORT   = process.env.PORT ?? 8000;
const server = http.createServer(app);

async function startServer(): Promise<void> {
  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  const steps = [
    {
      name: "mongodb",
      fn:   () => connectMongoDB(mongoUrl),
    },
    {
      name: "redis",
      fn:   async () => {
        await redisClient.waitForConnection();
      },
    },
    {
      name: "rules_engine",
      fn:   async () => {
        await rulesEngine.start();
        const stats = rulesEngine.getStats();
        logger.info("gateway_rules_engine_started", {
          event:   "gateway_rules_engine_started",
          service: SERVICE_NAME,
          ...stats,
        });
      },
    },
    {
      name: "rules_pubsub",
      fn:   async () => {
        await rulesSyncPubSub.subscribe();
      },
    },
  ];

  const start = process.hrtime.bigint();

  for (const step of steps) {
    const stepStart = process.hrtime.bigint();
    try {
      await step.fn();
      const ms = Number(process.hrtime.bigint() - stepStart) / 1e6;
      logger.info("gateway_bootstrap_step_complete", {
        event:      "gateway_bootstrap_step_complete",
        service:    SERVICE_NAME,
        step:       step.name,
        durationMs: ms.toFixed(2),
      });
    } catch (err) {
      trackError(
        `${step.name}_initialization_failed`,
        "server_initialization",
        "critical"
      );
      logger.error("gateway_bootstrap_step_failed", {
        event:   "gateway_bootstrap_step_failed",
        service: SERVICE_NAME,
        step:    step.name,
        error:   err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => resolve());
  });

  serverHealthGauge.set(1);

  const totalMs = Number(process.hrtime.bigint() - start) / 1e6;
  logger.info("gateway_started", {
    event:      "gateway_started",
    service:    SERVICE_NAME,
    port:       PORT,
    env:        process.env.NODE_ENV,
    durationMs: totalMs.toFixed(2),
    steps:      steps.length,
  });
}

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info("gateway_shutdown_initiated", {
    event:   "gateway_shutdown_initiated",
    service: SERVICE_NAME,
    signal,
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

    rulesEngine.stop();
    await rulesSyncPubSub.disconnect();
    await mongoose.connection.close();
    await redisClient.disconnect();

    serverHealthGauge.set(0);

    logger.info("gateway_shutdown_complete", {
      event:   "gateway_shutdown_complete",
      service: SERVICE_NAME,
    });

    process.exit(0);
  } catch (err) {
    trackError("graceful_shutdown_failed", "system", "critical");
    logger.error("gateway_shutdown_failed", {
      event:   "gateway_shutdown_failed",
      service: SERVICE_NAME,
      error:   err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  trackError("unhandled_promise_rejection", "process", "critical");
  logger.error("gateway_unhandled_rejection", {
    event:   "gateway_unhandled_rejection",
    service: SERVICE_NAME,
    reason:  String(reason),
  });
  gracefulShutdown("unhandledRejection");
});

process.on("uncaughtException", (err) => {
  trackError("uncaught_exception", "process", "critical");
  logger.error("gateway_uncaught_exception", {
    event:   "gateway_uncaught_exception",
    service: SERVICE_NAME,
    error:   err.message,
  });
  gracefulShutdown("uncaughtException");
});

startServer().catch(async (err) => {
  trackError("server_initialization_failed", "server_startup", "critical");
  logger.error("gateway_start_failed", {
    event:   "gateway_start_failed",
    service: SERVICE_NAME,
    error:   err instanceof Error ? err.message : String(err),
  });
  await redisClient.disconnect().catch(() => {});
  process.exit(1);
});