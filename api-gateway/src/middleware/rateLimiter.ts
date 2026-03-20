import { Request, Response, NextFunction } from "express";
import { rulesEngine } from "../rules/engine";
import { TokenBucketLimiter } from "../algorithms/tokenBucketAlgorithm";
import { SlidingWindowLogLimiter } from "../algorithms/slidingWindowAlgorithm";
import { redisClient } from "../redis/redisClient";
import logger from "../utils/logger";

const KEY_PREFIX = "rl:gateway";
const tokenBucket = new TokenBucketLimiter(redisClient.getClient(), {
  capacity: 60,
  refillRate: 1,
  windowMs: 60_000,
  keyPrefix: KEY_PREFIX,
});

const slidingWindow = new SlidingWindowLogLimiter(redisClient.getClient(), {
  limit: 60,
  windowMs: 60_000,
  keyPrefix: KEY_PREFIX,
});

function getRealIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const ip = forwarded.split(",")[0].trim();
    logger.info("the user's real ip:", {
      ip,
    });
    return ip;
  }
  return req.ip ?? "unknown";
}

function extractUserId(req: Request): string {
  return (req as any).user?.userId ?? getRealIp(req);
}

export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = extractUserId(req);
  const route = req.path;

  if (route === "/health" || route === "/metrics") {
    next();
    return;
  }

  try {
    if (!redisClient.isReady()) {
      logger.warn("[RateLimiter] Redis unavailable, failing open", {
        userId,
        route,
      });
      next();
      return;
    }

    // Match the best rule for this user + route
    const rule = rulesEngine.match(userId, route);

    if (!rule.enabled) {
      next();
      return;
    }

    // Select algorithm based on matched rule
    const limiter =
      rule.algorithm === "sliding-window-log" ? slidingWindow : tokenBucket;

    // For non-default rules, override the limiter config per-request
    // by using the rule's limit and windowMs as the key namespace
    const scopedKey = `${userId}:${rule.id}`;
    const result = await limiter.consume(scopedKey);

    // Set standard rate limit headers
    res.setHeader("X-RateLimit-Limit", rule.limit);
    res.setHeader("X-RateLimit-Remaining", result.remaining);
    res.setHeader("X-RateLimit-Algorithm", rule.algorithm);

    if (!result.allowed) {
      res.setHeader("Retry-After", Math.ceil(result.retryAfterMs / 1000));

      logger.warn("[RateLimiter] Request blocked", {
        userId,
        route,
        algorithm: rule.algorithm,
        retryAfterMs: result.retryAfterMs,
        ruleId: rule.id,
      });

      res.status(429).json({
        status: "error",
        error: "Too many requests",
        retryAfter: Math.ceil(result.retryAfterMs / 1000),
      });
      return;
    }

    logger.debug("[RateLimiter] Request allowed", {
      userId,
      route,
      remaining: result.remaining,
      algorithm: rule.algorithm,
    });

    next();
  } catch (err) {
    // Any unexpected error: fail open
    logger.error("[RateLimiter] Unexpected error, failing open", {
      userId,
      route,
      err: err instanceof Error ? err.message : String(err),
    });
    next();
  }
}
