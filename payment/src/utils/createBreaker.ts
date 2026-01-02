import CircuitBreaker from "opossum";
import logger from "../utils/logger";
import { trackCircuitBreakerEvent } from "../utils/metrics";

type ProxyFunction = () => Promise<any>;

const options = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  rollingCountTimeout: 10000,
  volumeThreshold: 8,
};

export function getBreaker(serviceName: string,requestPath:string, action: ProxyFunction) {
  const breaker = new CircuitBreaker(action, options);
  breaker.fallback(() => {
    logger.warn(`Circuit breaker OPEN - rejecting request for ${serviceName}`);
    trackCircuitBreakerEvent(serviceName, "reject");
    return Promise.reject({
      message: `Service ${serviceName} unavailable`,
      isBreakerOpen: true,
    });
  });

  breaker.on("open", () => {
    logger.error(`Circuit BREAKER OPEN for ${serviceName}`);
    trackCircuitBreakerEvent(serviceName, "open");
  });
  breaker.on("halfOpen", () => {
    logger.warn(`Circuit HALF-OPEN (testing) for ${serviceName}`);
    trackCircuitBreakerEvent(serviceName, "halfOpen");
  });
  breaker.on("close", () => {
    logger.info(`Circuit CLOSED (healthy) for ${serviceName}`);
    trackCircuitBreakerEvent(serviceName, "close");
  });
  breaker.on("failure", () => trackCircuitBreakerEvent(serviceName, "failure"));
  breaker.on("success", () => trackCircuitBreakerEvent(serviceName, "success"));
  breaker.on("timeout", () => trackCircuitBreakerEvent(serviceName, "timeout"));
  breaker.on("reject", () => trackCircuitBreakerEvent(serviceName, "reject"));
  return breaker;
}
