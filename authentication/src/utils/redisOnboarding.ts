import { IOnboarding } from "../types";
import redisClient from "../config/redis";
import logger from "./logger";
import { ONBOARDING_EXPIRATION_SEC } from "../constants";

// GET REDIS KEY  DATA
export const getRedisOnboardingKey = (email: string) => {
  return `selleasi:${email}:onboarding`;
};
// SETONBOARDING DATA
export const setOnboardingData = async (data: IOnboarding) => {
  try {
    // check if data exists in the cache, and mutate the existing one

    let existingKey = await getRedisOnboardingKey(data.email);
    let existing = await redisClient.get(existingKey);
    let onboardingData: IOnboarding = existing
      ? JSON.parse(existing)
      : {
          email: data.email,
          step: "email",
          createdAt: new Date().toISOString(),
        };
    Object.assign(onboardingData, data);
    await redisClient.setex(
      existingKey,
      ONBOARDING_EXPIRATION_SEC,
      JSON.stringify(onboardingData)
    );
    // else just assign the value tot he key

    return onboardingData;
  } catch (error) {
    logger.error("Failed to set redis data during onboarding:", {
      message:
        error instanceof Error
          ? error.message
          : "An unknown has occurred during onboarding",
      stack:
        error instanceof Error
          ? error.stack
          : "An unknown has occurred during onboarding",
    });
  }
};
// GET ONBOARDING DATA
export const getOnboardingState = async (email: string) => {
  const key = getRedisOnboardingKey(email);
  const data = await redisClient.get(key);
  return data ? (JSON.parse(data) as IOnboarding) : null;
};

// DELETE ONBOARDING DATA
export const deleteOnboardingState = async (email: string) => {
  const key = getRedisOnboardingKey(email);
  await redisClient.del(key);
};
