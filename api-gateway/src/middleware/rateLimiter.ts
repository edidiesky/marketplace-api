import { Request, Response, NextFunction } from "express";
import { rulesEngine } from "../rules/engine";
import { TokenBucketLimiter } from "../algorithms/tokenBucketAlgorithm";
import { SlidingWindowLogLimiter } from "../algorithms/slidingWindowAlgorithm";
import { redisClient } from "../redis/redisClient";
import logger from "../utils/logger";

const KEY_PREFIX = "rl:gateway";

/**
 * Shared limiter instances. These own the Redis connection and the Lua script
 * SHA cache. They do NOT own the rate limit parameters - those come from the
 * matched rule and are forwarded as per-call overrides on every consume() call.
 *
 * Instance-level config (capacity: 10, refillRate: 1) acts as the fallback
 * when no override is provided, which only happens if consume() is called
 * without an override object. In this middleware that never happens because
 * we always build the override from the matched rule.
 */
const tokenBucket = new TokenBucketLimiter(redisClient.getClient(), {
  capacity: 10,    
  refillRate: 1,    
  windowMs: 60_000, 
  keyPrefix: KEY_PREFIX,
});

const slidingWindow = new SlidingWindowLogLimiter(redisClient.getClient(), {
  limit: 10,        
  windowMs: 60_000, 
  keyPrefix: KEY_PREFIX,
});

function getRealIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const ip = forwarded.split(",")[0].trim();
    logger.info("the user's real ip:", { ip });
    return ip;
  }
  return req.ip ?? "unknown";
}

function extractUserId(req: Request): string {
  return (req as any).user?.userId ?? getRealIp(req);
}

/**
 * Compute refillRate (tokens/second) from a rule.
 *
 * If the rule carries an explicit refillRate, use it directly.
 * Otherwise derive it from limit/windowMs so the bucket refills exactly
 * once per average inter-request interval:
 *   refillRate = limit / (windowMs / 1000)
 *
 * Example: limit=4, windowMs=60_000 -> 4 / 60 = 0.0667 tokens/sec
 * At this rate a full bucket of 4 tokens refills in exactly 10 seconds.
 */
function computeRefillRate(rule: {
  limit: number;
  windowMs: number;
  refillRate?: number;
}): number {
  if (rule.refillRate != null && rule.refillRate > 0) {
    return rule.refillRate;
  }
  return rule.limit / (rule.windowMs / 1000);
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

    const rule = rulesEngine.match(userId, route);

    if (!rule.enabled) {
      next();
      return;
    }

    // Redis key: rl:gateway:tb:<userId>:<ruleId>
    const scopedKey = `${userId}:${rule.id}`;

    let result;

    if (rule.algorithm === "sliding-window-log") {
      result = await slidingWindow.consume(scopedKey, {
        limit: rule.limit,
        windowMs: rule.windowMs,
      });
    } else {
      result = await tokenBucket.consume(scopedKey, 1, {
        capacity: rule.limit,
        refillRate: computeRefillRate(rule),
        windowMs: rule.windowMs,
      });
    }

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
        limit: rule.limit,
        windowMs: rule.windowMs,
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
      limit: rule.limit,
    });

    next();
  } catch (err) {
    logger.error("[RateLimiter] Unexpected error, failing open", {
      userId,
      route,
      err: err instanceof Error ? err.message : String(err),
    });
    next();
  }
}