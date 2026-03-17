import Redis from "ioredis";
import { redisClient } from "../redis/redisClient";

export interface TokenBucketConfig {
  capacity: number; // max tokens (burst limit)
  refillRate: number; // tokens per second
  windowMs: number; // refill window in ms (used for TTL)
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  algorithm: string;
  consumedTokens: number;
}

const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
end

local elapsed = now - lastRefill
tokens = math.min(capacity, tokens + elapsed * refillRate)
lastRefill = now

if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
  redis.call('PEXPIRE', key, ttl)
  return {1, math.floor(tokens), 0}
else
  local waitMs = math.ceil((1 - tokens) / refillRate)
  redis.call('HSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
  redis.call('PEXPIRE', key, ttl)
  return {0, 0, waitMs}
end
`;

export class TokenBucketLimiter {
  private readonly script: string;
  private scriptSha: string | null = null;

  constructor(
    private readonly redis: Redis,
    private readonly config: TokenBucketConfig,
  ) {
    this.script = TOKEN_BUCKET_LUA;
  }

  private async loadScript(): Promise<string> {
    if (this.scriptSha) return this.scriptSha;
    // SCRIPT LOAD caches Lua on Redis side, we send SHA on subsequent calls
    // This saves bandwidth at 1M rps - sending 300 bytes vs 20 bytes per call
    this.scriptSha = (await (this.redis as any).script(
      "LOAD",
      this.script,
    )) as string;
    return this.scriptSha;
  }

  async consume(userId: string, tokens = 1): Promise<RateLimitResult> {
    const key = `${this.config.keyPrefix}:tb:${userId}`;
    const now = Date.now();
    const refillRatePerMs = this.config.refillRate / 1000;
    const ttl = this.config.windowMs * 2;

    try {
      const sha = await this.loadScript();
      const result = (await (this.redis as any).evalsha(
        sha,
        1,
        key,
        this.config.capacity,
        refillRatePerMs,
        now,
        tokens,
        ttl,
      )) as [number, number, number];

      return {
        allowed: result[0] === 1,
        remaining: result[1],
        retryAfterMs: result[2],
        algorithm: "token-bucket",
        consumedTokens: tokens,
      };
    } catch (err: any) {
      if (err.message?.includes("NOSCRIPT")) {
        this.scriptSha = null;
        return this.consume(userId, tokens);
      }
      throw err;
    }
  }
}

// const TOKEN_SCRIPT = `
// local key = KEYS[1]
// local capacity = tonumber(ARGV[1]])
// local refillRate = tonumber(ARGV[2]])
// local now = tonumber(ARGV[3]])
// local ttl = tonumber(ARGV[4]])
// local requested = 1

// local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
// local tokens = tonumber(bucket[1]])
// local lastRefill = tonumber(bucket[2]])

// if tokens == nil then
//   tokens = capacity
//   lastRefill = now
// end

// local elapsed = now - lastRefill
// tokens = Math.min(capacity, token + elapsed * refillRate)
// lastRefill = now

// if tokens >= 1 then
//   tokens = tokens - 1
//   redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
//   redis.call('PEXPIRE', key, ttl)
//   return {1, math.floor(tokens), 0}
// else
//   local waitMs = Math.ceil((1 - tokens) / refillRate)
//   redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
//   redis.call('PEXPIRE', key, ttl)
//   return {0, 0, waitMs}
// end
// `

// // const result = await redisClient.evalsha(TOKEN_SCRIPT, 1, "KEYS", "CAP", 'REFILLRATE', 'DATE', 'ttl')
