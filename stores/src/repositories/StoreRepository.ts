import Store, { IStore } from "../models/Store";
import { IStoreRepository } from "./IStoreRepository";
import logger from "../utils/logger";
import mongoose, { FilterQuery } from "mongoose";
import redisClient from "../config/redis";
import { measureDatabaseQuery } from "../utils/metrics";
export class StoreRepository implements IStoreRepository {
  private getCacheKey(id: string): string {
    let cacheKey = `store:${id}`;
    logger.info("Store Cache key:", {
      cacheKey,
    });
    return cacheKey;
  }
  private getSearchCacheKey(query: any, skip: number, limit: number): string {
    let queryKey = `store:search:${JSON.stringify({ query, skip, limit })}`;
    logger.info("Store queryKey:", {
      queryKey,
    });
    return queryKey;
  }
  async createStore(
    data: Partial<IStore>,
    session: mongoose.ClientSession
  ): Promise<IStore> {
    try {
      const [store] = await Store.create(
        [
          {
            ...data,
          },
        ],
        { session }
      );
      logger.info("store Created succesfully:", {
        storeId: store?._id,
      });
      return store;
    } catch (error) {
      logger.error("Error has occurred during the creating store:", {
        message:
          error instanceof Error
            ? error?.message
            : "An unknown error has occurred during creating the store",
      });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(
        "An unknown error has occurred during creating the store"
      );
    }
  }
  async findAllStore(
    query: FilterQuery<IStore>,
    skip: number,
    limit: number
  ): Promise<IStore[]> {
    const cacheKey = this.getSearchCacheKey(query, skip, limit);
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.info("Store Cache hit succesfully:", {
        cacheKey,
      });
      return JSON.parse(cached);
    }

    const store = await measureDatabaseQuery("fetch_all_Stores", () =>
      Store.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean()
    );

    await redisClient.set(cacheKey, JSON.stringify(store), "EX", 3600);
    return store;
  }
  async findStoreById(id: string): Promise<IStore | null> {
    const cacheKey = this.getCacheKey(id);
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.info("store Cache hit succesfully:", {
        cacheKey,
      });
      return JSON.parse(cached);
    }

    const store = await measureDatabaseQuery("fetch_single_store", () =>
      Store.findById(id)
    );

    if (store) {
      await redisClient.set(cacheKey, JSON.stringify(store), "EX", 3600);
      logger.info("Tenant Cache succesfully invalidated:", {
        cacheKey,
      });
    }
    return store;
  }
  async updateStore(id: string, data: Partial<IStore>): Promise<IStore | null> {
    const store = await Store.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (store) {
      const cacheKey = this.getCacheKey(id);
      await redisClient.del(cacheKey);
      logger.info("Store Cache succesfully invalidated:", {
        cacheKey,
      });
    }
    return store;
  }
  async deleteStoreById(id: string): Promise<void> {
    await Store.findByIdAndDelete(id);
    const cacheKey = this.getCacheKey(id);
    await redisClient.del(cacheKey);
    logger.info("Store Cache succesfully invalidated:", {
      cacheKey,
    });
  }
}
