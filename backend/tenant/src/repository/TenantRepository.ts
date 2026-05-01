import { ITenantRepository } from "./ITenantRepository";
import Tenant, { ITenant } from "../models/Tenant";
import { FilterQuery, Types } from "mongoose";
import redisClient from "../config/redis";
import { measureDatabaseQuery } from "../utils/metrics";
import logger from "../utils/logger";

export class TenantRepository implements ITenantRepository {
  private getCacheKey(id: string): string {
    let cacheKey = `tenant:${id}`;
    logger.info("Tenant Cache key:", {
      cacheKey,
    });
    return cacheKey;
  }

  private getSearchCacheKey(query: any, skip: number, limit: number): string {
    let queryKey = `tenant:search:${JSON.stringify({ query, skip, limit })}`;
    logger.info("Tenant queryKey:", {
      queryKey,
    });
    return queryKey;
  }

  async create(
    data: Partial<ITenant> & { ownerId: Types.ObjectId }
  ): Promise<ITenant> {
    const tenant = await measureDatabaseQuery("create_Tenant", () =>
      Tenant.create(data)
    );
    logger.info("Tenant Created succesfully:", {
      tenantId: tenant?._id,
    });
    return tenant;
  }

  async findAll(
    query: FilterQuery<ITenant>,
    skip: number,
    limit: number
  ): Promise<ITenant[]> {
    const cacheKey = this.getSearchCacheKey(query, skip, limit);
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.info("Tenant Cache hit succesfully:", {
        cacheKey,
      });
      return JSON.parse(cached);
    }

    const tenants = await measureDatabaseQuery("fetch_all_Tenants", () =>
      Tenant.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean()
    );

    await redisClient.set(cacheKey, JSON.stringify(tenants), "EX", 3600);
    return tenants;
  }

  async findById(id: string): Promise<ITenant | null> {
    const cacheKey = this.getCacheKey(id);
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.info("Tenant Cache hit succesfully:", {
        cacheKey,
      });
      return JSON.parse(cached);
    }

    const tenant = await measureDatabaseQuery("fetch_single_Tenant", () =>
      Tenant.findById(id)
    );

    if (tenant) {
      await redisClient.set(cacheKey, JSON.stringify(tenant), "EX", 3600);
      logger.info("Tenant Cache succesfully invalidated:", {
        cacheKey,
      });
    }
    return tenant;
  }

  async update(id: string, data: Partial<ITenant>): Promise<ITenant | null> {
    const tenant = await Tenant.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (tenant) {
      const cacheKey = this.getCacheKey(id);
      await redisClient.del(cacheKey);
      logger.info("Tenant Cache succesfully invalidated:", {
        cacheKey,
      });
    }
    return tenant;
  }

  async delete(id: string): Promise<void> {
    await Tenant.findByIdAndDelete(id);
    const cacheKey = this.getCacheKey(id);
    await redisClient.del(cacheKey);
    logger.info("Tenant Cache succesfully invalidated:", {
      cacheKey,
    });
  }
}

