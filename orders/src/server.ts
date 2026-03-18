import mongoose from "mongoose";
import { app } from "./app";
import { errorHandler, NotFound } from "./middleware/error-handler";
const PORT = process.env.PORT;
import logger from "./utils/logger";
import redisClient from "./config/redis";
import { connectMongoDB } from "./utils/connectDB";
import { trackError, serverHealthGauge } from "./utils/metrics";
import { connectConsumer, disconnectConsumer } from "./messaging/consumer";
import { connectProducer, disconnectProducer } from "./messaging/producer";

/** ERROR MIDDLEWARE */
app.use(NotFound);
app.use(errorHandler);

const server = app.listen(PORT, async () => {
  const serverStartTime = process.hrtime();
  logger.info(`Order Server running on port ${PORT}`);

  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    trackError("missing_env_var", "server_initialization", "critical");
    throw new Error("MongoDB connection string is not defined.");
  }

  try {
    const initSteps = [
      { name: "mongodb", fn: () => connectMongoDB(mongoUrl) },
      { name: "redis", fn: () => redisClient.ping() },
      { name: "kakfa_consumer", fn: connectConsumer },
      { name: "kakfa_producer", fn: connectProducer },
    ];

    for (const step of initSteps) {
      const stepStart = process.hrtime();

      try {
        if (step.name === "redis") {
          await step.fn();
          logger.info(`Successfully connected to Redis at`);
        } else {
          await step.fn();
        }

        const stepDuration = process.hrtime(stepStart);
        const stepSeconds = stepDuration[0] + stepDuration[1] / 1e9;
        logger.info(`${step.name} initialized successfully`, {
          duration: stepSeconds,
        });
      } catch (error) {
        const stepDuration = process.hrtime(stepStart);
        const stepSeconds = stepDuration[0] + stepDuration[1] / 1e9;
        trackError(
          `${step.name}_initialization_failed`,
          "server_initialization",
          "critical",
        );

        throw error;
      }
    }

    const totalDuration = process.hrtime(serverStartTime);
    const totalSeconds = totalDuration[0] + totalDuration[1] / 1e9;
    serverHealthGauge.set(1);

    logger.info("Server initialized successfully", {
      totalDuration: totalSeconds,
      components: initSteps.length,
    });
  } catch (error) {
    const totalDuration = process.hrtime(serverStartTime);
    const totalSeconds = totalDuration[0] + totalDuration[1] / 1e9;
    trackError("server_initialization_failed", "server_startup", "critical");

    logger.error(`Server initialization failed`, {
      error,
      totalDuration: totalSeconds,
    });
  }
});

async function GracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received. Shutting down gracefully`);

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

    const shutdownStart = process.hrtime();
    await mongoose.connection.close();
    await disconnectConsumer();
    await disconnectProducer();
    await redisClient.quit();

    const [secs] = process.hrtime(shutdownStart);
    logger.info("All connections closed", { shutdownDuration: secs });
    process.exit(0);
  } catch (err) {
    trackError("graceful_shutdown_failed", "system", "critical");
    logger.error("Error during shutdown", err);
    process.exit(1);
  }
}

process.on("SIGINT", GracefulShutdown);
process.on("SIGTERM", GracefulShutdown);

process.on("unhandledRejection", (reason, promise) => {
  trackError("unhandled_promise_rejection", "process", "critical");
  logger.error("Unhandled Promise Rejection at:", promise, "reason:", reason);
  GracefulShutdown("unhandledRejection");
});

process.on("uncaughtException", (error) => {
  trackError("uncaught_exception", "process", "critical");
  logger.error("Uncaught Exception:", error);
  GracefulShutdown("uncaughtException");
});
