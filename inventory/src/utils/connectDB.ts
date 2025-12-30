import mongoose from "mongoose";
import logger from "./logger";
import {
  trackError,
  errorCounter,
  databaseConnectionsGauge,
  serverHealthGauge,
} from "./metrics";
import client from "prom-client";
import { IInventory } from "../models/Inventory";

export const databaseConnectionAttempts = new client.Counter({
  name: "user_database_connection_attempts_total",
  help: "Total database connection attempts",
  labelNames: ["status", "error_type"],
});

export const databaseConnectionDuration = new client.Histogram({
  name: "user_database_connection_duration_seconds",
  help: "Database connection attempt duration",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  labelNames: ["status", "attempt"],
});

export const connectMongoDB = async (
  mongoUrl: string,
  maxRetries: number = 5,
  retryDelay: number = 3000
): Promise<void> => {
  serverHealthGauge.set(0);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = process.hrtime();

    try {
      // connection pooling
      await mongoose.connect(mongoUrl, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        retryWrites: true,
        retryReads: true,
        minPoolSize: 10,
        maxPoolSize: 50,
      });

      logger.info("MongoDB connected successfully", {
        attempt,
        totalAttempts: attempt,
      });
      return;
    } catch (error: any) {
      const duration = process.hrtime(startTime);
      const durationSeconds = duration[0] + duration[1] / 1e9;

      let errorType = "unknown";
      let severity: "low" | "medium" | "high" | "critical" = "high";

      if (
        error.message?.includes("whitelist") ||
        error.message?.includes("IP")
      ) {
        errorType = "ip_whitelist";
        severity = "critical";
      } else if (error.message?.includes("timeout")) {
        errorType = "connection_timeout";
        severity = "high";
      } else if (error.message?.includes("authentication")) {
        errorType = "authentication";
        severity = "critical";
      } else if (error.message?.includes("network")) {
        errorType = "network";
        severity = "high";
      } else if (error.code === "EAI_AGAIN") {
        errorType = "dns_resolution";
        severity = "high";
      }

      // Record failure metrics
      databaseConnectionAttempts.inc({
        status: "failure",
        error_type: errorType,
      });
      databaseConnectionDuration.observe(
        { status: "failure", attempt: attempt.toString() },
        durationSeconds
      );
      logger.error(`MongoDB connection attempt ${attempt} failed`, {
        error: error.message,
        code: error.code,
        errorType,
        attempt,
        duration: durationSeconds,
        remainingAttempts: maxRetries - attempt,
      });

      if (attempt === maxRetries) {
        logger.error("Max MongoDB connection retries reached", {
          error,
          totalAttempts: maxRetries,
          errorType,
        });
        throw new Error(
          `Failed to connect to MongoDB after ${maxRetries} retries: ${errorType}`
        );
      }

      const backoffDelay = retryDelay * Math.pow(2, attempt - 1);
      logger.info(`Retrying MongoDB connection in ${backoffDelay}ms`, {
        attempt: attempt + 1,
      });
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }
};

export async function withTransaction<T>(
  fn: (session: mongoose.mongo.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    logger.error("Transaction aborted", {
      message:
        error instanceof Error
          ? error.message
          : "An iunknown error did occurred during the transaction abortion",
      stack:
        error instanceof Error
          ? error.stack
          : "An iunknown error did occurred during the transaction abortion",
    });
    throw error;
  } finally {
    session.endSession();
  }
}
