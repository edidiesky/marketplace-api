import { Request, Response } from "express";
import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ prefix: "subscription_service_", register });

export const requestDurationHistogram = new client.Histogram({
  name:       "subscription_http_request_duration_seconds",
  help:       "Subscription service HTTP request duration in seconds",
  buckets:    [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  labelNames: ["method", "route", "status_code", "success"],
  registers:  [register],
});

export const httpRequestCounter = new client.Counter({
  name:       "subscription_http_request_total",
  help:       "Total HTTP requests handled by subscription service",
  labelNames: ["method", "route", "status_code", "success"],
  registers:  [register],
});

export const errorCounter = new client.Counter({
  name:       "subscription_service_errors_total",
  help:       "Total errors in subscription service",
  labelNames: ["error_type", "operation", "severity"],
  registers:  [register],
});

export const serverHealthGauge = new client.Gauge({
  name:      "subscription_service_health_status",
  help:      "Subscription service health: 1=healthy 0=unhealthy",
  registers: [register],
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

export const subRegistry = register;