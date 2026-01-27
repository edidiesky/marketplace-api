import { Request, Response } from "express";
import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({
  prefix: "user_service_",
  register,
});

// Existing metrics (improved)
export const requestResponseTimeHistogram = new client.Histogram({
  name: "user_http_request_duration_seconds",
  help: "user API duration in seconds",
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
  labelNames: ["method", "route", "status_code", "success"],
});

export const httpRequestCounter = new client.Counter({
  name: "user_http_request_total",
  help: "The total number of user API requests",
  labelNames: ["method", "route", "status_code", "success"],
  registers: [register],
});

/**
 * @description Error Rate metrics
 */

export const httpErrorsByRoute = new client.Counter({
  name: "user_http_errors_total",
  help: "HTTP errors by route and status code",
  labelNames: ["method", "route", "status_code", "error_type"],
  registers: [register],
});

export const httpErrorRate = new client.Gauge({
  name: "user_http_error_rate",
  help: "Current HTTP error rate (errors/sec)",
  labelNames: ["route"],
  registers: [register],
});

export const databaseQueryTimeHistogram = new client.Histogram({
  name: "user_database_query_duration_seconds",
  help: "user Database query duration in seconds",
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
  labelNames: ["operation", "success", "table"],
});

// Error tracking metrics
export const errorCounter = new client.Counter({
  name: "user_service_errors_total",
  help: "Total number of errors in user service",
  labelNames: ["error_type", "operation", "severity"],
  registers: [register],
});

// Cache metrics
export const cacheHitCounter = new client.Counter({
  name: "user_cache_hits_total",
  help: "Total cache hits",
  labelNames: ["cache_type", "operation"],
  registers: [register],
});

export const cacheMissCounter = new client.Counter({
  name: "user_cache_misses_total",
  help: "Total cache misses",
  labelNames: ["cache_type", "operation"],
  registers: [register],
});

// Business metrics
export const businessOperationCounter = new client.Counter({
  name: "user_business_operations_total",
  help: "Total business operations",
  labelNames: ["operation_type", "user_type", "status"],
  registers: [register],
});

export const businessOperationDuration = new client.Histogram({
  name: "user_business_operation_duration_seconds",
  help: "Business operation duration in seconds",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  labelNames: ["operation_type", "user_type"],
  registers: [register],
});

// Queue/async operation metrics
export const queueDepthGauge = new client.Gauge({
  name: "user_service_queue_depth",
  help: "Current queue depth",
  labelNames: ["queue_name"],
  registers: [register],
});

// Helper functions for error tracking
export const trackError = (
  errorType: string,
  operation: string,
  severity: "low" | "medium" | "high" | "critical" = "medium"
) => {
  errorCounter.inc({ error_type: errorType, operation, severity });
};

export const trackCacheHit = (cacheType: string, operation: string) => {
  cacheHitCounter.inc({ cache_type: cacheType, operation });
};

export const trackCacheMiss = (cacheType: string, operation: string) => {
  cacheMissCounter.inc({ cache_type: cacheType, operation });
};

// Enhanced database query measurement with error tracking
export async function measureDatabaseQuery<T>(
  operation: string,
  query: () => Promise<T>,
  table: string = "users"
): Promise<T> {
  const startTime = process.hrtime();
  const labels = { operation, success: "true", table };

  try {
    const result = await query();
    const duration = process.hrtime(startTime);
    const durationSeconds = duration[0] + duration[1] / 1e9;

    databaseQueryTimeHistogram.observe(labels, durationSeconds);

    // Track slow queries (> 1 second)
    if (durationSeconds > 1) {
      trackError("slow_query", operation, "medium");
    }

    // Track very slow queries (> 5 seconds)
    if (durationSeconds > 5) {
      trackError("very_slow_query", operation, "high");
    }

    return result;
  } catch (error) {
    const duration = process.hrtime(startTime);
    const durationSeconds = duration[0] + duration[1] / 1e9;

    labels.success = "false";
    databaseQueryTimeHistogram.observe(labels, durationSeconds);

    // Track database errors
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        trackError("database_timeout", operation, "high");
      } else if (error.message.includes("connection")) {
        trackError("database_connection", operation, "critical");
      } else {
        trackError("database_query_error", operation, "medium");
      }
    }

    throw error;
  }
}

export const serverHealthGauge = new client.Gauge({
  name: "user_service_health_status",
  help: "Overall service health status (1=healthy, 0=unhealthy)",
});

// Enhanced HTTP metrics with error classification
export async function reqReplyTime(
  req: Request,
  res: Response,
  startTime: [number, number]
) {
  const duration = process.hrtime(startTime);
  const durationSeconds = duration[0] + duration[1] / 1e9;
  const success = res.statusCode < 400 ? "true" : "false";

  const labels = {
    method: req.method,
    route: req.route?.path || req.url,
    status_code: res.statusCode.toString(),
    success,
  };

  requestResponseTimeHistogram.observe(labels, durationSeconds);
  httpRequestCounter.inc(labels);

  if (res.statusCode >= 400) {
    const errorType = res.statusCode >= 500 ? "server_error" : "client_error";
    httpErrorsByRoute.inc({
      method: req.method,
      route: req.route?.path || req.url,
      status_code: res.statusCode,
      error_type: errorType,
    });
  }
  // Track slow requests
  if (durationSeconds > 0.4) {
    trackError("slow_request", `${req.method} ${req.route?.path}`, "medium");
  }

  // Track very slow requests
  if (durationSeconds > 1) {
    trackError("very_slow_request", `${req.method} ${req.route?.path}`, "high");
  }

  // Track HTTP errors
  if (res.statusCode >= 400) {
    const errorType = res.statusCode >= 500 ? "server_error" : "client_error";
    const severity = res.statusCode >= 500 ? "high" : "low";
    trackError(errorType, `${req.method} ${req.route?.path}`, severity);
  }
}

// Business operation tracker
export async function measureBusinessOperation<T>(
  operationType: string,
  userType: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = process.hrtime();

  try {
    const result = await operation();
    const duration = process.hrtime(startTime);
    const durationSeconds = duration[0] + duration[1] / 1e9;

    businessOperationCounter.inc({
      operation_type: operationType,
      user_type: userType,
      status: "success",
    });

    businessOperationDuration.observe(
      { operation_type: operationType, user_type: userType },
      durationSeconds
    );

    return result;
  } catch (error) {
    businessOperationCounter.inc({
      operation_type: operationType,
      user_type: userType,
      status: "error",
    });

    trackError("business_operation_error", operationType, "medium");
    throw error;
  }
}


export const userRegistry = register;
