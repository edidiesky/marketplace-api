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
 *
 * Hot Key Problem:
 *   At 1M rps with 10k users, some users will generate 100 rps each.
 *   ZADD + ZREMRANGEBYSCORE on a single key at 100 rps = fine.
 *   But if 1 user sends 50k rps (abuse/bot), that's a hot key.
 *   Solution: We detect abuse in the circuit breaker layer and shadow-ban
 *   the key before it saturates Redis. See circuit-breaker.ts.
 *
 * Tradeoffs vs Token Bucket:
 *   + Precise: no boundary burst allowed
 *   + Per-request audit log in the sorted set (good for debugging)
 *   - O(N) space per user where N = requests in window
 *   - Slightly higher latency under load (ZREMRANGEBYSCORE is O(log N + M))
 *   - At 1M rps across 10k users: ~100 entries/set avg = manageable
 *     but at 10k rps per user: 10k entries per ZADD = problematic
 *     -> Mitigation: use token bucket for high-frequency users (see rules engine)
 *
 * Memory estimate:
 *   Each sorted set entry = ~64 bytes (UUID 36 + score 8 + overhead)
 *   At 1000 req/window per user, 10k users = 10M entries = 640MB
 *   This is the primary reason to use token bucket at scale, not sliding log.
 *   Sliding log is ideal for strict per-IP rate limiting at lower rates.
 */

import { RateLimitResult } from './token-bucket';
import { v4 as uuidv4 } from 'uuid';

export interface SlidingWindowLogConfig {
  limit: number;   
  windowMs: number;
  keyPrefix: string;
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
    private readonly redis: RedisClient,
    private readonly config: SlidingWindowLogConfig,
  ) {}

  private async loadScript(): Promise<string> {
    if (this.scriptSha) return this.scriptSha;
    this.scriptSha = await (this.redis as any).script('LOAD', SLIDING_WINDOW_LUA) as string;
    return this.scriptSha;
  }

  async consume(userId: string): Promise<RateLimitResult> {
    const key = `${this.config.keyPrefix}:swl:${userId}`;
    const now = Date.now();
    const requestId = uuidv4();

    try {
      const sha = await this.loadScript();
      const result = await (this.redis as any).evalsha(
        sha, 1, key,
        now,
        this.config.windowMs,
        this.config.limit,
        requestId,
      ) as [number, number, number];

      return {
        allowed: result[0] === 1,
        remaining: result[1],
        retryAfterMs: result[2],
        algorithm: 'sliding-window-log',
        consumedTokens: 1,
      };
    } catch (err: any) {
      if (err.message?.includes('NOSCRIPT')) {
        this.scriptSha = null;
        return this.consume(userId);
      }
      throw err;
    }
  }

  async inspect(userId: string): Promise<number> {
    const key = `${this.config.keyPrefix}:swl:${userId}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    await (this.redis as any).zremrangebyscore(key, '-inf', windowStart);
    return (this.redis as any).zcard(key) as Promise<number>;
  }
}