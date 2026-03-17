import mongoose from "mongoose";
import { app } from "./app";
import { errorHandler, NotFound } from "./middleware/error-handler";
const PORT = process.env.PORT;
import logger from "./utils/logger";
import { connectMongoDB } from "./utils/connectDB";
import { trackError, serverHealthGauge } from "./utils/metrics";
import { connectConsumer, disconnectConsumer } from "./infra/messaging/consumer";
import { connectProducer, disconnectProducer } from "./infra/messaging/producer";
import { redisClient } from "./infra/cache/redis";

async function GracefulShutdown() {
  logger.info("Shutting down gracefully!!");

  try {
    const shutdownStart = process.hrtime();
    await disconnectConsumer();
    await disconnectProducer();
    await mongoose.connection.close();
    await redisClient.disconnect();

    const shutdownDuration = process.hrtime(shutdownStart);
    const shutdownSeconds = shutdownDuration[0] + shutdownDuration[1] / 1e9;

    logger.info("Mongoose, Kafka, and Redis disconnected", {
      shutdownDuration: shutdownSeconds,
    });
    process.exit(0);
  } catch (err) {
    trackError("graceful_shutdown_failed", "system", "critical");
    logger.error("Error during shutdown!", err);
    process.exit(1);
  }
}

app.use(NotFound);
app.use(errorHandler);

app.listen(PORT, async () => {
  const serverStartTime = process.hrtime();
  logger.info(`Payment Server running on port ${PORT}`);

  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    trackError("missing_env_var", "server_initialization", "critical");
    throw new Error("MongoDB connection string is not defined.");
  }

  try {
    const initSteps = [
      { name: "mongodb", fn: () => connectMongoDB(mongoUrl) },
      {
        name: "redis",
        fn: async () => {
          const ok = await redisClient.ping();
          if (!ok) {
            throw new Error(
              "Redis ping failed — server is unreachable or not ready"
            );
          }
        },
      },
      { name: "kafka_consumer", fn: connectConsumer },
      { name: "kafka_producer", fn: connectProducer },
    ];

    for (const step of initSteps) {
      const stepStart = process.hrtime();

      try {
        await step.fn();
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
          "critical"
        );
        logger.error(`${step.name} initialization failed`, {
          error,
          duration: stepSeconds,
        });
        throw error;
      }
    }

    const totalDuration = process.hrtime(serverStartTime);
    const totalSeconds = totalDuration[0] + totalDuration[1] / 1e9;

    serverHealthGauge.set(1);

    logger.info("Payment service initialized successfully", {
      totalDuration: totalSeconds,
      components: initSteps.length,
    });
  } catch (error) {
    const totalDuration = process.hrtime(serverStartTime);
    const totalSeconds = totalDuration[0] + totalDuration[1] / 1e9;
    trackError("server_initialization_failed", "server_startup", "critical");

    logger.error("Server initialization failed", {
      error,
      totalDuration: totalSeconds,
    });

    await GracefulShutdown();
  }
});

process.on("SIGINT", GracefulShutdown);
process.on("SIGTERM", GracefulShutdown);

process.on("unhandledRejection", (reason, promise) => {
  trackError("unhandled_promise_rejection", "process", "critical");
  logger.error("Unhandled Promise Rejection", { promise, reason });
  GracefulShutdown();
});

process.on("uncaughtException", (error) => {
  trackError("uncaught_exception", "process", "critical");
  logger.error("Uncaught Exception", { error });
  GracefulShutdown();
});