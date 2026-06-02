import mongoose from "mongoose";
import logger   from "../utils/logger";
import { SERVICE_NAME } from "../constants";

const MAX_RETRIES   = 5;
const BASE_DELAY_MS = 3_000;
const MAX_DELAY_MS  = 30_000;

function getJitter(): number {
  return Math.random() * 1_000;
}

function classifyError(err: unknown): {
  errorType: string;
  severity:  "low" | "medium" | "high" | "critical";
  retryable: boolean;
} {
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  const code    = (err as { code?: string }).code;

  if (message.includes("whitelist") || message.includes("ip")) {
    return { errorType: "ip_whitelist",       severity: "critical", retryable: false };
  }
  if (message.includes("authentication") || message.includes("auth")) {
    return { errorType: "authentication",     severity: "critical", retryable: false };
  }
  if (message.includes("timeout")) {
    return { errorType: "connection_timeout", severity: "high",     retryable: true  };
  }
  if (message.includes("network")) {
    return { errorType: "network",            severity: "high",     retryable: true  };
  }
  if (code === "EAI_AGAIN") {
    return { errorType: "dns_resolution",     severity: "high",     retryable: true  };
  }
  if (message.includes("econnrefused")) {
    return { errorType: "connection_refused", severity: "high",     retryable: true  };
  }
  if (message.includes("enotfound")) {
    return { errorType: "host_not_found",     severity: "high",     retryable: true  };
  }

  return { errorType: "unknown", severity: "high", retryable: true };
}

function registerConnectionEvents(): void {
  mongoose.connection.on("disconnected", () => {
    logger.warn("mongodb_disconnected", {
      event:   "mongodb_disconnected",
      service: SERVICE_NAME,
    });
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("mongodb_reconnected", {
      event:   "mongodb_reconnected",
      service: SERVICE_NAME,
    });
  });

  mongoose.connection.on("error", (err: Error) => {
    logger.error("mongodb_connection_error", {
      event:   "mongodb_connection_error",
      service: SERVICE_NAME,
      error:   err.message,
    });
  });

  mongoose.connection.on("close", () => {
    logger.info("mongodb_connection_closed", {
      event:   "mongodb_connection_closed",
      service: SERVICE_NAME,
    });
  });
}

export async function connectMongoDB(mongoUrl: string): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const start = process.hrtime.bigint();

    try {
      await mongoose.connect(mongoUrl, {
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS:          45_000,
        connectTimeoutMS:         30_000,
        retryWrites:              true,
        retryReads:               true,
        minPoolSize:              10,
        maxPoolSize:              50,
      });

      const ms = Number(process.hrtime.bigint() - start) / 1e6;

      registerConnectionEvents();

      logger.info("mongodb_connected", {
        event:      "mongodb_connected",
        service:    SERVICE_NAME,
        attempt,
        durationMs: ms.toFixed(2),
      });

      return;
    } catch (err) {
      const ms           = Number(process.hrtime.bigint() - start) / 1e6;
      const { errorType, severity, retryable } = classifyError(err);
      const isLast       = attempt === MAX_RETRIES;

      logger.error("mongodb_connection_attempt_failed", {
        event:             "mongodb_connection_attempt_failed",
        service:           SERVICE_NAME,
        attempt,
        maxRetries:        MAX_RETRIES,
        durationMs:        ms.toFixed(2),
        errorType,
        severity,
        retryable,
        remainingAttempts: MAX_RETRIES - attempt,
        error:             err instanceof Error ? err.message : String(err),
      });

      if (!retryable || isLast) {
        logger.error("mongodb_connection_failed_permanently", {
          event:       "mongodb_connection_failed_permanently",
          service:     SERVICE_NAME,
          errorType,
          totalAttempts: attempt,
        });
        throw new Error(
          `Failed to connect to MongoDB after ${attempt} attempt(s). Reason: ${errorType}`
        );
      }

      const delay =
        Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS) +
        getJitter();

      logger.info("mongodb_connection_retrying", {
        event:      "mongodb_connection_retrying",
        service:    SERVICE_NAME,
        nextAttempt: attempt + 1,
        delayMs:    delay.toFixed(0),
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}