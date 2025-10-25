import { nanoid } from "nanoid";
import redisClient from "../config/redis";
import logger from "../utils/logger";
import { getNanoid } from "./resetTokenGenerator";

// Generate and store TINs in a Redis sorted set
export const preGeneratedTINsWithULID = async (
  userType: string,
  batchSize: number = 10
): Promise<void> => {
  const nanoidFunc = await getNanoid();
  const prefix = userType.slice(0, 3).toUpperCase();
  const redisKey = `tin_${prefix}`;

  const tins = Array.from({ length: batchSize }, (_, i) => ({
    score: Date.now() + i,
    value: `${prefix}-${nanoidFunc(7)}`,
  }));

  try {
    // Using Redis transaction to ensure atomicity
    const multi = redisClient.multi();
    for (const tin of tins) {
      multi.zadd(redisKey, tin.score, tin.value); // K S M
    }
    multi.expire(redisKey, 7 * 24 * 60 * 60); 
    await multi.exec();
    logger.info(`Pre-generated ${batchSize} TINs for ${userType}`);
  } catch (error) {
    logger.error(`Failed to pre-generate TINs for ${userType}`, { error });
    throw error;
  }
};

// Retrieve a single TIN from the sorted set
export const getSingleTINFromPool = async (
  userType: string,
  maxRetries: number = 5
): Promise<string> => {
  const prefix = userType.slice(0, 3).toUpperCase();
  const redisKey = `tin_${prefix}`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Atomically pop the TIN with the lowest score (FIFO)
      const result = await redisClient.zpopmin(redisKey, 1);
      const [tin] = result || [];
      if (!tin) {
        // Replenish pool if empty
        await preGeneratedTINsWithULID(userType, 30);
        continue;
      }

      // Check pool size and replenish if low
      const poolSize = await redisClient.zcard(redisKey);
      if (poolSize < 50) {
        // Using Redis lock to prevent concurrent replenishment
        const lockKey = `lock:tin_${prefix}`;
        const acquired = await redisClient.setnx(lockKey, "locked");
        if (acquired) {
          try {
            await preGeneratedTINsWithULID(userType, 30);
            await redisClient.expire(lockKey, 10);
          } finally {
            await redisClient.del(lockKey);
          }
        }
      }
      return tin as string;
    } catch (error) {
      logger.error(`TIN retrieval attempt ${attempt + 1} failed`, {
        error,
        userType,
      });
      if (attempt === maxRetries - 1) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, 500 * Math.pow(2, attempt) + Math.random() * 1000)
      );
    }
  }
  throw new Error(
    `Failed to retrieve TIN for ${userType} after ${maxRetries} retries`
  );
};
