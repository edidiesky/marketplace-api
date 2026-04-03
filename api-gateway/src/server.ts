import { app } from "./app";
import { redisClient } from "./redis/redisClient";
import { rulesEngine } from "./rules/engine";
import { trackError, serverHealthGauge } from "./utils/metrics";
import logger from "./utils/logger";
import http from "http";
import { rulesSyncPubSub } from "./rules/rulesSync";
import { connectMongoDB } from "./utils/connectDB";
import mongoose from "mongoose";

const PORT = process.env.PORT ?? 8000;

const server = http.createServer(app);

async function startServer(): Promise<void> {
  const serverStartTime = process.hrtime();

  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    trackError("missing_env_var", "server_initialization", "critical");
    throw new Error("MongoDB connection string is not defined.");
  }

  const initSteps = [
    { name: "mongodb", fn: () => connectMongoDB(mongoUrl) },
    {
      name: "redis",
      fn: async () => {
        await redisClient.waitForConnection();
        logger.info("Redis ready");
      },
    },
    {
      name: "rules_engine",
      fn: async () => {
        await rulesEngine.start();
        const stats = rulesEngine.getStats();
        logger.info("RulesEngine started", stats);
      },
    },
    {
      name: "rules_pubsub",
      fn: async () => {
        await rulesSyncPubSub.subscribe();
        logger.info("RulesSyncPubSub subscribed");
      },
    },
  ];

  for (const step of initSteps) {
    const stepStart = process.hrtime();
    try {
      await step.fn();
      const [secs, ns] = process.hrtime(stepStart);
      logger.info(`${step.name} initialized`, {
        duration: secs + ns / 1e9,
      });
    } catch (error) {
      trackError(
        `${step.name}_initialization_failed`,
        "server_initialization",
        "critical",
      );
      logger.error(`${step.name} initialization failed`, { error });
      throw error;
    }
  }

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => resolve());
  });

  serverHealthGauge.set(1);

  const [totalSecs, totalNs] = process.hrtime(serverStartTime);
  logger.info("API Gateway running", {
    port: PORT,
    totalDuration: totalSecs + totalNs / 1e9,
    components: initSteps.length,
  });
}

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received. Shutting down gracefully`);

  try {
    //  Stop accepting new HTTP connections
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await mongoose.connection.close();

    //  Stop rules engine periodic reload
    rulesEngine.stop();

    //  Disconnect PubSub subscriber
    await rulesSyncPubSub.disconnect();

    //  Disconnect Redis
    await redisClient.disconnect();

    serverHealthGauge.set(0);
    logger.info("All connections closed");
    process.exit(0);
  } catch (err) {
    trackError("graceful_shutdown_failed", "system", "critical");
    logger.error("Error during shutdown", { err });
    process.exit(1);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("unhandledRejection", (reason, promise) => {
  trackError("unhandled_promise_rejection", "process", "critical");
  logger.error("Unhandled Promise Rejection", { promise, reason });
  gracefulShutdown("unhandledRejection");
});

process.on("uncaughtException", (error) => {
  trackError("uncaught_exception", "process", "critical");
  logger.error("Uncaught Exception", { error });
  gracefulShutdown("uncaughtException");
});

startServer().catch(async (error) => {
  trackError("server_initialization_failed", "server_startup", "critical");
  logger.error("Server failed to start", { error });
  await redisClient.disconnect().catch(() => {});
  process.exit(1);
});


