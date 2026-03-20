import client, { Counter } from "prom-client";
import { Request, Response } from "express";

const register = new client.Registry();
client.collectDefaultMetrics({
  prefix: "api_gateway_service_",
  register,
});
/**  */

export const httpResponseHistogram = new client.Histogram({
  name: "Api_Gateway_HTTP_request_duration",
  help: "Api Gateway HTTP request duration in seconds",
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 3, 5, 10],
  registers: [register],
  labelNames: ["method", "route", "status_code", "success"],
});

export const databaseQueryTimeHistogram = new client.Histogram({
  name: "Rules_database_query_duration_seconds",
  help: "Rules Database query duration in seconds",
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
  labelNames: ["operation", "success", "table"],
});

export const cacheHitCounter = new client.Counter({
  name: "Rules_cache_hits_total",
  help: "Total Rules cache hits",
  labelNames: ["cache_type", "operation"],
  registers: [register],
});

export const cacheMissCounter = new client.Counter({
  name: "Rules_cache_miss_total",
  help: "Total Rules cache miss",
  labelNames: ["cache_type", "operation"],
  registers: [register],
});

export const serverHealthGauge = new client.Gauge({
  name: "server_health_gauge",
  help: "Total Server health guage",
  labelNames: ["cache_type", "operation"],
  registers: [register],
});


// serverHealthGauge

export const errorCounter = new client.Counter({
  name: "Rules_service_errors_total",
  help: "Total number of errors in Rules service",
  labelNames: ["error_type", "operation", "severity"],
  registers: [register],
});

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


/** MEASURE TOTAL HTTP REQUEST  */
export const httpRequestCounter = new client.Counter({
  name: "Api_Gateway_http_request_total",
  help: "The total number of Tax Template API requests",

  labelNames: ["method", "route", "status_code", "success"],
});


const circuitEvents = new Counter({
  name: 'api_gateway_circuit_breaker_events_total',
  help: 'Api Gateway Circuit breaker state changes',
  labelNames: ['service', 'state'],
  registers: [register],
});

export async function measureDatabaseQuery<T>(
  operation: string,
  query: () => Promise<T>,
  table: string = "Carts"
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

export const trackCircuitBreakerEvent = (service: string, state: string) => {
  circuitEvents.labels(service, state).inc();
};
export async function reqReplyTime(
  req: Request,
  res: Response,
  startTime: [number, number]
) {
  const duration = process.hrtime(startTime);
  const durationSeconds = duration[0] + duration[1] / 1e9;
  const success = res.statusCode < 400 ? "true" : "false";

  httpResponseHistogram.observe(
    {
      method: req.method,
      route: req.url,
      status_code: res.statusCode.toString(),
      success,
    },
    durationSeconds
  );

  httpRequestCounter.inc({
    method: req.method,
    route: req.url,
    status_code: res.statusCode.toString(),
    success,
  });
}

export const apiGatewayRegistry = register;

