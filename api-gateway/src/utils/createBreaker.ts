import CircuitBreaker from "opossum";
import logger from "../utils/logger";
import { trackCircuitBreakerEvent } from "../utils/metrics";

type AsyncAction = (...args: any[]) => Promise<any>;

const options = {
  timeout: 8000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  rollingCountTimeout: 10000,
  volumeThreshold: 5,
};

const breakers = new Map<string, CircuitBreaker>();

export function getBreaker(serviceName: string): CircuitBreaker {
  if (breakers.has(serviceName)) {
    return breakers.get(serviceName)!;
  }
  const breaker = new CircuitBreaker(
    async (fn: AsyncAction) => fn(),
    options
  );

  breaker.fallback(() => {
    logger.warn(`Circuit breaker OPEN: rejecting request for ${serviceName}`);
    trackCircuitBreakerEvent(serviceName, "reject");
    return Promise.reject({
      message: `Service ${serviceName} is currently unavailable`,
      isBreakerOpen: true,
      statusCode: 503,
    });
  });

  breaker.on("open", () => {
    logger.error(`Circuit OPEN for ${serviceName}`);
    trackCircuitBreakerEvent(serviceName, "open");
  });
  breaker.on("halfOpen", () => {
    logger.warn(`Circuit HALF-OPEN for ${serviceName}`);
    trackCircuitBreakerEvent(serviceName, "halfOpen");
  });
  breaker.on("close", () => {
    logger.info(`Circuit CLOSED for ${serviceName}`);
    trackCircuitBreakerEvent(serviceName, "close");
  });

  breaker.on("failure", () => trackCircuitBreakerEvent(serviceName, "failure"));
  breaker.on("success", () => trackCircuitBreakerEvent(serviceName, "success"));
  breaker.on("timeout", () => trackCircuitBreakerEvent(serviceName, "timeout"));
  breaker.on("reject", () => trackCircuitBreakerEvent(serviceName, "reject"));

  breakers.set(serviceName, breaker);
  return breaker;
}