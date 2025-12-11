import redisClient from "../config/redis";
import Cart, { ICart } from "../models/Cart";
import { ICartRepository } from "./ICartRepository";
import logger from "../utils/logger";
import mongoose, { FilterQuery, Types } from "mongoose";
import { measureDatabaseQuery } from "../utils/metrics";

export class CartRepository implements ICartRepository {
  private readonly CACHE_TTL = 300;
  private readonly CACHE_PREFIX = "Cart:";

  private getCacheKey(userId: string, storeId: string): string {
    return `${this.CACHE_PREFIX}:${userId}:${storeId}`;
  }

  private getSearchCacheKey(query: any, skip: number, limit: number): string {
    return `${this.CACHE_PREFIX}:search:${JSON.stringify({
      query,
      skip,
      limit,
    })}`;
  }

  private async invalidateSearchCaches(): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}:search:*`;
      const keys = await redisClient.keys(pattern);

      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.info("Invalidated Cart search caches", {
          count: keys.length,
        });
      }
    } catch (error) {
      logger.error("Failed to invalidate search caches", { error });
    }
  }

  /**
   * @description Add Cart to cache method
   * @param userId
   * @param data
   */
  private async addToCache(
    userId: string,
    storeId: string,
    data: any
  ): Promise<void> {
    let key = this.getCacheKey(userId, storeId);
    try {
      await redisClient.set(key, JSON.stringify(data), "EX", this.CACHE_TTL);
      logger.info("Added Cart to cache", { key: key });
    } catch (error) {
      logger.warn("Cache write failed", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "Unknown error",
        key,
      });
    }
  }


  
  async getStoreCart(
    query: FilterQuery<ICart>,
    skip: number,
    limit: number
  ): Promise<ICart[] | null> {
    const cacheKey = this.getSearchCacheKey(query, skip, limit);

    try {
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug("Cart search cache hit", { cacheKey });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn("Cache read failed, proceeding with database query", {
        error,
      });
    }

    const cart = await measureDatabaseQuery("fetch_all_Cart", () =>
      Cart.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec()
    );

    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(cart),
        "EX",
        this.CACHE_TTL
      );
    } catch (error) {
      logger.warn("Cache write failed", { error, cacheKey });
    }

    logger.info("User cart content found:", {
      cart,
    })

    return cart;
  }
  /**
   * @description Get single Cart method
   * @param CartId
   * @returns
   */
  async getSingleCart(CartId: string): Promise<ICart | null> {
    // const cacheKey = this.getCacheKey(CartId);

    // try {
    //   const cached = await redisClient.get(cacheKey);

    //   if (cached) {
    //     logger.debug("Cart cache hit", { cacheKey });
    //     return JSON.parse(cached);
    //   }
    // } catch (error) {
    //   logger.warn("Cache read failed, proceeding with database query", {
    //     error,
    //   });
    // }

    const cart = await measureDatabaseQuery("fetch_single_Cart", () =>
      Cart.findById(CartId).lean().exec()
    );

    // if (cart) {
    //   try {
    //     await redisClient.set(
    //       cacheKey,
    //       JSON.stringify(cart),
    //       "EX",
    //       this.CACHE_TTL
    //     );
    //   } catch (error) {
    //     logger.warn("Cache write failed", { error, cacheKey });
    //   }
    // }

    return cart;
  }

  async cartExists(storeId: string, userId: string): Promise<ICart | null> {
    const cacheKey = this.getCacheKey(userId, storeId);

    try {
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug("Cart cache hit", { cacheKey });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn("Cache read failed, proceeding with database query", {
        error,
      });
    }

    const cart = await measureDatabaseQuery("fetch_single_Cart", () =>
      Cart.findOne({
        storeId: new Types.ObjectId(storeId),
        userId: new Types.ObjectId(userId),
      })
        .lean()
        .exec()
    );

    if (cart) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(cart),
          "EX",
          this.CACHE_TTL
        );
      } catch (error) {
        logger.warn("Cache write failed", { error, cacheKey });
      }
    }

    return cart;
  }

  /**
   * @description Update Cart method
   * @param data
   * @param CartId
   * @returns
   */
  async updateCart(
    data: Partial<ICart>,
    CartId: string
  ): Promise<ICart | null> {
    const cart = await Cart.findByIdAndUpdate(
      CartId,
      { $set: data },
      { new: true, runValidators: true }
    ).exec();

    if (cart) {
      const cacheKey = this.getCacheKey(cart.userId?.toString(), cart.storeId?.toString());

      try {
        await Promise.all([
          redisClient.del(cacheKey),
          this.invalidateSearchCaches(),
        ]);

        logger.info("cart cache invalidated", { CartId });
      } catch (error) {
        logger.error("Cache invalidation failed", { error, CartId });
      }
    }

    return cart;
  }
  /**
   * @description Delete Cart method
   * @param data
   */
  async deleteCart(data: string): Promise<void> {
    const cart = await this.getSingleCart(data);
    await Cart.findByIdAndDelete(data).exec();

    const cacheKey = this.getCacheKey(cart?.userId?.toString()!, cart?.storeId?.toString()!);

    try {
      await Promise.all([
        redisClient.del(cacheKey),
        this.invalidateSearchCaches(),
      ]);

      logger.info("Cart deleted and cache invalidated", {
        CartId: data,
      });
    } catch (error) {
      logger.error("Cache invalidation failed after deletion", {
        error,
        CartId: data,
      });
    }
  }
  /**
   * @description Create Cart method
   * @param data
   * @param session
   * @returns
   */
  async createCart(
    data: Partial<ICart>,
    session?: mongoose.ClientSession
  ): Promise<ICart> {
    try {
      const [cart] = await Cart.create([data], { session });

      logger.info("cart created successfully", {
        storeId: cart._id,
      });
      await this.invalidateSearchCaches();
      await this.addToCache(
        cart.userId.toString(),
        cart.storeId.toString(),
        cart
      );
      return cart;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      logger.error("Failed to create Cart", {
        error: errorMessage,
        data: { name: data.userId },
      });

      throw error instanceof Error ? error : new Error("Failed to create Cart");
    }
  }
}
