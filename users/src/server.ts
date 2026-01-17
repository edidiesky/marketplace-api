import mongoose from "mongoose";
import { app } from "./app";
const PORT = process.env.PORT || 4001;
import logger from "./utils/logger";
import redisClient from "./config/redis";
import { connectMongoDB } from "./utils/connectDB";
import {
  trackError,
} from "./utils/metrics";
async function GracefulShutdown() {
  logger.info("Shutting down gracefully!!");
  try {
    await mongoose.connection.close();
    await redisClient.quit();
    logger.info("Mongoose, and Redis have been disconnected!", {});
    process.exit(0);
  } catch (err) {
    trackError("graceful_shutdown_failed", "system", "critical");
    logger.error("Error during shutdown!", err);
    process.exit(1);
  }
}

app.listen(PORT, async () => {
  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    throw new Error("MongoDB connection string is not defined.");
  }

  try {
    const initSteps = [
      { name: "mongodb", fn: () => connectMongoDB(mongoUrl) },
      { name: "redis", fn: () => redisClient.ping() },
    ];

    for (const step of initSteps) {
      try {
        await step.fn();
        logger.info(`${step.name} initialized successfully`, {});
      } catch (error) {
        throw error;
      }
    }

    logger.info("Server initialized successfully", {});
  } catch (error) {
    await GracefulShutdown();
  }
});

process.on("SIGINT", GracefulShutdown);
process.on("SIGTERM", GracefulShutdown);
