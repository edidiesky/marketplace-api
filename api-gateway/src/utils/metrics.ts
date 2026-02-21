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
