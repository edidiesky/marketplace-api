import mongoose from "mongoose";
import { app } from "./app";
import { errorHandler, NotFound } from "./middleware/error-handler";
const PORT = process.env.PORT || 4001;
// import { connectConsumer, disconnectConsumer } from "./messaging/consumer";
// import { connectProducer, disconnectUserProducer } from "./messaging/producer";
import logger from "./utils/logger";
import redisClient from "./config/redis";
import { connectMongoDB } from "./utils/connectDB";
import { UserType } from "./models/User";
import {
  trackError,
  serverHealthGauge,
  databaseConnectionsGauge,
  businessOperationCounter,
} from "./utils/metrics";
import client from "prom-client";

async function GracefulShutdown() {
  logger.info("Shutting down gracefully!!");
  serverHealthGauge.set(0); // Mark as unhealthy
  databaseConnectionsGauge.set(0); // No connections

  try {
    await mongoose.connection.close();
    await redisClient.quit();
    logger.info("Mongoose, RabbitMQ, and Redis have been disconnected!", {
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
      { name: "redis", fn: () => redisClient.ping() },
      // { name: "rabbitmq_consumer", fn: connectConsumer },
      // { name: "rabbitmq_producer", fn: connectProducer },
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
        throw error;
      }
    }

    const totalDuration = process.hrtime(serverStartTime);
    const totalSeconds = totalDuration[0] + totalDuration[1] / 1e9;
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
