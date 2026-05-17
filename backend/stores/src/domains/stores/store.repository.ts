import mongoose, { FilterQuery } from "mongoose";
import Store, { IStore } from "./store.model";
import redisClient from "../../config/redis";
import logger from "../../utils/logger";
import { SERVICE_NAME } from "../../constants";

const CACHE_TTL    = 3600;
const CACHE_PREFIX = "store";

function getCacheKey(id: string): string {
  return `${CACHE_PREFIX}:id:${id}`;
}

function getSubdomainCacheKey(subdomain: string): string {
  return `${CACHE_PREFIX}:subdomain:${subdomain}`;
}

function getCustomDomainCacheKey(domain: string): string {
  return `${CACHE_PREFIX}:domain:${domain}`;
}

function getSearchCacheKey(
  query: FilterQuery<IStore>,
  skip:  number,
  limit: number
): string {
  return `${CACHE_PREFIX}:search:${JSON.stringify({ query, skip, limit })}`;
}

async function invalidateSearchCaches(): Promise<void> {
  try {
    const keys = await redisClient.keys(`${CACHE_PREFIX}:search:*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.debug("store_search_caches_invalidated", {
        event:   "store_search_caches_invalidated",
        service: SERVICE_NAME,
        count:   keys.length,
      });
    }
  } catch (err) {
    logger.warn("store_search_cache_invalidation_failed", {
      event:   "store_search_cache_invalidation_failed",
      service: SERVICE_NAME,
      error:   err instanceof Error ? err.message : String(err),
    });
  }
}

export const storeRepository = {
  async create(
    data:     Partial<IStore>,
    session?: mongoose.ClientSession
  ): Promise<IStore> {
    const [store] = await Store.create([data], { session });

    logger.info("store_document_created", {
      event:     "store_document_created",
      service:   SERVICE_NAME,
      storeId:   store._id.toString(),
      subdomain: store.subdomain,
      ownerId:   store.ownerId.toString(),
    });

    await invalidateSearchCaches();
    return store;
  },

  async findAll(
    query: FilterQuery<IStore>,
    skip:  number,
    limit: number
  ): Promise<IStore[]> {
    const cacheKey = getSearchCacheKey(query, skip, limit);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("store_list_cache_hit", {
          event:   "store_list_cache_hit",
          service: SERVICE_NAME,
          cacheKey,
        });
        return JSON.parse(cached) as IStore[];
      }
    } catch (err) {
      logger.warn("store_list_cache_read_failed", {
        event:   "store_list_cache_read_failed",
        service: SERVICE_NAME,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    const stores = await Store.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean<IStore[]>()
      .exec();

    try {
      await redisClient.set(cacheKey, JSON.stringify(stores), "EX", CACHE_TTL);
    } catch (err) {
      logger.warn("store_list_cache_write_failed", {
        event:   "store_list_cache_write_failed",
        service: SERVICE_NAME,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    return stores;
  },

  async count(query: FilterQuery<IStore>): Promise<number> {
    return Store.countDocuments(query).exec();
  },

  async findById(id: string): Promise<IStore | null> {
    const cacheKey = getCacheKey(id);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("store_id_cache_hit", {
          event:   "store_id_cache_hit",
          service: SERVICE_NAME,
          storeId: id,
        });
        return JSON.parse(cached) as IStore;
      }
    } catch (err) {
      logger.warn("store_id_cache_read_failed", {
        event:   "store_id_cache_read_failed",
        service: SERVICE_NAME,
        storeId: id,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    const store = await Store.findById(id).lean<IStore>().exec();

    if (store) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(store), "EX", CACHE_TTL);
      } catch (err) {
        logger.warn("store_id_cache_write_failed", {
          event:   "store_id_cache_write_failed",
          service: SERVICE_NAME,
          storeId: id,
          error:   err instanceof Error ? err.message : String(err),
        });
      }
    }

    return store;
  },

  async findBySubdomain(subdomain: string): Promise<IStore | null> {
    const cacheKey = getSubdomainCacheKey(subdomain);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("store_subdomain_cache_hit", {
          event:     "store_subdomain_cache_hit",
          service:   SERVICE_NAME,
          subdomain,
        });
        return JSON.parse(cached) as IStore;
      }
    } catch (err) {
      logger.warn("store_subdomain_cache_read_failed", {
        event:     "store_subdomain_cache_read_failed",
        service:   SERVICE_NAME,
        subdomain,
        error:     err instanceof Error ? err.message : String(err),
      });
    }

    const store = await Store.findOne({ subdomain })
      .lean<IStore>()
      .exec();

    if (store) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(store),
          "EX",
          CACHE_TTL
        );
      } catch (err) {
        logger.warn("store_subdomain_cache_write_failed", {
          event:     "store_subdomain_cache_write_failed",
          service:   SERVICE_NAME,
          subdomain,
          error:     err instanceof Error ? err.message : String(err),
        });
      }
    }

    return store;
  },

  async findByCustomDomain(domain: string): Promise<IStore | null> {
    const cacheKey = getCustomDomainCacheKey(domain);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("store_domain_cache_hit", {
          event:   "store_domain_cache_hit",
          service: SERVICE_NAME,
          domain,
        });
        return JSON.parse(cached) as IStore;
      }
    } catch (err) {
      logger.warn("store_domain_cache_read_failed", {
        event:   "store_domain_cache_read_failed",
        service: SERVICE_NAME,
        domain,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    const store = await Store.findOne({
      customDomain:       domain,
      customDomainStatus: "verified",
    })
      .lean<IStore>()
      .exec();

    if (store) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(store),
          "EX",
          CACHE_TTL
        );
      } catch (err) {
        logger.warn("store_domain_cache_write_failed", {
          event:   "store_domain_cache_write_failed",
          service: SERVICE_NAME,
          domain,
          error:   err instanceof Error ? err.message : String(err),
        });
      }
    }

    return store;
  },

  async updateById(
    id:     string,
    data:   Partial<IStore>
  ): Promise<IStore | null> {
    const store = await Store.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .lean<IStore>()
      .exec();

    if (store) {
      try {
        await Promise.all([
          redisClient.del(getCacheKey(id)),
          store.subdomain
            ? redisClient.del(getSubdomainCacheKey(store.subdomain))
            : Promise.resolve(),
          store.customDomain
            ? redisClient.del(getCustomDomainCacheKey(store.customDomain))
            : Promise.resolve(),
          invalidateSearchCaches(),
        ]);
        logger.info("store_updated_cache_invalidated", {
          event:         "store_updated_cache_invalidated",
          service:       SERVICE_NAME,
          storeId:       id,
          updatedFields: Object.keys(data),
        });
      } catch (err) {
        logger.error("store_cache_invalidation_failed_after_update", {
          event:   "store_cache_invalidation_failed_after_update",
          service: SERVICE_NAME,
          storeId: id,
          error:   err instanceof Error ? err.message : String(err),
        });
      }
    }

    return store;
  },

  async deleteById(id: string): Promise<void> {
    const store = await Store.findByIdAndDelete(id)
      .lean<IStore>()
      .exec();

    try {
      const delKeys = [
        getCacheKey(id),
        ...(store?.subdomain
          ? [getSubdomainCacheKey(store.subdomain)]
          : []),
        ...(store?.customDomain
          ? [getCustomDomainCacheKey(store.customDomain)]
          : []),
      ];

      await Promise.all([
        redisClient.del(...delKeys),
        invalidateSearchCaches(),
      ]);

      logger.info("store_deleted_cache_cleared", {
        event:   "store_deleted_cache_cleared",
        service: SERVICE_NAME,
        storeId: id,
      });
    } catch (err) {
      logger.error("store_cache_invalidation_failed_after_delete", {
        event:   "store_cache_invalidation_failed_after_delete",
        service: SERVICE_NAME,
        storeId: id,
        error:   err instanceof Error ? err.message : String(err),
      });
    }
  },

  async countByOrganizationId(organizationId: string): Promise<number> {
    return Store.countDocuments({ organizationId }).exec();
  },
};