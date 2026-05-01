/**
 * Sliding Window Log Algorithm
 *
 * Data structure: Redis Sorted Set
 *   member = requestId (UUID)
 *   score  = timestamp (unix ms)
 *
 * On each request:
 *   1. ZREMRANGEBYSCORE key 0 (now - windowMs)  -> prune expired entries
 *   2. ZCARD key                                 -> count requests in window
 *   3. If count < limit: ZADD key now requestId -> record request
 *   4. PEXPIRE key windowMs                      -> garbage collect key
 *
 * All 4 ops run in a single Lua script for atomicity.
 */


import { v4 as uuidv4 } from "uuid";
import { RateLimitResult } from "./tokenBucketAlgorithm";
import Redis from "ioredis";

export interface SlidingWindowLogConfig {
  limit: number;
  windowMs: number;
  keyPrefix: string;
}

/**
 * Per-call override. Shadows instance config for a single consume() call.
 */
export interface SlidingWindowCallOverride {
  limit?: number;
  windowMs?: number;
}

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local requestId = ARGV[4]
local windowStart = now - windowMs

-- prune expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

-- count current window
local count = redis.call('ZCARD', key)

if count < limit then
  -- record this request
  redis.call('ZADD', key, now, requestId)
  redis.call('PEXPIRE', key, windowMs)
  local remaining = limit - count - 1
  return {1, remaining, 0}
else
  -- find oldest entry to compute retry-after
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfterMs = 0
  if oldest[2] then
    retryAfterMs = math.ceil(tonumber(oldest[2]) + windowMs - now)
  end
  redis.call('PEXPIRE', key, windowMs)
  return {0, 0, retryAfterMs}
end
`;


export class SlidingWindowLogLimiter {
  private scriptSha: string | null = null;

  constructor(
    private readonly redis: Redis,
    private readonly config: SlidingWindowLogConfig,
  ) {}

  private async loadScript(): Promise<string> {
    if (this.scriptSha) return this.scriptSha;
    this.scriptSha = (await (this.redis as any).script(
      "LOAD",
      SLIDING_WINDOW_LUA,
    )) as string;
    return this.scriptSha;
  }

  /**
   * consume a slot for the given key.
   *
   * override.limit    - shadows instance config.limit for this call only
   * override.windowMs - shadows instance config.windowMs for this call only
   *
   * The key is a composite (userId:ruleId) built by the caller.
   */
  async consume(
    key: string,
    override: SlidingWindowCallOverride = {},
  ): Promise<RateLimitResult> {
    const limit = override.limit ?? this.config.limit;
    const windowMs = override.windowMs ?? this.config.windowMs;

    const redisKey = `${this.config.keyPrefix}:swl:${key}`;
    const now = Date.now();
    const requestId = uuidv4();

    try {
      const sha = await this.loadScript();
      const result = (await (this.redis as any).evalsha(
        sha,
        1,
        redisKey,
        now,
        windowMs,
        limit,
        requestId,
      )) as [number, number, number];

      return {
        allowed: result[0] === 1,
        remaining: result[1],
        retryAfterMs: result[2],
        algorithm: "sliding-window-log",
        consumedTokens: 1,
      };
    } catch (err: any) {
      if (err.message?.includes("NOSCRIPT")) {
        this.scriptSha = null;
        return this.consume(key, override);
      }
      throw err;
    }
  }

  async inspect(key: string, windowMsOverride?: number): Promise<number> {
    const windowMs = windowMsOverride ?? this.config.windowMs;
    const redisKey = `${this.config.keyPrefix}:swl:${key}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    await (this.redis as any).zremrangebyscore(redisKey, "-inf", windowStart);
    return (this.redis as any).zcard(redisKey) as Promise<number>;
  }
}