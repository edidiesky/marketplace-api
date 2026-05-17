import { Request, Response } from "express";
import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ prefix: "orders_service_", register });

export const requestDurationHistogram = new client.Histogram({
  name:       "orders_http_request_duration_seconds",
  help:       "Orders service HTTP request duration in seconds",
  buckets:    [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  labelNames: ["method", "route", "status_code", "success"],
  registers:  [register],
});

export const httpRequestCounter = new client.Counter({
  name:       "orders_http_request_total",
  help:       "Total HTTP requests handled by orders service",
  labelNames: ["method", "route", "status_code", "success"],
  registers:  [register],
});

export const errorCounter = new client.Counter({
  name:       "orders_service_errors_total",
  help:       "Total errors in orders service",
  labelNames: ["error_type", "operation", "severity"],
  registers:  [register],
});

export const serverHealthGauge = new client.Gauge({
  name:      "orders_service_health_status",
  help:      "Orders service health: 1=healthy 0=unhealthy",
  registers: [register],
});

export const checkoutDurationHistogram = new client.Histogram({
  name:       "orders_checkout_duration_seconds",
  help:       "Checkout operation duration including inventory reservation",
  buckets:    [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  labelNames: ["status"],
  registers:  [register],
});

export function trackError(
  errorType: string,
  operation: string,
  severity:  "low" | "medium" | "high" | "critical" = "medium"
): void {
  errorCounter.inc({ error_type: errorType, operation, severity });
}

export function reqReplyTime(
  req:       Request,
  res:       Response,
  startTime: [number, number]
): void {
  const [s, ns] = process.hrtime(startTime);
  const duration = s + ns / 1e9;
  const success  = res.statusCode < 400 ? "true" : "false";
  const labels   = {
    method:      req.method,
    route:       req.route?.path ?? req.url,
    status_code: String(res.statusCode),
    success,
  };
  requestDurationHistogram.observe(labels, duration);
  httpRequestCounter.inc(labels);
}

export const ordersRegistry = register;