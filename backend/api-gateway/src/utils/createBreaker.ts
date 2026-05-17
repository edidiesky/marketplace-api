import CircuitBreaker from "opossum";
import logger         from "./logger";
import { SERVICE_NAME } from "../constants";

const breakerMap = new Map<string, CircuitBreaker>();

const BREAKER_OPTIONS: CircuitBreaker.Options = {
  timeout:              8_000,
  errorThresholdPercentage: 50,
  resetTimeout:         30_000,
  volumeThreshold:      5,
};

export function getBreaker(serviceName: string): CircuitBreaker {
  if (breakerMap.has(serviceName)) {
    return breakerMap.get(serviceName)!;
  }

  const breaker = new CircuitBreaker(
    async (fn: () => Promise<unknown>) => fn(),
    { ...BREAKER_OPTIONS, name: serviceName }
  );

  breaker.on("open", () => {
    logger.warn("circuit_breaker_opened", {
      event:   "circuit_breaker_opened",
      service: SERVICE_NAME,
      target:  serviceName,
    });
  });

  breaker.on("halfOpen", () => {
    logger.info("circuit_breaker_half_open", {
      event:   "circuit_breaker_half_open",
      service: SERVICE_NAME,
      target:  serviceName,
    });
  });

  breaker.on("close", () => {
    logger.info("circuit_breaker_closed", {
      event:   "circuit_breaker_closed",
      service: SERVICE_NAME,
      target:  serviceName,
    });
  });

  breaker.on("fallback", () => {
    logger.warn("circuit_breaker_fallback", {
      event:   "circuit_breaker_fallback",
      service: SERVICE_NAME,
      target:  serviceName,
    });
  });

  breakerMap.set(serviceName, breaker);
  return breaker;
}