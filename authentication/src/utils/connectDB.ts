

import mongoose from "mongoose";
import logger from "./logger";

export const connectMongoDB = async (
  mongoUrl: string,
  maxRetries: number = 5,
  retryDelay: number = 3000
): Promise<void> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = process.hrtime();

    try {
      await mongoose.connect(mongoUrl, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        retryWrites: true,
        retryReads: true,
        minPoolSize:10,
        maxPoolSize:50,
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

      // Wait before retry with exponential backoff
      const backoffDelay = retryDelay * Math.pow(2, attempt - 1);
      logger.info(`Retrying MongoDB connection in ${backoffDelay}ms`, {
        attempt: attempt + 1,
      });
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }
};
