export type Algorithm = "token-bucket" | "sliding-window-log";

export type UserTier = "free" | "pro" | "enterprise" | "*";

export interface RateLimitRule {
  id: string;
  route: string;
  tier: UserTier;
  algorithm: Algorithm;
  limit: number;
  windowMs: number;
  refillRate?: number;
  burstMultiplier?: number;
  enabled: boolean;
}

export interface UserOverride {
  userId: string;
  rule: RateLimitRule;
}