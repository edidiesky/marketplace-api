import { IOnboarding } from "../types";
import redisClient from "../config/redis";
import logger from "./logger";
import { ONBOARDING_EXPIRATION_SEC, SERVICE_NAME } from "../constants";

export const getRedisOnboardingKey = (email: string): string =>
  `selleasi:${email}:onboarding`;

export const setOnboardingData = async (
  data: Partial<IOnboarding> & { email: string }
): Promise<IOnboarding> => {
  const key = getRedisOnboardingKey(data.email);
  try {
    const existing = await redisClient.get(key);
    const current: IOnboarding = existing
      ? (JSON.parse(existing) as IOnboarding)
      : {
          email:     data.email,
          step:      "email",
          createdAt: new Date().toISOString(),
        };
    Object.assign(current, data);
    await redisClient.setex(
      key,
      ONBOARDING_EXPIRATION_SEC,
      JSON.stringify(current)
    );
    return current;
  } catch (err) {
    logger.error("onboarding_redis_set_failed", {
      event:   "onboarding_redis_set_failed",
      service: SERVICE_NAME,
      email:   data.email,
      error:   err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
};

export const getOnboardingState = async (
  email: string
): Promise<IOnboarding | null> => {
  const key  = getRedisOnboardingKey(email);
  const data = await redisClient.get(key);
  return data ? (JSON.parse(data) as IOnboarding) : null;
};

export const deleteOnboardingState = async (email: string): Promise<void> => {
  const key = getRedisOnboardingKey(email);
  await redisClient.del(key);
};