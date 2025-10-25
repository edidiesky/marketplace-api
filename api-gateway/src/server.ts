import mongoose from "mongoose";
import { app } from "./app";
import { errorHandler, NotFound } from "./middleware/error-handler";
const PORT = process.env.PORT || 4001;
import { connectConsumer, disconnectConsumer } from "./messaging/consumer";
import { connectProducer, disconnectUserProducer } from "./messaging/producer";
import logger from "./utils/logger";
import redisClient from "./config/redis";
import { preGeneratedTINsWithULID } from "./utils/generateTIN";
import { connectMongoDB } from "./utils/connectDB";
import { UserType } from "./models/User";
import {
  trackError,
  serverHealthGauge,
  databaseConnectionsGauge,
  businessOperationCounter,
} from "./utils/metrics";

const INITIAL_TIN_BATCH_SIZE = 50;

import client from "prom-client";

export const serviceInitializationCounter = new client.Counter({
  name: "user_service_initialization_attempts_total",
  help: "Service initialization attempts",
  labelNames: ["component", "status"],
});

export const serviceInitializationDuration = new client.Histogram({
  name: "user_service_initialization_duration_seconds",
  help: "Service initialization duration",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  labelNames: ["component", "status"],
});

async function initializeTINPools() {
  const startTime = process.hrtime();
  let retries = 4;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      serviceInitializationCounter.inc({
        component: "tin_pools",
        status: "attempt",
      });

      logger.info("Initializing TIN Pools", { attempt: attempt + 1 });
      for (const userType of Object.keys(UserType)) {
        await preGeneratedTINsWithULID(userType, INITIAL_TIN_BATCH_SIZE);
        const poolSize = await redisClient.zcard(`tin_${userType.slice(0, 3)}`);
        logger.info(
          `Initialized TIN pool for ${userType} with ${poolSize} TINs`
        );
      }

      const duration = process.hrtime(startTime);
      const durationSeconds = duration[0] + duration[1] / 1e9;

      serviceInitializationCounter.inc({
        component: "tin_pools",
        status: "success",
      });
      serviceInitializationDuration.observe(
        { component: "tin_pools", status: "success" },
        durationSeconds
      );

      logger.info("Successfully initialized TIN Pools", {
        duration: durationSeconds,
        attempts: attempt + 1,
      });
      return;
    } catch (error) {
      const duration = process.hrtime(startTime);
      const durationSeconds = duration[0] + duration[1] / 1e9;

      serviceInitializationCounter.inc({
        component: "tin_pools",
        status: "failure",
      });
      serviceInitializationDuration.observe(
        { component: "tin_pools", status: "failure" },
        durationSeconds
      );

      trackError(
        "tin_pool_initialization",
        "redis",
        attempt === retries - 1 ? "critical" : "medium"
      );

      logger.error("Failed to initialize TIN Pools", {
        error,
        attempt: attempt + 1,
        remainingAttempts: retries - attempt - 1,
        duration: durationSeconds,
      });

      if (attempt === retries - 1) {
        trackError("tin_pool_max_retries", "redis", "critical");
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
}

async function GracefulShutdown() {
  logger.info("Shutting down gracefully!!");
  serverHealthGauge.set(0); // Mark as unhealthy
  databaseConnectionsGauge.set(0); // No connections

  try {
    const shutdownStart = process.hrtime();

    await mongoose.connection.close();
    await disconnectConsumer();
    await disconnectUserProducer();
    await redisClient.quit();

    const shutdownDuration = process.hrtime(shutdownStart);
    const shutdownSeconds = shutdownDuration[0] + shutdownDuration[1] / 1e9;

    logger.info("Mongoose, RabbitMQ, and Redis have been disconnected!", {
      shutdownDuration: shutdownSeconds,
    });

    // Track graceful shutdown
    businessOperationCounter.inc({
      operation_type: "shutdown",
      user_type: "system",
      status: "success",
    });

    process.exit(0);
  } catch (err) {
    trackError("graceful_shutdown_failed", "system", "critical");
    logger.error("Error during shutdown!", err);
    process.exit(1);
  }
}

/** ERROR MIDDLEWARE */
app.use(NotFound);
app.use(errorHandler);

app.listen(PORT, async () => {
  const serverStartTime = process.hrtime();
  logger.info(`Auth Server running on port ${PORT}`);

  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    trackError("missing_env_var", "server_initialization", "critical");
    throw new Error("MongoDB connection string is not defined.");
  }

  try {
    // Track each initialization component
    const initSteps = [
      { name: "mongodb", fn: () => connectMongoDB(mongoUrl) },
      { name: "tin_pools", fn: initializeTINPools },
      { name: "redis", fn: () => redisClient.ping() },
      { name: "rabbitmq_consumer", fn: connectConsumer },
      { name: "rabbitmq_producer", fn: connectProducer },
    ];

    for (const step of initSteps) {
      const stepStart = process.hrtime();

      try {
        serviceInitializationCounter.inc({
          component: step.name,
          status: "attempt",
        });

        if (step.name === "redis") {
          await step.fn();
          logger.info(`Successfully connected to Redis at`);
        } else {
          await step.fn();
        }

        const stepDuration = process.hrtime(stepStart);
        const stepSeconds = stepDuration[0] + stepDuration[1] / 1e9;

        serviceInitializationCounter.inc({
          component: step.name,
          status: "success",
        });
        serviceInitializationDuration.observe(
          { component: step.name, status: "success" },
          stepSeconds
        );

        logger.info(`${step.name} initialized successfully`, {
          duration: stepSeconds,
        });
      } catch (error) {
        const stepDuration = process.hrtime(stepStart);
        const stepSeconds = stepDuration[0] + stepDuration[1] / 1e9;

        serviceInitializationCounter.inc({
          component: step.name,
          status: "failure",
        });
        serviceInitializationDuration.observe(
          { component: step.name, status: "failure" },
          stepSeconds
        );

        trackError(
          `${step.name}_initialization_failed`,
          "server_initialization",
          "critical"
        );

        throw error;
      }
    }

    const totalDuration = process.hrtime(serverStartTime);
    const totalSeconds = totalDuration[0] + totalDuration[1] / 1e9;

    // Mark server as healthy only after all components are initialized
    serverHealthGauge.set(1);

    businessOperationCounter.inc({
      operation_type: "server_startup",
      user_type: "system",
      status: "success",
    });

    logger.info("Server initialized successfully", {
      totalDuration: totalSeconds,
      components: initSteps.length,
    });
  } catch (error) {
    const totalDuration = process.hrtime(serverStartTime);
    const totalSeconds = totalDuration[0] + totalDuration[1] / 1e9;

    businessOperationCounter.inc({
      operation_type: "server_startup",
      user_type: "system",
      status: "error",
    });

    trackError("server_initialization_failed", "server_startup", "critical");

    logger.error(`Server initialization failed`, {
      error,
      totalDuration: totalSeconds,
    });

    await GracefulShutdown();
  }
});

process.on("SIGINT", GracefulShutdown);
process.on("SIGTERM", GracefulShutdown);

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  trackError("unhandled_promise_rejection", "process", "critical");
  logger.error("Unhandled Promise Rejection at:", promise, "reason:", reason);
  GracefulShutdown();
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  trackError("uncaught_exception", "process", "critical");
  logger.error("Uncaught Exception:", error);
  GracefulShutdown();
});
