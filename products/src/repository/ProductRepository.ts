import Product, { IProduct } from "../models/Product";
import { IProductRepository } from "./IProductRepository";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import mongoose, { FilterQuery } from "mongoose";
import { measureDatabaseQuery } from "../utils/metrics";

export class ProductRepository implements IProductRepository {
  private readonly CACHE_PREFIX = "product";
  private readonly CACHE_TTL = 60 * 60;
  private getProductCacheKeys(key: string): string {
    return `${this.CACHE_PREFIX}:${key}`;
  }
  private getProductSearchKeys(
    userId: string,
    query: Partial<IProduct>,
    skip: number,
    limit: number
  ): string {
    return `${this.CACHE_PREFIX}:${userId}:search:${JSON.stringify({
      query,
      skip,
      limit,
    })}`;
  }

  private async invalidateSearchCache(userId: string): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}:${userId}:search:*`;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info("Invalidated product search caches", {
          count: keys.length,
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Search invalidation error", {
          message: error.message,
          stack: error.stack,
        });
      }
    }
  }
  async createProduct(
    data: Partial<IProduct>,
    session: mongoose.ClientSession
  ) {
    try {
      const [result] = await Product.create(
        [
          {
            ...data,
          },
        ],
        { session }
      );
      await this.invalidateSearchCache(data.ownerId?.toString()!);
      logger.info("Product has been successfully created:", {
        id: result._id,
      });
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      logger.error("Failed to create product", {
        error: errorMessage,
        data: { name: data.name },
      });

      throw error instanceof Error
        ? error
        : new Error("Failed to create product");
    }
  }

  async findAllProduct(
    query: FilterQuery<IProduct>,
    skip: number,
    limit: number
  ): Promise<IProduct[]> {
    const cacheKey = this.getProductSearchKeys(
      query.ownerId,
      query,
      skip,
      limit
    );

    try {
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug("Product search cache hit", { cacheKey });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn("Cache read failed, proceeding with database query", {
        error,
      });
    }

    const products = await measureDatabaseQuery("fetch_all_products", () =>
      Product.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec()
    );

    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(products),
        "EX",
        this.CACHE_TTL
      );
    } catch (error) {
      logger.warn("Cache write failed", { error, cacheKey });
    }

    return products;
  }

  async countproducts(query: FilterQuery<IProduct>): Promise<number> {
    return measureDatabaseQuery("count_products", () =>
      Product.countDocuments(query).exec()
    );
  }

  async findProductById(id: string): Promise<IProduct | null> {
    const cacheKey = this.getProductCacheKeys(id);

    try {
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug("Product cache hit", { cacheKey });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn("Cache read failed, proceeding with database query", {
        error,
      });
    }

    const product = await measureDatabaseQuery("fetch_single_product", () =>
      Product.findById(id).lean().exec()
    );

    if (product) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(product),
          "EX",
          this.CACHE_TTL
        );
      } catch (error) {
        logger.warn("Cache write failed", { error, cacheKey });
      }
    }

    return product;
  }

  async updateProduct(
    id: string,
    data: Partial<IProduct>
  ): Promise<IProduct | null> {
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).exec();

    if (product) {
      const cacheKey = this.getProductCacheKeys(id);

      try {
        await Promise.all([
          redisClient.del(cacheKey),
          this.invalidateSearchCache(product.ownerId.toString()!),
        ]);

        logger.info("Product cache invalidated", { productId: id });
      } catch (error) {
        logger.error("Cache invalidation failed", { error, productId: id });
      }
    }

    return product;
  }

  async deleteproductById(id: string): Promise<void> {
    const product = await this.findProductById(id);
    if (!product) return;
    await Product.findByIdAndDelete(id).exec();

    const cacheKey = this.getProductCacheKeys(id);

    try {
      await Promise.all([
        redisClient.del(cacheKey),
        this.invalidateSearchCache(product.ownerId.toString()!),
      ]);

      logger.info("Product deleted and cache invalidated", { productId: id });
    } catch (error) {
      logger.error("Cache invalidation failed after deletion", {
        error,
        productId: id,
      });
    }
  }
}
