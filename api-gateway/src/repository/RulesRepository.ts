import RulesModel, { IRules } from "../models/Rules";
import { IRulesRepository } from "./IRulesRepository";
import logger from "../utils/logger";
import mongoose, { FilterQuery, Types } from "mongoose";
import { measureDatabaseQuery } from "../utils/metrics";
import { redisClient } from "../redis/redisClient";


export class RulesRepository implements IRulesRepository {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = "Rules";

  private getSingleCacheKey(ruleId: string): string {
    return `${this.CACHE_PREFIX}:rule:${ruleId}`;
  }

  private getExistsCacheKey(idValue: string, resource: string): string {
    return `${this.CACHE_PREFIX}:exists:${idValue}:${resource}`;
  }

  private getSearchCacheKey(query: any, skip: number, limit: number): string {
    return `${this.CACHE_PREFIX}:search:${JSON.stringify({ query, skip, limit })}`;
  }

  private async invalidateSearchCaches(): Promise<void> {
    try {
      const redis = redisClient.getClient();
      const pattern = `${this.CACHE_PREFIX}:search:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info("Invalidated Rules search caches", { count: keys.length });
      }
    } catch (error) {
      logger.error("Failed to invalidate search caches", { error });
    }
  }

  private async setCache(key: string, data: any): Promise<void> {
    try {
      await redisClient.getClient().set(key, JSON.stringify(data), "EX", this.CACHE_TTL);
      logger.info("Rules cache set", { key });
    } catch (error) {
      logger.warn("Cache write failed", {
        key,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async getCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await redisClient.getClient().get(key);
      if (cached) return JSON.parse(cached) as T;
    } catch (error) {
      logger.warn("Cache read failed", { key, error });
    }
    return null;
  }

  private async deleteCache(...keys: string[]): Promise<void> {
    try {
      await redisClient.getClient().del(...keys);
    } catch (error) {
      logger.warn("Cache delete failed", { keys, error });
    }
  }

  async getRules(
    query: FilterQuery<IRules>,
    skip: number,
    limit: number,
  ): Promise<IRules[] | null> {
    const cacheKey = this.getSearchCacheKey(query, skip, limit);
    const cached = await this.getCache<IRules[]>(cacheKey);
    if (cached) {
      logger.debug("Rules search cache hit", { cacheKey });
      return cached;
    }

    const rules = await measureDatabaseQuery("fetch_all_rules", () =>
      RulesModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean().exec(),
    );

    await this.setCache(cacheKey, rules);
    return rules as IRules[];
  }

  async getSingleRules(ruleId: string): Promise<IRules | null> {
    const cacheKey = this.getSingleCacheKey(ruleId);
    const cached = await this.getCache<IRules>(cacheKey);
    if (cached) {
      logger.debug("Rules single cache hit", { cacheKey });
      return cached;
    }

    const rule = await measureDatabaseQuery("fetch_single_rule", () =>
      RulesModel.findById(ruleId).lean().exec(),
    );

    if (rule) await this.setCache(cacheKey, rule);
    return rule as IRules | null;
  }

  async RulesExists(idValue: string, resource: string): Promise<IRules | null> {
    const cacheKey = this.getExistsCacheKey(idValue, resource);
    const cached = await this.getCache<IRules>(cacheKey);
    if (cached) {
      logger.debug("Rules exists cache hit", { cacheKey });
      return cached;
    }

    const rule = await measureDatabaseQuery("rules_exists", () =>
      RulesModel.findOne({ id_value: idValue, resource }).lean().exec(),
    );

    if (rule) await this.setCache(cacheKey, rule);
    return rule as IRules | null;
  }

  async createRules(
    data: Partial<IRules>,
    session?: mongoose.ClientSession,
  ): Promise<IRules> {
    try {
      const [rule] = await RulesModel.create([data], { session });
      logger.info("Rule created", { ruleId: rule._id });

      await Promise.all([
        this.invalidateSearchCaches(),
        this.setCache(this.getSingleCacheKey(rule._id.toString()), rule),
      ]);

      return rule;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to create rule", { error: msg, data });
      throw error instanceof Error ? error : new Error("Failed to create rule");
    }
  }

  async updateRules(data: Partial<IRules>, ruleId: string): Promise<IRules | null> {
    const rule = await RulesModel.findByIdAndUpdate(
      ruleId,
      { $set: data },
      { new: true, runValidators: true },
    ).exec();

    if (rule) {
      const existsKey = this.getExistsCacheKey(
        rule.id_value,
        rule.resource,
      );
      await Promise.all([
        this.deleteCache(this.getSingleCacheKey(ruleId), existsKey),
        this.invalidateSearchCaches(),
      ]);
      logger.info("Rule updated and cache invalidated", { ruleId });
    }

    return rule;
  }

  async deleteRules(ruleId: string): Promise<void> {
    // Fetch first to get id_value + resource for cache key construction
    const rule = await this.getSingleRules(ruleId);
    await RulesModel.findByIdAndDelete(ruleId).exec();

    if (rule) {
      const existsKey = this.getExistsCacheKey(rule.id_value, rule.resource);
      await Promise.all([
        this.deleteCache(this.getSingleCacheKey(ruleId), existsKey),
        this.invalidateSearchCaches(),
      ]);
    }

    logger.info("Rule deleted and cache invalidated", { ruleId });
  }
}