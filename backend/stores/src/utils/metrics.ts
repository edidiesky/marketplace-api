import { Request, Response } from "express";
import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ prefix: "store_service_", register });

//  HTTP metrics 

export const requestResponseTimeHistogram = new client.Histogram({
  name: "store_http_request_duration_seconds",
  help: "Store API request duration in seconds",
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
  labelNames: ["method", "route", "status_code", "success"],
});

export const httpRequestCounter = new client.Counter({
  name: "store_http_request_total",
  help: "Total number of Store API requests",
  labelNames: ["method", "route", "status_code", "success"],
  registers: [register],
});

export const httpErrorsByRoute = new client.Counter({
  name: "store_http_errors_total",
  help: "HTTP errors by route and status code",
  labelNames: ["method", "route", "status_code", "error_type"],
  registers: [register],
});

//  Error tracking 

export const errorCounter = new client.Counter({
  name: "store_service_errors_total",
  help: "Total errors in Store service",
  labelNames: ["error_type", "operation", "severity"],
  registers: [register],
});

export const trackError = (
  errorType: string,
  operation: string,
  severity: "low" | "medium" | "high" | "critical" = "medium"
): void => {
  errorCounter.inc({ error_type: errorType, operation, severity });
};

//  Database metrics 

export const databaseQueryTimeHistogram = new client.Histogram({
  name: "store_database_query_duration_seconds",
  help: "Store database query duration in seconds",
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
  labelNames: ["operation", "success", "collection"],
});

export const databaseConnectionsGauge = new client.Gauge({
  name: "store_database_connections_active",
  help: "Active database connections",
  registers: [register],
});

//  Cache metrics 

export const cacheHitCounter = new client.Counter({
  name: "store_cache_hits_total",
  help: "Total cache hits",
  labelNames: ["cache_type", "operation"],
  registers: [register],
});

export const cacheMissCounter = new client.Counter({
  name: "store_cache_misses_total",
  help: "Total cache misses",
  labelNames: ["cache_type", "operation"],
  registers: [register],
});

export const trackCacheHit = (operation: string): void => {
  cacheHitCounter.inc({ cache_type: "redis", operation });
};

export const trackCacheMiss = (operation: string): void => {
  cacheMissCounter.inc({ cache_type: "redis", operation });
};

//  Business metrics 

export const storeOperationCounter = new client.Counter({
  name: "store_business_operations_total",
  help: "Total store business operations",
  labelNames: ["operation_type", "status"],
  registers: [register],
});

export const storeOperationDuration = new client.Histogram({
  name: "store_business_operation_duration_seconds",
  help: "Store business operation duration in seconds",
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
  labelNames: ["operation_type"],
  registers: [register],
});

//  Health 

export const serverHealthGauge = new client.Gauge({
  name: "store_service_health_status",
  help: "Overall service health (1=healthy, 0=unhealthy)",
  registers: [register],
});

//  Resource usage 

export const cpuUsageGauge = new client.Gauge({
  name: "store_service_cpu_usage_percent",
  help: "CPU usage percentage",
  registers: [register],
});

export const memoryUsageGauge = new client.Gauge({
  name: "store_service_memory_usage_bytes",
  help: "Memory usage in bytes",
  labelNames: ["type"],
  registers: [register],
});

export const eventLoopLagGauge = new client.Gauge({
  name: "store_service_eventloop_lag_seconds",
  help: "Event loop lag in seconds",
  registers: [register],
});

//  DB query wrapper 
export async function measureDatabaseQuery<T>(
  operation: string,
  query: () => Promise<T>,
  collection = "stores"
): Promise<T> {
  const start = process.hrtime();
  const labels = { operation, success: "true", collection };

  try {
    const result = await query();
    const [s, ns] = process.hrtime(start);
    const durationSeconds = s + ns / 1e9;
    databaseQueryTimeHistogram.observe(labels, durationSeconds);
    if (durationSeconds > 1) trackError("slow_query", operation, "medium");
    if (durationSeconds > 5) trackError("very_slow_query", operation, "high");
    return result;
  } catch (err) {
    const [s, ns] = process.hrtime(start);
    labels.success = "false";
    databaseQueryTimeHistogram.observe(labels, s + ns / 1e9);
    if (err instanceof Error) {
      if (err.message.includes("timeout"))
        trackError("database_timeout", operation, "high");
      else if (err.message.includes("connection"))
        trackError("database_connection", operation, "critical");
      else trackError("database_query_error", operation, "medium");
    }
    throw err;
  }
}

//  HTTP timing helper 

export function reqReplyTime(
  req: Request,
  res: Response,
  startTime: [number, number]
): void {
  const [s, ns] = process.hrtime(startTime);
  const durationSeconds = s + ns / 1e9;
  const success = res.statusCode < 400 ? "true" : "false";
  const labels = {
    method: req.method,
    route: req.route?.path ?? req.url,
    status_code: res.statusCode.toString(),
    success,
  };

  requestResponseTimeHistogram.observe(labels, durationSeconds);
  httpRequestCounter.inc(labels);

  if (res.statusCode >= 400) {
    const errorType = res.statusCode >= 500 ? "server_error" : "client_error";
    const severity = res.statusCode >= 500 ? "high" : "low";
    httpErrorsByRoute.inc({
      method: req.method,
      route: req.route?.path ?? req.url,
      status_code: res.statusCode,
      error_type: errorType,
    });
    trackError(errorType, `${req.method} ${req.route?.path ?? req.url}`, severity);
  }

  if (durationSeconds > 0.4) trackError("slow_request", `${req.method} ${req.route?.path}`, "medium");
  if (durationSeconds > 1) trackError("very_slow_request", `${req.method} ${req.route?.path}`, "high");
}

//  Business op wrapper 

export async function measureStoreOperation<T>(
  operationType: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = process.hrtime();
  try {
    const result = await fn();
    const [s, ns] = process.hrtime(start);
    storeOperationCounter.inc({ operation_type: operationType, status: "success" });
    storeOperationDuration.observe({ operation_type: operationType }, s + ns / 1e9);
    return result;
  } catch (err) {
    storeOperationCounter.inc({ operation_type: operationType, status: "error" });
    trackError("business_operation_error", operationType, "medium");
    throw err;
  }
}

export const storeRegistry = register;